"use client";

import type { ReactNode } from "react";
import {
  ArrowCounterClockwise,
  ArrowsClockwise,
  CheckSquare,
  Flag,
  Lightbulb,
  Plus,
  Square,
} from "@phosphor-icons/react";
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
  variant?: "default" | "jungle";
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
  variant = "default",
}: GameControlsProps) {
  if (variant === "jungle") {
    const action = ({
      label,
      icon,
      onClick,
      disabled,
      active,
      danger,
    }: {
      label: string;
      icon: ReactNode;
      onClick: () => void;
      disabled?: boolean;
      active?: boolean;
      danger?: boolean;
    }) => (
      <button
        key={label}
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={active}
        className="jg-action-button"
        data-active={active ? "true" : "false"}
        data-danger={danger ? "true" : "false"}
      >
        {icon}
        <span>{label}</span>
      </button>
    );

    return (
      <div className="grid grid-cols-2 gap-2">
        {onUndo &&
          action({
            label: "Hoàn tác",
            icon: <ArrowCounterClockwise aria-hidden size={19} weight="duotone" />,
            onClick: onUndo,
            disabled: undoDisabled,
          })}
        {onHint &&
          action({
            label: hintLoading ? "Đang tính..." : "Gợi ý",
            icon: <Lightbulb aria-hidden size={19} weight="duotone" />,
            onClick: onHint,
            disabled: hintDisabled || hintLoading,
            active: hintActive,
          })}
        {onFlip &&
          action({
            label: "Xoay bàn",
            icon: <ArrowsClockwise aria-hidden size={19} weight="duotone" />,
            onClick: onFlip,
          })}
        {onToggleAutoFlip &&
          action({
            label: "Tự xoay",
            icon: autoFlip ? (
              <CheckSquare aria-hidden size={19} weight="duotone" />
            ) : (
              <Square aria-hidden size={19} weight="duotone" />
            ),
            onClick: () => onToggleAutoFlip(!autoFlip),
            active: autoFlip,
          })}
        {onResign &&
          action({
            label: "Đầu hàng",
            icon: <Flag aria-hidden size={19} weight="duotone" />,
            onClick: onResign,
            disabled: resignDisabled,
            danger: true,
          })}
        {onNewGame &&
          action({
            label: newGameLabel,
            icon: <Plus aria-hidden size={19} weight="duotone" />,
            onClick: onNewGame,
          })}
      </div>
    );
  }

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
