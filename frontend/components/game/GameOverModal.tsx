"use client";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { GameResult } from "@/lib/types";
import { TERMINATION_LABELS, resultTitle } from "@/lib/types";

interface GameOverModalProps {
  result: GameResult | null;
  open: boolean;
  onClose: () => void;
  actions: { label: string; onClick: () => void; primary?: boolean }[];
}

export default function GameOverModal({
  result,
  open,
  onClose,
  actions,
}: GameOverModalProps) {
  if (!result) return null;
  return (
    <Modal open={open} onClose={onClose}>
      <div className="text-center">
        <span aria-hidden className="text-2xl leading-none">
          {result.winner === null ? "½–½" : result.winner === "white" ? "1–0" : "0–1"}
        </span>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">
          {resultTitle(result)}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {TERMINATION_LABELS[result.termination]}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {actions.map((a) => (
            <Button
              key={a.label}
              variant={a.primary ? "primary" : "ghost"}
              onClick={a.onClick}
            >
              {a.label}
            </Button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 text-xs text-muted transition-colors hover:text-parchment"
        >
          Đóng và xem lại bàn cờ
        </button>
      </div>
    </Modal>
  );
}
