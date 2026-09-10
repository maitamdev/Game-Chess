"use client";

import { useEffect, useState } from "react";
import { MusicNote, MusicNotes } from "@phosphor-icons/react";
import {
  isAmbientMusicEnabled,
  isAmbientMusicRunning,
  setAmbientMusicEnabled,
  startAmbientMusic,
  stopAmbientMusic,
} from "@/lib/ambientMusic";

export default function AmbientMusicToggle() {
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const preferred = isAmbientMusicEnabled();
    setEnabled(preferred);
    setPlaying(isAmbientMusicRunning());

    const unlock = () => {
      if (!isAmbientMusicEnabled()) return;
      startAmbientMusic();
      setPlaying(true);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    const onVisibility = () => {
      if (document.hidden) {
        stopAmbientMusic();
        setPlaying(false);
      } else if (isAmbientMusicEnabled()) {
        startAmbientMusic();
        setPlaying(true);
      }
    };

    if (preferred) {
      window.addEventListener("pointerdown", unlock, { once: true });
      window.addEventListener("keydown", unlock, { once: true });
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", onVisibility);
      stopAmbientMusic();
    };
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setAmbientMusicEnabled(next);
    if (next) {
      startAmbientMusic();
      setPlaying(true);
    } else {
      stopAmbientMusic();
      setPlaying(false);
    }
  };

  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? "Tắt nhạc chill" : "Bật nhạc chill"}
      title={enabled ? "Tắt nhạc chill" : "Bật nhạc chill"}
      className={`relative flex h-8 items-center justify-center gap-1 rounded-[6px] border px-2 text-xs transition-colors ${
        enabled
          ? "border-brass bg-brass/10 text-brass"
          : "border-line text-muted hover:border-brass hover:text-brass"
      }`}
      onClick={toggle}
    >
      {playing ? <MusicNotes aria-hidden size={17} weight="duotone" /> : <MusicNote aria-hidden size={17} weight="duotone" />}
      <span>Nhạc</span>
      {playing && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-brass" aria-hidden />}
    </button>
  );
}
