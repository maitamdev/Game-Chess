"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { ArrowLeft } from "@phosphor-icons/react/ArrowLeft";
import { DiceFive } from "@phosphor-icons/react/DiceFive";
import { FlagCheckered } from "@phosphor-icons/react/FlagCheckered";
import { HorseIcon } from "@phosphor-icons/react/Horse";
import { Info } from "@phosphor-icons/react/Info";
import { Sparkle } from "@phosphor-icons/react/Sparkle";
import { UsersThree } from "@phosphor-icons/react/UsersThree";
import Button from "@/components/ui/Button";
import {
  absolutePosition,
  applyNguaMove,
  HOME_LANES,
  HOME_ORDER,
  HOME_END,
  NGUA_COLORS,
  NGUA_NAMES,
  START_INDEX,
  TRACK_COORDS,
  createNguaPieces,
  getLegalMoves,
  type NguaColor,
  type NguaPiece,
} from "@/lib/ngua/rules";

type NguaPhase = "awaiting-roll" | "selecting" | "moving" | "no-move" | "finished";

interface NguaState {
  pieces: NguaPiece[];
  currentPlayer: number;
  phase: NguaPhase;
  dice: number | null;
  turn: number;
  lastEvent: string;
  winner: NguaColor | null;
}

const PLAYER_LABELS = ["Bạn", "Minh", "Linh", "Quân"];
const PLAYER_COLORS: NguaColor[] = ["red", "blue", "yellow", "green"];

function createNguaGame(): NguaState {
  return {
    pieces: createNguaPieces(),
    currentPlayer: 0,
    phase: "awaiting-roll",
    dice: null,
    turn: 1,
    lastEvent: "Bạn được đi trước. Tung xúc sắc để bắt đầu.",
    winner: null,
  };
}

function rollValue(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function nextPlayer(index: number): number {
  return (index + 1) % PLAYER_LABELS.length;
}

function resolveRoll(state: NguaState, dice: number): NguaState {
  const color = PLAYER_COLORS[state.currentPlayer];
  const moves = getLegalMoves(state.pieces, color, dice);
  return {
    ...state,
    dice,
    phase: moves.length > 0 ? "selecting" : "no-move",
    lastEvent: moves.length > 0
      ? `${PLAYER_LABELS[state.currentPlayer]} tung được ${dice}. Chọn một quân để đi.`
      : `${PLAYER_LABELS[state.currentPlayer]} tung được ${dice}, nhưng không có quân nào đi hợp lệ.`,
  };
}

function chooseBotMove(moves: NguaPiece[], pieces: NguaPiece[], dice: number): NguaPiece {
  return [...moves].sort((a, b) => {
    const aLanding = a.progress < 0 ? 0 : a.progress + dice;
    const bLanding = b.progress < 0 ? 0 : b.progress + dice;
    const aKicks = pieces.some((piece) => piece.color !== a.color && absolutePosition(piece) === absolutePosition({ ...a, progress: aLanding })) ? 1 : 0;
    const bKicks = pieces.some((piece) => piece.color !== b.color && absolutePosition(piece) === absolutePosition({ ...b, progress: bLanding })) ? 1 : 0;
    return bKicks - aKicks || bLanding - aLanding;
  })[0];
}

export default function NguaPage() {
  const [game, setGame] = useState<NguaState>(() => createNguaGame());
  const [rolling, setRolling] = useState(false);
  const [movingPiece, setMovingPiece] = useState<string | null>(null);
  const rollTimer = useRef<number | null>(null);
  const moveTimer = useRef<number | null>(null);

  const humanMoves = useMemo(
    () => game.dice ? getLegalMoves(game.pieces, PLAYER_COLORS[0], game.dice).map((piece) => piece.id) : [],
    [game.dice, game.pieces],
  );

  const resetGame = useCallback(() => {
    if (rollTimer.current) window.clearTimeout(rollTimer.current);
    if (moveTimer.current) window.clearTimeout(moveTimer.current);
    setRolling(false);
    setMovingPiece(null);
    setGame(createNguaGame());
  }, []);

  useEffect(() => () => {
    if (rollTimer.current) window.clearTimeout(rollTimer.current);
    if (moveTimer.current) window.clearTimeout(moveTimer.current);
  }, []);

  useEffect(() => {
    if (game.phase !== "no-move" || game.winner) return;
    const timer = window.setTimeout(() => {
      setGame((current) => ({
        ...current,
        currentPlayer: nextPlayer(current.currentPlayer),
        phase: "awaiting-roll",
        dice: null,
        turn: current.turn + 1,
        lastEvent: `${PLAYER_LABELS[nextPlayer(current.currentPlayer)]} đến lượt.`,
      }));
    }, 1050);
    return () => window.clearTimeout(timer);
  }, [game.phase, game.winner]);

  useEffect(() => {
    if (game.currentPlayer === 0 || game.phase !== "awaiting-roll" || game.winner) return;
    const thinkTimer = window.setTimeout(() => {
      setRolling(true);
      rollTimer.current = window.setTimeout(() => {
        setRolling(false);
        rollTimer.current = null;
        setGame((current) => resolveRoll(current, rollValue()));
      }, 1450);
    }, 800);
    return () => {
      window.clearTimeout(thinkTimer);
      if (rollTimer.current) window.clearTimeout(rollTimer.current);
    };
  }, [game.currentPlayer, game.phase, game.winner]);

  useEffect(() => {
    if (game.currentPlayer === 0 || game.phase !== "selecting" || game.dice === null || game.winner) return;
    const moves = getLegalMoves(game.pieces, PLAYER_COLORS[game.currentPlayer], game.dice);
    const selected = chooseBotMove(moves, game.pieces, game.dice);
    const timer = window.setTimeout(() => startMove(selected.id), 700);
    return () => window.clearTimeout(timer);
  }, [game.currentPlayer, game.phase, game.dice, game.pieces, game.winner]);

  const finishMove = useCallback((pieceId: string) => {
    setGame((current) => {
      if (current.dice === null) return current;
      const result = applyNguaMove(current.pieces, pieceId, current.dice);
      if (!result) return current;
      if (result.winner) {
        return {
          ...current,
          pieces: result.pieces,
          phase: "finished",
          winner: result.winner,
          lastEvent: `${NGUA_NAMES[result.winner]} đã đưa đủ 4 quân về chuồng.`,
        };
      }
      const next = result.extraTurn ? current.currentPlayer : nextPlayer(current.currentPlayer);
      return {
        ...current,
        pieces: result.pieces,
        currentPlayer: next,
        phase: "awaiting-roll",
        dice: current.dice,
        turn: current.turn + (result.extraTurn ? 0 : 1),
        lastEvent: result.kicked.length > 0
          ? `${PLAYER_LABELS[current.currentPlayer]} đá một quân đối thủ về chuồng và được tung tiếp.`
          : result.extraTurn
            ? `${PLAYER_LABELS[current.currentPlayer]} tung được 6 và được thêm lượt.`
            : `${PLAYER_LABELS[next]} đến lượt.`,
      };
    });
  }, []);

  const startMove = useCallback((pieceId: string) => {
    setGame((current) => {
      if (current.phase !== "selecting" || current.dice === null || !getLegalMoves(current.pieces, PLAYER_COLORS[current.currentPlayer], current.dice).some((piece) => piece.id === pieceId)) return current;
      return { ...current, phase: "moving", lastEvent: `${PLAYER_LABELS[current.currentPlayer]} đang di chuyển quân...` };
    });
    setMovingPiece(pieceId);
    if (moveTimer.current) window.clearTimeout(moveTimer.current);
    moveTimer.current = window.setTimeout(() => {
      setMovingPiece(null);
      moveTimer.current = null;
      finishMove(pieceId);
    }, 850);
  }, [finishMove]);

  const rollHuman = () => {
    if (rolling || game.currentPlayer !== 0 || game.phase !== "awaiting-roll" || game.winner) return;
    setRolling(true);
    rollTimer.current = window.setTimeout(() => {
      setRolling(false);
      rollTimer.current = null;
      setGame((current) => resolveRoll(current, rollValue()));
    }, 1450);
  };

  const currentColor = PLAYER_COLORS[game.currentPlayer];

  return (
    <div className="ngua-page min-h-[100dvh] pb-16">
      <section className="ngua-hero relative overflow-hidden border-b border-white/10">
        <Image src="/images/ngua/ngua-hero.png" alt="Bàn cờ cá ngựa bốn màu trên bàn gỗ" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#101014_0%,rgba(16,16,20,.92)_29%,rgba(16,16,20,.42)_70%,rgba(16,16,20,.15)_100%)]" />
        <div className="relative mx-auto flex min-h-[310px] max-w-[1440px] items-end px-5 pb-8 pt-20 sm:px-8 lg:min-h-[360px] lg:px-14">
          <div>
            <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm text-[#efb64f] transition hover:text-white"><ArrowLeft size={16} aria-hidden /> Kỳ Đài</Link>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f17b67]">Bàn tứ sắc</p>
            <h1 className="mt-2 max-w-xl font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-[-0.055em] text-[#fff8ed] sm:text-6xl">Cờ Cá Ngựa</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[#d6d0c8]">Lắc chậm như thật. Chọn đường chạy, đá đối thủ và đưa cả bốn chú ngựa về chuồng.</p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-8 lg:px-14 lg:pt-9">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-[#b8b5ae]"><span className="grid h-9 w-9 place-items-center rounded-[10px] border border-[#efb64f]/40 bg-[#efb64f]/10 text-[#efb64f]"><HorseIcon size={19} weight="duotone" aria-hidden /></span><span>Ván {game.turn}</span><span className="text-[#706d67]">/</span><span>4 người</span></div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link href="/ngua/rooms" className="inline-flex min-h-9 items-center rounded-[8px] border border-[#efb64f]/45 px-3 text-sm font-semibold text-[#f2d38c] transition hover:bg-[#efb64f]/10">Tạo phòng online</Link>
            <Button size="sm" variant="ghost" onClick={resetGame}><ArrowClockwise size={17} aria-hidden /> Ván mới</Button>
          </div>
        </div>

        <section className="ngua-stage grid gap-5 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-7 lg:p-7">
          <div className="min-w-0">
            <PlayersStrip game={game} />
            <NguaBoard game={game} movingPiece={movingPiece} validMoves={humanMoves} onPieceClick={startMove} />
            <div className="ngua-controls mt-5 flex flex-col items-center gap-4 rounded-[14px] border border-white/10 bg-[#151619]/80 p-4 sm:flex-row sm:justify-between sm:p-5">
              <div className="flex items-center gap-4"><DiceFace value={game.dice ?? 5} rolling={rolling} /><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#efb64f]">{rolling ? "Đang lắc xúc sắc" : "Kết quả"}</p><p className="mt-1 text-sm text-[#d6d0c8]">{rolling ? "Giữ nhịp một chút..." : game.dice ? `Bạn tung được ${game.dice}` : "Sẵn sàng cho lượt mới"}</p></div></div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><Button variant="primary" onClick={rollHuman} disabled={rolling || game.currentPlayer !== 0 || game.phase !== "awaiting-roll" || Boolean(game.winner)}><DiceFive size={18} aria-hidden /> Tung xúc sắc</Button>{game.currentPlayer === 0 && game.phase === "selecting" && <span className="ngua-pick-note">Chạm vào quân sáng để đi</span>}</div>
            </div>
            <p className="mt-3 min-h-6 text-center text-sm font-medium text-[#e7d8b9]">{game.lastEvent}</p>
          </div>

          <aside className="ngua-side-panel">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-[10px] border border-[#efb64f]/35 bg-[#efb64f]/10 text-[#efb64f]"><Info size={20} weight="duotone" aria-hidden /></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#efb64f]">Luật bàn</p><h2 className="text-xl font-extrabold text-[#fff8ed]">Chơi như ngoài đời</h2></div></div>
            <div className="mt-5 space-y-3"><RuleLine title="Ra quân" text="Tung 1 hoặc 6 để đưa ngựa ra ô xuất phát." /><RuleLine title="Được thêm lượt" text="Tung 6 hoặc đá trúng ngựa đối thủ sẽ được tung tiếp." /><RuleLine title="Bị cản" text="Không được nhảy qua cụm quân chặn đường." /><RuleLine title="Về chuồng" text="Đi đúng số để lần lượt vào ô 6, 5, 4, 3." /></div>
            <div className="mt-6 rounded-[11px] border border-[#efb64f]/25 bg-[#efb64f]/[.06] p-4"><div className="flex items-center gap-2 text-sm font-bold text-[#f2d38c]"><FlagCheckered size={17} aria-hidden /> Mục tiêu</div><p className="mt-2 text-sm leading-6 text-[#bcb8ae]">Đưa cả bốn quân của màu {NGUA_NAMES[currentColor].toLowerCase()} về đủ bốn ô chuồng trước các đối thủ.</p></div>
            <div className="mt-6 flex items-start gap-3 border-t border-white/10 pt-5 text-xs leading-5 text-[#8f8d87]"><Sparkle size={16} className="mt-0.5 shrink-0 text-[#efb64f]" aria-hidden /><p>Xúc sắc có nhịp lắc 1.45 giây và quân đi chuyển động 0.85 giây để giữ cảm giác của một lượt chơi thật.</p></div>
          </aside>
        </section>

        {game.winner && <section className="ngua-result mt-5 flex flex-col items-start justify-between gap-4 rounded-[14px] border border-[#efb64f]/45 bg-[#efb64f]/10 p-5 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#efb64f]">Ván đã khép lại</p><h2 className="mt-1 text-2xl font-extrabold text-[#fff8ed]">{NGUA_NAMES[game.winner]} thắng ván</h2><p className="mt-1 text-sm text-[#c7c0b3]">Bốn quân đã về đủ chuồng.</p></div><Button variant="primary" onClick={resetGame}><ArrowClockwise size={17} aria-hidden /> Chơi lại</Button></section>}

        <section className="mt-10 grid gap-5 border-t border-white/10 pt-8 md:grid-cols-[1fr_1.3fr]"><div><h2 className="text-2xl font-extrabold tracking-[-0.035em] text-[#fff8ed]">Một vòng đua có chủ ý</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#aaa9a3]">Cờ Cá Ngựa không chỉ là chờ số lớn. Giữ quân, chọn lúc ra chuồng và canh đúng khoảng cách để không bị đá ngược về nhà.</p></div><div className="grid gap-3 sm:grid-cols-3"><Feature title="52 ô đường chạy" text="Một vòng quanh bàn, mỗi màu có ô xuất phát riêng." /><Feature title="4 ô về đích" text="Vào đúng nhịp 6, 5, 4, 3 để hoàn tất." /><Feature title="Đá về chuồng" text="Chạm đúng ô đối thủ để giành thêm lượt." /></div></section>
      </main>
    </div>
  );
}

function PlayersStrip({ game }: { game: NguaState }) {
  return <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{PLAYER_LABELS.map((name, index) => { const color = PLAYER_COLORS[index]; const count = game.pieces.filter((piece) => piece.color === color && piece.progress === HOME_END).length; return <div key={name} className={`ngua-player ${color} ${game.currentPlayer === index ? "ngua-player-active" : ""}`}><span className="ngua-player-icon"><Image src="/images/ngua/horse-piece.png" alt="" width={64} height={64} className={`ngua-player-art ${color}`} /></span><span className="min-w-0"><strong className="block truncate">{name}</strong><small>{count}/4 về chuồng</small></span></div>; })}</div>;
}

function NguaBoard({ game, movingPiece, validMoves, onPieceClick }: { game: NguaState; movingPiece: string | null; validMoves: string[]; onPieceClick: (id: string) => void }) {
  const yardPieces = new Set(game.pieces.filter((piece) => piece.progress === -1).map((piece) => piece.id));
  return <div className="ngua-board-wrap"><div className="ngua-board-grid">
    <HomeZone color="red" pieces={game.pieces} yardPieces={yardPieces} validMoves={validMoves} onPieceClick={onPieceClick} />
    <HomeZone color="blue" pieces={game.pieces} yardPieces={yardPieces} validMoves={validMoves} onPieceClick={onPieceClick} />
    <HomeZone color="yellow" pieces={game.pieces} yardPieces={yardPieces} validMoves={validMoves} onPieceClick={onPieceClick} />
    <HomeZone color="green" pieces={game.pieces} yardPieces={yardPieces} validMoves={validMoves} onPieceClick={onPieceClick} />
    {TRACK_COORDS.map(([row, col], index) => <div key={`track-${index}`} className={`ngua-track-cell ${Object.values(START_INDEX).includes(index) ? "ngua-track-start" : ""}`} style={{ gridRow: row + 1, gridColumn: col + 1 }}><span>{index + 1}</span></div>)}
    {NGUA_COLORS.flatMap((color) => HOME_LANES[color].map(([row, col], index) => <div key={`${color}-home-${index}`} className={`ngua-home-lane ${color}`} style={{ gridRow: row + 1, gridColumn: col + 1 }}><span>{HOME_ORDER[index]}</span></div>))}
    <div className="ngua-center-finish"><FlagCheckered size={24} aria-hidden /><span>VỀ CHUỒNG</span></div>
    {game.pieces.filter((piece) => piece.progress >= 0).map((piece) => <ActivePiece key={piece.id} piece={piece} moving={movingPiece === piece.id} valid={validMoves.includes(piece.id)} onClick={onPieceClick} />)}
  </div></div>;
}

function HomeZone({ color, pieces, yardPieces, validMoves, onPieceClick }: { color: NguaColor; pieces: NguaPiece[]; yardPieces: Set<string>; validMoves: string[]; onPieceClick: (id: string) => void }) {
  const zoneClass = `ngua-home-zone ${color}`;
  return <div className={zoneClass}><div className="ngua-home-inner"><div className="ngua-home-horse"><HorseIcon size={35} weight="duotone" aria-hidden /></div><div className="ngua-yard-grid">{pieces.filter((piece) => piece.color === color && yardPieces.has(piece.id)).map((piece) => <HorsePiece key={piece.id} piece={piece} valid={validMoves.includes(piece.id)} onClick={onPieceClick} />)}</div></div></div>;
}

function ActivePiece({ piece, moving, valid, onClick }: { piece: NguaPiece; moving: boolean; valid: boolean; onClick: (id: string) => void }) {
  const coord = piece.progress <= 51 ? TRACK_COORDS[(START_INDEX[piece.color] + piece.progress) % TRACK_COORDS.length] : HOME_LANES[piece.color][piece.progress - 52];
  if (!coord) return null;
  return <div className={`ngua-active-piece ${moving ? "ngua-piece-moving" : ""}`} style={{ gridRow: coord[0] + 1, gridColumn: coord[1] + 1 }}><HorsePiece piece={piece} valid={valid} onClick={onClick} homeRank={piece.progress >= 52 ? HOME_ORDER[piece.progress - 52] : undefined} /></div>;
}

function HorsePiece({ piece, valid, onClick, homeRank }: { piece: NguaPiece; valid: boolean; onClick: (id: string) => void; homeRank?: number }) {
  return <button type="button" className={`ngua-horse-piece ${piece.color} ${valid ? "ngua-horse-valid" : ""}`} onClick={() => valid && onClick(piece.id)} aria-label={`${NGUA_NAMES[piece.color]} quân ${piece.slot + 1}${homeRank ? `, ô ${homeRank}` : ""}`}>
    <Image src="/images/ngua/horse-piece.png" alt="" width={160} height={160} className={`ngua-horse-art ${piece.color}`} draggable={false} />
    {homeRank && <span>{homeRank}</span>}
  </button>;
}

const DICE_PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DiceFace({ value, rolling }: { value: number; rolling: boolean }) {
  const pips = DICE_PIPS[value] ?? DICE_PIPS[5];
  return <div className="ngua-dice-scene" aria-label={rolling ? "Đang lắc xúc sắc" : `Xúc sắc ${value}`}>
    <div className={`ngua-dice-shadow ${rolling ? "ngua-dice-shadow-rolling" : ""}`} aria-hidden="true" />
    <div className="ngua-dice-tray" aria-hidden="true" />
    <div className={`ngua-dice-art ${rolling ? "ngua-dice-art-rolling" : ""}`}>
      <Image src="/images/ngua/dice-body.png" alt="" fill sizes="120px" priority className="object-contain" draggable={false} />
      <div className="ngua-dice-art-pips" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => <span key={index} className={pips.includes(index) ? "ngua-pip" : ""} />)}
      </div>
    </div>
  </div>;
}

function RuleLine({ title, text }: { title: string; text: string }) { return <div className="ngua-rule-line"><strong>{title}</strong><p>{text}</p></div>; }
function Feature({ title, text }: { title: string; text: string }) { return <article className="ngua-feature"><h3>{title}</h3><p>{text}</p></article>; }
