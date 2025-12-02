# TypingTerminal - Quick Reference Card

## Import

```tsx
import { TypingTerminal, TypingHeatmap } from '@/components/Training';
```

## Basic Setup

```tsx
const { activeChallenge } = useOrbitStore();

<TypingTerminal
  challenge={activeChallenge}
  onComplete={() => console.log('Done!')}
/>
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Any char | Type character |
| Backspace | Delete previous (errors tracked) |
| ESC | Exit (planned) |

## Visual Indicators

| Color | Meaning |
|-------|---------|
| 🟢 Green | Correct character |
| 🔴 Red | Incorrect character |
| 🔵 Cyan | Current cursor position |
| ⚫ Gray | Upcoming characters |

## Stat Calculations

```typescript
// WPM Formula
WPM = (correctChars / 5) / (elapsedMinutes)

// Accuracy Formula
Accuracy = (correctChars / totalTyped) * 100

// Score
Score = WPM * (Accuracy / 100)
```

## Animation Triggers

| Animation | Trigger | Duration |
|-----------|---------|----------|
| Error Flash | Wrong key | 300ms |
| Shake | 3 errors in a row | 400ms |
| Success Pulse | Complete challenge | 800ms |
| Cursor Glow | Continuous | 1000ms loop |

## Difficulty Colors

| Level | Color | Glow |
|-------|-------|------|
| Easy | Emerald | Green |
| Medium | Amber | Orange |
| Hard | Red | Rose |

## Store Integration

```typescript
const {
  submitSession,      // Auto-called on complete
  syncTypingStats,    // Auto-syncs key stats
  currentUser,        // Shows username
  typingHeatmap       // Powers TypingHeatmap
} = useOrbitStore();
```

## Heatmap Colors

| Accuracy | Color | Meaning |
|----------|-------|---------|
| 95%+ | 🟢 Emerald | Perfect |
| 85-94% | 🔵 Cyan | Good |
| 75-84% | 🟡 Amber | Fair |
| 60-74% | 🟠 Orange | Needs work |
| <60% | 🔴 Red | Critical |

## Performance Tips

1. Use `useMemo` for expensive calculations
2. Limit WPM updates to 100ms intervals
3. Use CSS animations over JS where possible
4. Clean up event listeners in useEffect
5. Avoid re-rendering entire character grid

## Common Patterns

### Challenge Selection Flow
```tsx
// 1. User selects challenge
<ChallengeSelector onSelect={startChallenge} />

// 2. Terminal loads
<TypingTerminal challenge={active} onComplete={done} />

// 3. Stats update
<TypingHeatmap /> // Auto-updates
```

### Error Handling
```tsx
// Terminal automatically handles:
- Wrong keystrokes → Flash + count
- 3 errors → Screen shake
- Completion → Success animation
- Stats sync → Database update
```

## File Locations

```
components/Training/
├── TypingTerminal.tsx      # Main component
├── TypingHeatmap.tsx       # Keyboard viz
├── index.ts                # Exports
└── README.md               # Full docs
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No cursor visible | Check currentIndex state |
| WPM not updating | Verify startTime is set |
| Stats not syncing | Check submitSession call |
| Animations laggy | Use CSS instead of JS |
| Build errors | Run `npm run build` |

## Quick Start

```bash
# 1. Import component
import { TypingTerminal } from '@/components/Training';

# 2. Get challenge from store
const { activeChallenge } = useOrbitStore();

# 3. Render component
<TypingTerminal 
  challenge={activeChallenge} 
  onComplete={() => setActive(null)} 
/>

# 4. Done! Component handles everything else.
```
