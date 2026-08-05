# KyDai (Kỳ Đài) - UI/UX Design System & Guidelines

## 1. Core Identity & Vibe
**KyDai** is a premium, web-based multiplayer board game platform (featuring Chess, Xiangqi, Gomoku, Jungle Chess, and O An Quan). 
The aesthetic must scream "Modern, High-End, and Gamer-Centric". It should feel like a sleek digital arena rather than a boring traditional web page.

- **Theme:** True Dark Mode (No light mode).
- **Core Style:** Glassmorphism, deep contrast, and neon/glowing accents.
- **Mood:** Focused, competitive, elegant, and technologically advanced.

## 2. Color Palette (Tailwind Native)
We rely on Tailwind CSS color palettes to maintain consistency.

### Backgrounds (Deep & Immersive)
- **App Background:** `bg-slate-950` (#020617) or extremely dark navy/charcoal.
- **Panel/Card Backgrounds (Glassmorphism):** 
  - Base: `bg-slate-900/40` (Translucent dark).
  - Hover: `bg-slate-800/60`.
- **Borders:** Subtle translucent borders `border-white/10` or `border-slate-800`.

### Accents (Neon & Interactive)
- **Primary Brand (Action/Play/Win):** Emerald / Cyan glowing accents.
  - Text/Icons: `text-emerald-400`.
  - Buttons: `bg-emerald-500 hover:bg-emerald-400`.
  - Glow: `shadow-[0_0_15px_rgba(16,185,129,0.5)]`.
- **Secondary (Info/Highlights):** Indigo / Violet.
  - Highlights: `text-indigo-400`.
- **Danger/Destructive (Resign/Lose):** Rose / Red.
  - Buttons/Alerts: `bg-rose-500 hover:bg-rose-400`.

### Typography Colors
- **Primary Text:** `text-slate-100` (Main headings, body text).
- **Secondary/Muted Text:** `text-slate-400` (Descriptions, timestamps, labels).

## 3. Typography
- **Font Family:** Use `font-sans` with a modern geometric typeface (e.g., **Inter, Outfit, or Roboto**).
- **Headings:** Bold, tightly spaced (`tracking-tight`), often using gradient text for prominent titles (e.g., `bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400`).
- **Data/Numbers:** Use tabular nums or monospaced fonts for Timers, Elo ratings, and Match history logs.

## 4. UI Components & Layout Paradigms

### Glassmorphism Cards & Panels
Every container, modal, and sidebar should use the glass effect:
- **Tailwind Classes:** `backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-xl`.

### Buttons
Buttons should feel tactile and responsive.
- **Primary Button (e.g., "Play Now", "Find Match"):** 
  - Bright background (`bg-emerald-500`), bold white text, rounded corners (`rounded-full` or `rounded-xl`), and a subtle drop shadow or glow.
  - **Hover state:** Scale up slightly (`hover:scale-105`), increase brightness, smooth transition (`transition-all duration-200`).
- **Secondary Button:**
  - Transparent background, visible border (`border border-slate-600`), muted text.
  - **Hover state:** Background fills with a muted color (`hover:bg-slate-800`).

### The Game Board (The Core Element)
- Must be the centerpiece of the layout.
- Needs a distinct border (perhaps metallic or glowing).
- Uses grid layouts (`grid grid-cols-8`) perfectly squared (`aspect-square`).
- Player avatars and timers should stick closely to the top and bottom of the board for immediate visibility.

## 5. Spacing & Layout Structure
- **Global Padding:** Generous padding (`p-6` or `p-8`) to let elements breathe.
- **Flexbox/Grid:** Heavily utilize CSS Grid for game lists and Flexbox for alignments. 
- **Responsiveness:** 
  - Desktop: 3-column layouts for active games (Sidebar - Board - Chat/Logs).
  - Mobile: Stacked layout where the board remains fully visible without scrolling.

## 6. Micro-Interactions
- Use `transition-all duration-300 ease-in-out` extensively.
- Cards should translate up slightly on hover (`hover:-translate-y-1`).
- Interactive elements must have a clear `:active` state (e.g., scaling down `active:scale-95`).
