"use client";

interface EvalBarProps {
  /** Centipawn, dương = trắng lợi */
  evaluation: number;
  orientation: "white" | "black";
}

/** Thanh lợi thế dọc cạnh bàn cờ. */
export default function EvalBar({ evaluation, orientation }: EvalBarProps) {
  // Nén về [0..1] bằng logistic; kẹp 5–95% để luôn thấy cả hai màu
  const raw = 1 / (1 + Math.exp(-evaluation / 300));
  const whiteShare = Math.min(0.95, Math.max(0.05, raw)) * 100;
  const whiteAtBottom = orientation === "white";
  const label =
    Math.abs(evaluation) >= 90_000
      ? "#"
      : (evaluation > 0 ? "+" : "") + (evaluation / 100).toFixed(1);

  return (
    <div
      className="flex h-full w-4 flex-col overflow-hidden rounded-[6px] border border-line"
      role="img"
      aria-label={`Lợi thế: ${label}`}
      title={label}
    >
      <div
        className="w-full transition-[height] duration-300"
        style={{
          height: `${whiteAtBottom ? 100 - whiteShare : whiteShare}%`,
          background: whiteAtBottom ? "#22262C" : "#F5EFE3",
        }}
      />
      <div
        className="w-full flex-1"
        style={{ background: whiteAtBottom ? "#F5EFE3" : "#22262C" }}
      />
    </div>
  );
}
