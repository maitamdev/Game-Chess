"use client";

import Button from "@/components/ui/Button";

interface GameControlsProps {
  onUndo?: () => void;
  undoDisabled?: boolean;
  onFlip?: () => void;
  autoFlip?: boolean;
  onToggleAutoFlip?: (value: boolean) => void;
  onHint?: () => void;
  hintLoading?: boolean;
  hintDisabled?: boolean;
  hintActive?: boolean;
  onResign?: () => void;
  resignDisabled?: boolean;
  onNewGame?: () => void;
  newGameLabel?: string;
}

export default function GameControls({
  onUndo,
  undoDisabled,
  onFlip,
  autoFlip,
  onToggleAutoFlip,
  onHint,
  hintLoading,
  hintDisabled,
  hintActive,
  onResign,
  resignDisabled,
  onNewGame,
  newGameLabel = "Ván mới",
}: GameControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {onUndo && (
        <Button size="sm" onClick={onUndo} disabled={undoDisabled}>
          ↩ Hoàn tác
        </Button>
      )}
      {onHint && (
        <Button
          size="sm"
          onClick={onHint}
          disabled={hintDisabled || hintLoading}
          className={hintActive ? "!border-brass !text-brass" : ""}
        >
          {hintLoading ? "Đang tính…" : "◎ Gợi ý"}
        </Button>
      )}
      {onFlip && (
        <Button size="sm" onClick={onFlip}>
          ⇅ Xoay bàn
        </Button>
      )}
      {onToggleAutoFlip && (
        <label className="flex cursor-pointer items-center gap-2 rounded-[6px] border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-brass">
          <input
            type="checkbox"
            checked={autoFlip}
            onChange={(e) => onToggleAutoFlip(e.target.checked)}
            className="accent-[var(--brass)]"
          />
          Tự xoay
        </label>
      )}
      {onResign && (
        <Button size="sm" variant="danger" onClick={onResign} disabled={resignDisabled}>
          ⚑ Đầu hàng
        </Button>
      )}
      {onNewGame && (
        <Button size="sm" onClick={onNewGame}>
          {newGameLabel}
        </Button>
      )}
    </div>
  );
}
