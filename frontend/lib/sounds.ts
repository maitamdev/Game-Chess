"use client";

/**
 * Âm thanh của bàn cờ. Ưu tiên file trong /public/sounds (bổ sung ở bước
 * Đánh bóng); khi chưa có file thì tổng hợp bằng WebAudio để vẫn có phản
 * hồi âm thanh. Nút bật/tắt lưu vào localStorage.
 */

const STORAGE_KEY = "kd-sound-enabled";

export type SoundName =
  | "move"
  | "capture"
  | "check"
  | "castle"
  | "game-end"
  | "tick";

let ctx: AudioContext | null = null;
const fileBuffers = new Map<SoundName, AudioBuffer | null>();

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) !== "0";
}

export function setSoundEnabled(enabled: boolean) {
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}

async function loadFile(ac: AudioContext, name: SoundName): Promise<AudioBuffer | null> {
  if (fileBuffers.has(name)) return fileBuffers.get(name) ?? null;
  fileBuffers.set(name, null); // chặn tải lặp
  // ưu tiên .mp3 (theo spec), dự phòng .wav (bộ âm tự tổng hợp đi kèm)
  for (const ext of ["mp3", "wav"]) {
    try {
      const res = await fetch(`/sounds/${name}.${ext}`);
      if (!res.ok) continue;
      const buf = await ac.decodeAudioData(await res.arrayBuffer());
      fileBuffers.set(name, buf);
      return buf;
    } catch {
      continue;
    }
  }
  return null;
}

function tone(
  ac: AudioContext,
  freq: number,
  durationMs: number,
  opts: { type?: OscillatorType; gain?: number; delayMs?: number; slideTo?: number } = {},
) {
  const { type = "triangle", gain = 0.12, delayMs = 0, slideTo } = opts;
  const t0 = ac.currentTime + delayMs / 1000;
  const t1 = t0 + durationMs / 1000;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t1);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t1);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t1 + 0.02);
}

function thud(ac: AudioContext, durationMs: number, gain: number, delayMs = 0) {
  const t0 = ac.currentTime + delayMs / 1000;
  const length = Math.floor((ac.sampleRate * durationMs) / 1000);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 700;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(t0);
}

function synthesize(ac: AudioContext, name: SoundName) {
  switch (name) {
    case "move":
      tone(ac, 260, 70, { slideTo: 180, gain: 0.1 });
      thud(ac, 45, 0.25);
      break;
    case "capture":
      tone(ac, 190, 90, { slideTo: 120, gain: 0.14 });
      thud(ac, 80, 0.4);
      break;
    case "castle":
      tone(ac, 240, 60, { slideTo: 170, gain: 0.09 });
      thud(ac, 40, 0.2);
      tone(ac, 220, 60, { slideTo: 160, gain: 0.09, delayMs: 90 });
      thud(ac, 40, 0.2, 90);
      break;
    case "check":
      tone(ac, 620, 110, { type: "sine", gain: 0.08 });
      tone(ac, 930, 90, { type: "sine", gain: 0.05, delayMs: 30 });
      break;
    case "game-end":
      tone(ac, 392, 110, { type: "sine", gain: 0.09 });
      tone(ac, 523, 110, { type: "sine", gain: 0.09, delayMs: 110 });
      tone(ac, 659, 200, { type: "sine", gain: 0.09, delayMs: 220 });
      break;
    case "tick":
      tone(ac, 1050, 25, { type: "square", gain: 0.03 });
      break;
  }
}

/** Chọn âm thanh phù hợp cho một nước đi vừa thực hiện. */
export function playMoveSound(
  move: { san: string; flags: string },
  gameEnded: boolean,
) {
  if (gameEnded) {
    playSound("game-end");
    return;
  }
  if (move.san.includes("+") || move.san.includes("#")) {
    playSound("check");
    return;
  }
  if (move.flags.includes("k") || move.flags.includes("q")) {
    playSound("castle");
    return;
  }
  if (move.flags.includes("c") || move.flags.includes("e")) {
    playSound("capture");
    return;
  }
  playSound("move");
}

export function playSound(name: SoundName) {
  if (!isSoundEnabled()) return;
  const ac = audioContext();
  if (!ac) return;
  const cached = fileBuffers.get(name);
  if (cached) {
    const src = ac.createBufferSource();
    src.buffer = cached;
    const g = ac.createGain();
    g.gain.value = 0.5;
    src.connect(g).connect(ac.destination);
    src.start();
    return;
  }
  // thử tải file cho lần sau, còn lần này tổng hợp
  void loadFile(ac, name);
  synthesize(ac, name);
}
