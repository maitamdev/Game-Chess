"use client";

import { useEffect, useState } from "react";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sounds";

/** Nút bật/tắt âm thanh ở góc, lưu lựa chọn vào localStorage. */
export default function SoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isSoundEnabled());
  }, []);

  return (
    <button
      type="button"
      aria-label={enabled ? "Tắt âm thanh" : "Bật âm thanh"}
      title={enabled ? "Tắt âm thanh" : "Bật âm thanh"}
      className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-line text-sm text-muted transition-colors hover:border-brass hover:text-brass"
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        setSoundEnabled(next);
      }}
    >
      {enabled ? "♪" : "∅"}
    </button>
  );
}
