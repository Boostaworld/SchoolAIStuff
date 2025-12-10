<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🪐 Orbit OS - Advanced Typing & Economy Platform

Orbit OS is a gamified typing training platform featuring a real-time economy, AI-powered challenges, and competitive racing. It combines cyberpunk aesthetics with serious training tools.

## 🌟 Key Features

### ⌨️ Training & Racing
- **Adaptive Typing Engine**: Challenges scale with your WPM (0-40, 40-70, 70+).
- **Racing Arena**: Compete against AI bots with realistic speed interpolation.
- **Heatmaps**: Visual analysis of your weak keys and error patterns.

### 💰 Economy System
- **Orbit Points**: Earn currency by typing, racing, and completing tasks.
- **Passive Mining**: "Orbital Mining Rig" earns points while you work (anti-AFK enabled).
- **Black Market**: Purchase premium themes, cursors, and upgrades.
- **The Vault**: Buy/sell educational resources and cheat sheets.

### 🤖 Intel & AI (Powered by Gemini)
- **Intel Command Deck**: Tiered AI access (Flash, Pro, Orbit-X).
- **Research Mode**: Generate structured reports or have free-form conversations.
- **God Mode**: Admin panel for user management and AI model whitelisting.

### 🤝 Community (Coming Soon)
- **Social Feed**: Share achievements and updates.
- **Study Groups**: Join course-specific squads.
- **Google Classroom Sync**: Auto-import assignments as tasks.

## 🎨 Design System

- **Theme**: Cyberpunk/Sci-Fi (Slate 900/950 base).
- **Typography**: `Orbitron` for headers, `JetBrains Mono` (or similar) for data.
- **Color Coding**:
  - 🟡 **Economy**: Gold/Amber
  - 🔵 **Intel**: Cyan/Blue
  - 🔴 **Admin**: Red/Orange
  - 🟣 **Training**: Violet

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion
- **Backend**: Supabase (Auth, Database, Realtime, Storage)
- **State Management**: Zustand
- **AI**: Google Gemini API

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Create `.env.local` with:
   ```env
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   VITE_GEMINI_API_KEY=your_key
   ```

3. **Run Locally**
   ```bash
   npm run dev
   ```

## 📚 Documentation

- **[PROGRESS.md](./PROGRESS.md)**: Current roadmap, active sprint status, and recent completions.
- **[docs/archive/](./docs/archive/)**: Deprecated plans and historical logs.

## 📂 Codebase Structure

### Core Directories
- **`/components`**: React UI components organized by feature.
  - **`/Economy`**: `PassiveMiner.tsx`, `BlackMarket.tsx` (Shop/Inventory).
  - **`/Intel`**: `IntelCommandDeck.tsx` (AI Controls), `IntelPanel.tsx`.
  - **`/Admin`**: `GodModePanel.tsx` (User Management).
  - **`/Training`**: `RacingTerminal.tsx`, `TypingBox.tsx` (Core Engine).
  - **`/Dashboard`**: Main layout and view switching logic.
- **`/lib`**: Utilities and API wrappers.
  - **`/ai`**: `IntelService.ts` (Gemini Integration), `intel.ts`.
  - `supabase.ts`: Database client.
  - `toast.ts`: Custom notification system.
- **`/store`**: State management.
  - `useOrbitStore.ts`: **Monolithic Zustand store** handling Auth, Tasks, Economy, AI, and Social state.
- **`/sql`**: Database migrations and schemas.
  - **`/archive`**: Deprecated SQL files (Reference only).
  - Root SQL files are the active source of truth.

### Key Files
- `App.tsx`: Main entry point, handles Auth checks and initial data loading.
- `types.ts`: TypeScript definitions for User, Tasks, Inventory, etc.
- `tailwind.config.js`: Design system tokens (colors, fonts, animations).

---

**Status:** Gold Master Phase (Economy & AI Implementation)
**Version:** 0.9.0 Beta
