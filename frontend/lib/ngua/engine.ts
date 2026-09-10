import {
  applyNguaMove,
  createNguaPieces,
  getLegalMoves,
  NGUA_COLORS,
  NGUA_NAMES,
  type NguaColor,
  type NguaMoveResult,
  type NguaPiece,
} from "./rules";

export interface NguaState {
  gameType: "ngua";
  pieces: NguaPiece[];
  currentSeat: number;
  dice: number | null;
  rolled: boolean;
  winner: NguaColor | null;
  turn: number;
  message: string;
  lastMove: {
    seat: number;
    color: NguaColor;
    pieceId: string;
    dice: number;
    kicked: string[];
    extraTurn: boolean;
  } | null;
}

export type NguaAction =
  | { type: "roll" }
  | { type: "move_piece"; pieceId: string };

export interface NguaPublicView {
  pieces: NguaPiece[];
  currentSeat: number;
  currentColor: NguaColor;
  dice: number | null;
  rolled: boolean;
  legalPieceIds: string[];
  winner: NguaColor | null;
  turn: number;
  message: string;
  lastMove: NguaState["lastMove"];
}

const PLAYER_COUNT = 4;

function secureDice(): number {
  const values = new Uint32Array(1);
  const limit = 0x1_0000_0000 - (0x1_0000_0000 % 6);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return (values[0] % 6) + 1;
}

function nextSeat(seat: number): number {
  return (seat + 1) % PLAYER_COUNT;
}

function currentColor(state: NguaState): NguaColor {
  return NGUA_COLORS[state.currentSeat] ?? NGUA_COLORS[0];
}

export function createNguaGame(): NguaState {
  return {
    gameType: "ngua",
    pieces: createNguaPieces(),
    currentSeat: 0,
    dice: null,
    rolled: false,
    winner: null,
    turn: 1,
    message: `${NGUA_NAMES.red} được đi trước. Hãy đổ xúc xắc.`,
    lastMove: null,
  };
}

export function nguaPublicView(state: NguaState, seat: number): NguaPublicView {
  const color = NGUA_COLORS[seat] ?? NGUA_COLORS[0];
  const legalPieceIds =
    state.currentSeat === seat && state.rolled && state.dice !== null
      ? getLegalMoves(state.pieces, color, state.dice).map((piece) => piece.id)
      : [];
  return {
    pieces: state.pieces,
    currentSeat: state.currentSeat,
    currentColor: currentColor(state),
    dice: state.dice,
    rolled: state.rolled,
    legalPieceIds,
    winner: state.winner,
    turn: state.turn,
    message: state.message,
    lastMove: state.lastMove,
  };
}

export function applyNguaAction(
  state: NguaState,
  seat: number,
  action: NguaAction,
): NguaState {
  if (state.winner !== null) throw new Error("GAME_FINISHED");
  if (state.currentSeat !== seat) throw new Error("NOT_YOUR_TURN");
  const color = currentColor(state);

  if (action.type === "roll") {
    if (state.rolled) throw new Error("DICE_ALREADY_ROLLED");
    const dice = secureDice();
    const legal = getLegalMoves(state.pieces, color, dice);
    if (legal.length === 0) {
      const next = nextSeat(seat);
      return {
        ...state,
        currentSeat: next,
        dice: null,
        rolled: false,
        turn: state.turn + 1,
        message: `${NGUA_NAMES[color]} đổ ${dice} nhưng không có quân hợp lệ. ${NGUA_NAMES[NGUA_COLORS[next]]} tiếp tục.`,
      };
    }
    return {
      ...state,
      dice,
      rolled: true,
      message: `${NGUA_NAMES[color]} đổ được ${dice}. Chọn một quân để đi.`,
    };
  }

  if (!state.rolled || state.dice === null) {
    throw new Error("ROLL_FIRST");
  }
  const piece = state.pieces.find((candidate) => candidate.id === action.pieceId);
  if (!piece || piece.color !== color) throw new Error("INVALID_PIECE");
  const result: NguaMoveResult | null = applyNguaMove(
    state.pieces,
    action.pieceId,
    state.dice,
  );
  if (!result) throw new Error("INVALID_MOVE");

  const nextSeatValue = result.extraTurn ? seat : nextSeat(seat);
  const winner = result.winner;
  return {
    ...state,
    pieces: result.pieces,
    currentSeat: winner ? seat : nextSeatValue,
    dice: null,
    rolled: false,
    winner,
    turn: state.turn + 1,
    lastMove: {
      seat,
      color,
      pieceId: action.pieceId,
      dice: state.dice,
      kicked: result.kicked.map((candidate) => candidate.id),
      extraTurn: result.extraTurn,
    },
    message: winner
      ? `${NGUA_NAMES[color]} đã đưa đủ 4 quân về đích.`
      : result.kicked.length > 0
        ? `${NGUA_NAMES[color]} đá ${result.kicked.length} quân và được thêm lượt.`
        : result.extraTurn
          ? `${NGUA_NAMES[color]} được thêm lượt.`
          : `${NGUA_NAMES[NGUA_COLORS[nextSeatValue]]} đến lượt.`,
  };
}

export function nguaActionMessage(code: string): string {
  const messages: Record<string, string> = {
    GAME_FINISHED: "Ván chơi đã kết thúc",
    NOT_YOUR_TURN: "Chưa tới lượt của bạn",
    DICE_ALREADY_ROLLED: "Bạn đã đổ xúc xắc, hãy chọn quân",
    ROLL_FIRST: "Hãy đổ xúc xắc trước",
    INVALID_PIECE: "Quân này không thuộc về bạn",
    INVALID_MOVE: "Quân này không thể đi theo số vừa đổ",
  };
  return messages[code] ?? "Nước đi không hợp lệ";
}

