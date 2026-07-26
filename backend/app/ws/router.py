"""Endpoint WebSocket: ws://host/ws?token=<access_token> (mục 9)."""

from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.config import settings
from app.core.security import decode_token
from app.db import SessionLocal
from app.models import Game, Move, RatingHistory, User
from app.ws.game_session import parse_time_control, sessions
from app.ws.manager import Connection, manager
from app.ws.matchmaking import matchmaker

router = APIRouter()


async def _final_state_from_db(
    game_id: uuid.UUID, user_id: uuid.UUID
) -> list[dict[str, Any]] | None:
    """Ván không còn phiên trong bộ nhớ (đã kết thúc / server khởi động
    lại): dựng game_state + game_over từ CSDL để client sync được.
    elo_change/new_elo được cá nhân hoá theo người nhận."""
    async with SessionLocal() as db:
        game = await db.get(Game, game_id)
        if game is None:
            return None
        moves = (
            await db.execute(
                select(Move).where(Move.game_id == game_id).order_by(Move.ply.asc())
            )
        ).scalars().all()
        rating_after = await db.scalar(
            select(RatingHistory.elo).where(
                RatingHistory.game_id == game_id, RatingHistory.user_id == user_id
            )
        )
    initial_ms, _ = parse_time_control(game.time_control)
    start_fens = {
        "chess": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "xiangqi": "rheakaehr/9/1c5c1/s1s1s1s1s/9/9/S1S1S1S1S/1C5C1/9/RHEAKAEHR r 0 0",
        "caro": "0 x",
        "jungle": "t5l/1c3d1/e1w1p1r/7/7/7/R1P1W1E/1D3C1/L5T r 0",
    }
    start_fen = start_fens.get(game.variant, "")
    last = moves[-1] if moves else None
    state = {
        "type": "game_state",
        "game_id": str(game_id),
        "variant": game.variant,
        "fen": game.final_fen or (last.fen_after if last else start_fen),
        "ply": len(moves),
        "turn": "white" if len(moves) % 2 == 0 else "black",
        # bên chưa đi nước nào giữ nguyên thời gian ban đầu
        "white_time_ms": next(
            (m.time_left_ms for m in reversed(moves) if m.ply % 2 == 1), initial_ms
        ),
        "black_time_ms": next(
            (m.time_left_ms for m in reversed(moves) if m.ply % 2 == 0), initial_ms
        ),
        "moves": [m.san for m in moves],
        "server_time": int(time.time() * 1000),
    }
    messages: list[dict[str, Any]] = [state]
    if game.result is not None:
        elo_before = (
            game.white_elo_before if user_id == game.white_id
            else game.black_elo_before if user_id == game.black_id
            else None
        )
        new_elo = rating_after if rating_after is not None else (elo_before or 0)
        elo_change = (
            new_elo - elo_before if elo_before is not None and rating_after is not None
            else 0
        )
        messages.append(
            {
                "type": "game_over",
                "game_id": str(game_id),
                "result": game.result,
                "termination": game.termination,
                "elo_change": elo_change,
                "new_elo": new_elo,
                # phát lại từ CSDL khi mở lại ván cũ — client không được
                # dùng để cập nhật Elo hiện tại
                "replay": True,
            }
        )
    return messages


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    token = ws.query_params.get("token", "")
    user_id = decode_token(token, "access")
    if user_id is None:
        await ws.accept()
        await ws.close(code=4401, reason="Token không hợp lệ")
        return
    async with SessionLocal() as db:
        user = await db.get(User, user_id)
    if user is None:
        await ws.accept()
        await ws.close(code=4401, reason="Tài khoản không tồn tại")
        return

    await ws.accept()
    conn = Connection(ws=ws, user_id=user.id, username=user.username)
    manager.register(conn)

    try:
        while True:
            data = await ws.receive_json()
            if not isinstance(data, dict):
                continue
            msg_type = data.get("type")

            if msg_type == "ping":
                manager.touch_ping(conn)
                await conn.send({"type": "pong"})

            elif msg_type == "join_queue":
                await matchmaker.join(
                    conn,
                    str(data.get("time_control", "")),
                    str(data.get("variant", "chess")),
                )

            elif msg_type == "leave_queue":
                matchmaker.remove_conn(conn)

            elif msg_type in ("move", "resign", "offer_draw", "respond_draw", "sync"):
                try:
                    game_id = uuid.UUID(str(data.get("game_id", "")))
                except ValueError:
                    continue
                session = sessions.get(game_id)

                if msg_type == "sync":
                    if session is not None:
                        await session.attach(conn)
                        await conn.send(session.state_message())
                    else:
                        for message in (
                            await _final_state_from_db(game_id, conn.user_id) or []
                        ):
                            await conn.send(message)
                elif session is None:
                    await conn.send(
                        {
                            "type": "illegal_move",
                            "game_id": str(game_id),
                            "reason": "game_over",
                        }
                    )
                elif msg_type == "move":
                    raw_ply = data.get("ply")
                    ply = raw_ply if isinstance(raw_ply, int) else -1
                    await session.handle_move(conn, str(data.get("uci", "")), ply)
                elif msg_type == "resign":
                    await session.handle_resign(conn)
                elif msg_type == "offer_draw":
                    await session.handle_draw_offer(conn)
                elif msg_type == "respond_draw":
                    await session.handle_draw_response(conn, bool(data.get("accept")))

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        manager.unregister(conn)
        matchmaker.remove_conn(conn)
        for session in list(sessions.values()):
            await session.detach(conn)


async def ping_reaper() -> None:
    """Không nhận được ping trong 45 giây → coi là mất kết nối (mục 9)."""
    while True:
        await asyncio.sleep(10)
        for conn in manager.stale_connections(settings.ping_timeout_seconds):
            try:
                await conn.ws.close(code=4408, reason="Mất ping")
            except Exception:
                pass
