# Training System Architecture

## Component Hierarchy

```
TrainingPage (Parent)
├── ChallengeSelector
│   └── Challenge Cards (Grid)
│       └── Difficulty Badges
│
├── TypingTerminal
│   ├── Header (Stats Display)
│   │   ├── Difficulty Badge
│   │   ├── WPM Counter
│   │   ├── Accuracy Counter
│   │   └── Error Counter
│   ├── Progress Bar
│   ├── Terminal Display
│   │   ├── Terminal Prompt
│   │   └── Character Grid
│   │       ├── Past Characters (green/red)
│   │       ├── Current Character (cyan glow)
│   │       └── Future Characters (dimmed)
│   ├── Completion Modal
│   └── Footer (Instructions)
│
└── TypingHeatmap
    ├── Statistics Dashboard
    │   ├── Total Keystrokes
    │   ├── Average Accuracy
    │   └── Total Errors
    ├── Keyboard Visualization
    │   ├── Row 1 (Numbers/Symbols)
    │   ├── Row 2 (QWERTY)
    │   ├── Row 3 (ASDF)
    │   ├── Row 4 (ZXCV)
    │   └── Spacebar
    ├── Color Legend
    └── Performance Analysis
        ├── Weakest Keys (Top 5)
        └── Strongest Keys (Top 5)
```

## Data Flow

### 1. Challenge Selection Flow
```
User clicks challenge
    ↓
ChallengeSelector.onSelect(challengeId)
    ↓
useOrbitStore.startChallenge(challengeId)
    ↓
activeChallenge state updated
    ↓
TypingTerminal rendered with challenge
```

### 2. Typing Session Flow
```
User presses key
    ↓
handleKeyPress event
    ↓
Compare with expected character
    ↓
Update keyStats: { [key]: { errors, presses } }
    ↓
Update counters: currentIndex, correctChars, totalTyped, errorCount
    ↓
Trigger visual feedback (flash/shake/success)
    ↓
Update live WPM/accuracy (every 100ms)
    ↓
On completion:
    ↓
submitSession(challengeId, wpm, accuracy, errorCount)
    ↓
syncTypingStats(keyStats)
    ↓
Show completion modal
    ↓
onComplete() callback
```

### 3. Stats Sync Flow
```
TypingTerminal completes
    ↓
syncTypingStats(keyStats) called
    ↓
Batch upsert to typing_stats table
    ↓
Update local typingHeatmap state
    ↓
TypingHeatmap re-renders with new data
```

## State Management

### Zustand Store (useOrbitStore)

#### Training State
```typescript
{
  // Challenges
  typingChallenges: TypingChallenge[];
  activeChallenge: TypingChallenge | null;

  // Performance Data
  typingHeatmap: Record<string, KeyStat>;
  recentSessions: TypingSession[];

  // Actions
  fetchChallenges: () => Promise<void>;
  startChallenge: (id: string) => void;
  submitSession: (challengeId, wpm, accuracy, errorCount) => Promise<void>;
  syncTypingStats: (keyStats) => Promise<void>;
  fetchTypingHeatmap: () => Promise<void>;
  fetchRecentSessions: () => Promise<void>;
}
```

### TypingTerminal Component State
```typescript
{
  // Core Typing State
  currentIndex: number;                    // Current character position
  startTime: number | null;                // Session start timestamp
  correctChars: number;                    // Count of correct keystrokes
  totalTyped: number;                      // Total keystrokes
  errorCount: number;                      // Total errors
  consecutiveErrors: number;               // For shake trigger
  keyStats: Record<string, { errors, presses }>;
  typedChars: Array<{ char, correct }>;    // Typed character history
  isComplete: boolean;                     // Session status

  // Live Stats
  currentWPM: number;                      // Real-time WPM
  currentAccuracy: number;                 // Real-time accuracy

  // Animation Controls
  shakeControls: AnimationControls;
  flashControls: AnimationControls;
  successControls: AnimationControls;
}
```

### TypingHeatmap Computed State
```typescript
{
  // Computed from typingHeatmap
  overallStats: {
    avgAccuracy: number;
    totalPresses: number;
    totalErrors: number;
  };
  weakestKeys: Array<[string, KeyStat]>;   // Top 5 lowest accuracy
  strongestKeys: Array<[string, KeyStat]>; // Top 5 highest accuracy
}
```

## Database Schema

### typing_challenges
```sql
id: uuid
title: text
text_content: text
difficulty: enum('Easy', 'Medium', 'Hard')
created_at: timestamp
```

### typing_sessions
```sql
id: uuid
user_id: uuid (FK)
challenge_id: uuid (FK, nullable)
wpm: integer
accuracy: numeric
error_count: integer
completed_at: timestamp
```

### typing_stats
```sql
user_id: uuid (FK)
key_char: text
error_count: integer
total_presses: integer
UNIQUE(user_id, key_char)
```

## Performance Optimizations

### TypingTerminal
1. **Event Throttling**: WPM updates every 100ms (not on every keystroke)
2. **Memoized Calculations**: Character grid only re-renders changed characters
3. **Auto-scroll**: Only scrolls when cursor near bottom (prevents jank)
4. **CSS Animations**: Cursor blink and scanline use CSS, not JS
5. **Transform-based**: All animations use `transform` for GPU acceleration

### TypingHeatmap
1. **useMemo**: Overall stats calculated once per heatmap change
2. **useMemo**: Weak/strong keys sorted once per heatmap change
3. **Conditional Rendering**: Tooltips only render when data exists
4. **Hover State**: Uses CSS :hover for tooltip trigger (minimal JS)
5. **Staggered Animations**: Delays spread over time to prevent frame drops

## Animation Timing Specifications

### TypingTerminal Animations
| Animation | Duration | Trigger | Easing |
|-----------|----------|---------|--------|
| Error Flash | 300ms | Wrong character | Linear |
| Shake | 400ms | 3 consecutive errors | Default |
| Success Pulse | 800ms | Challenge complete | Default |
| Cursor Glow | 1000ms | Continuous loop | Ease-in-out |
| Scanline | 8000ms | Continuous loop | Linear |
| Progress Bar | 200ms | Character advance | Default |
| Completion Modal | 500ms | Challenge complete | Default |

### TypingHeatmap Animations
| Animation | Duration | Trigger | Easing |
|-----------|----------|---------|--------|
| Key Entrance | Staggered | Component mount | Default |
| Hover Scale | 300ms | Mouse hover | Default |
| Tooltip Fade | 200ms | Mouse hover | Default |
| Stats Card Entrance | 400ms | Component mount | Default |

## Accessibility Features

### Keyboard Navigation
- TypingTerminal: All controls via keyboard
- ChallengeSelector: Cards focusable and clickable with Enter
- TypingHeatmap: Tooltips accessible via focus

### Visual Feedback
- High contrast colors (WCAG AA compliant)
- Clear focus indicators
- Multiple feedback channels (color + animation + text)

### Screen Reader Support
- Semantic HTML elements
- ARIA labels on interactive elements
- Live regions for stat updates (to be implemented)

## Browser Compatibility

### Required Features
- CSS Grid (all modern browsers)
- Backdrop filter (Safari 15+, Chrome 76+, Firefox 103+)
- Framer Motion (React 18+)
- Performance API (all modern browsers)

### Graceful Degradation
- Backdrop blur falls back to solid background
- Animations disabled if `prefers-reduced-motion`
- Tooltips work without JavaScript hover

## File Size & Bundle Impact

| File | Size (unminified) | Deps |
|------|----------|------|
| TypingTerminal.tsx | ~18KB | framer-motion, lucide-react |
| TypingHeatmap.tsx | ~17KB | framer-motion, lucide-react |
| ChallengeSelector.tsx | ~15KB | framer-motion |
| **Total** | **~50KB** | Shared deps not duplicated |

## Future Enhancements

### Phase 1 (Planned)
- [ ] ESC key to exit mid-challenge
- [ ] Pause/resume functionality
- [ ] Sound effects (toggle)
- [ ] Dark/light theme toggle

### Phase 2 (Backlog)
- [ ] Multiplayer typing races
- [ ] Custom challenge creation
- [ ] Practice mode for specific keys
- [ ] Historical performance graphs
- [ ] Achievement system
- [ ] Leaderboards

### Phase 3 (Ideas)
- [ ] AI-generated challenges based on weak keys
- [ ] Voice commands for accessibility
- [ ] Mobile/touch typing support
- [ ] Collaborative typing sessions
- [ ] Export stats to CSV
