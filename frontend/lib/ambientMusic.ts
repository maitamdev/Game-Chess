"use client";

/** Nhạc nền MP3 chill, lặp nhẹ trong lúc chơi cờ. */
const STORAGE_KEY = "kd-ambient-music-enabled";
const TRACK_SRC = "/sounds/chill-chess.mp3";

let player: HTMLAudioElement | null = null;

function getPlayer() {
  if (typeof window === "undefined") return null;
  if (!player) {
    player = new Audio(TRACK_SRC);
    player.loop = true;
    player.preload = "auto";
    player.volume = 0.18;
  }
  return player;
}

export function isAmbientMusicEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setAmbientMusicEnabled(enabled: boolean) {
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}

export function startAmbientMusic() {
  const audio = getPlayer();
  if (!audio) return;
  audio.volume = 0.18;
  void audio.play().catch(() => {
    // Trình duyệt sẽ cho phép phát lại sau một thao tác người dùng.
  });
}

export function stopAmbientMusic() {
  if (!player) return;
  player.pause();
}

export function isAmbientMusicRunning() {
  return Boolean(player && !player.paused);
}
