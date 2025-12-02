# Training Components - Orbit OS

Production-grade typing training system with cyberpunk terminal aesthetics. Includes challenge selection, real-time typing terminal, and performance heatmap visualization.

---

## Components Overview

1. **ChallengeSelector** - Challenge selection interface with cyberpunk cards
2. **TypingTerminal** - Real-time typing interface with advanced feedback
3. **TypingHeatmap** - Interactive keyboard performance visualization

---

## 1. TypingTerminal

The main typing interface with character-by-character tracking and real-time performance metrics.

### Features

#### Character-by-character Display
- **Completed characters**: Green (emerald-400)
- **Incorrect characters**: Red with strikethrough
- **Current character**: Cyan glow with pulsing animation
- **Upcoming characters**: Dimmed (slate-600)

#### Real-time Statistics
- **Live WPM**: Updates every 100ms using formula `(correctChars / 5) / elapsedMinutes`
- **Accuracy percentage**: `(correctChars / totalTyped) * 100`
- **Error count**: Total incorrect keystrokes
- **Progress bar**: Animated gradient showing completion percentage

#### Visual Feedback
- **Error flash**: Full-screen red pulse overlay (300ms)
- **Shake animation**: Screen shake after 3 consecutive errors
- **Success animation**: Green pulse with scale effect on completion
- **Typing cursor**: Blinking cyan glow on current character
- **CRT scanline**: Vertical scanning effect (8s loop)

#### Per-key Error Tracking
- Tracks every keystroke in `keyStats: Record<string, { errors: number; presses: number }>`
- For each key press: increment `presses`, if wrong increment `errors`
- Syncs to database via `syncTypingStats()` on completion

#### Session Management
- Auto-submits session: `submitSession(challengeId, wpm, accuracy, errorCount)`
- Syncs typing stats for heatmap
- Shows completion modal with final stats
- Auto-exits after 3 seconds

### Props

```typescript
interface TypingTerminalProps {
  challenge: TypingChallenge;  // Challenge object with id, text_content, title, difficulty
  onComplete: () => void;       // Callback when challenge completes
}
```

### Usage

```tsx
import { TypingTerminal } from './components/Training';

<TypingTerminal
  challenge={activeChallenge}
  onComplete={() => setActiveChallenge(null)}
/>
```

### Keyboard Controls
- **Any character key**: Type the current character
- **Backspace**: Delete previous character (errors still recorded)
- **ESC**: Exit challenge (planned feature)

### Visual Elements

#### Header
- Difficulty badge with gradient and glow
- Challenge title in monospace
- Three stat displays: WPM, Accuracy, Errors

#### Progress Bar
- Animated gradient moving left to right
- Cyan to violet color scheme
- Grows as user progresses through text

#### Terminal Display
- Terminal prompt showing username and challenge ID
- Monospace text with 1.5x line height
- Auto-scroll to keep cursor visible
- Character-level color coding

#### Completion Modal
- Trophy icon with rotation animation
- Final stats in three cards
- Score calculation: `WPM * (Accuracy / 100)`

---

## 2. TypingHeatmap

Interactive keyboard visualization showing per-key accuracy with color-coded performance metrics.

### Features

#### Visual Keyboard Layout
- Full QWERTY keyboard with realistic row offsets
- Individual key buttons (48px × 48px)
- Spacebar (384px × 48px)
- Accurate spacing and positioning

#### Color-coded Accuracy
- **95%+ Perfect**: Emerald green gradient with glow
- **85-94% Good**: Cyan blue gradient
- **75-84% Fair**: Amber orange gradient
- **60-74% Needs Work**: Orange red gradient
- **<60% Critical**: Red rose gradient

#### Interactive Features
- **Hover tooltips**: Shows accuracy, presses, errors per key
- **Scale animation**: 1.1x on hover
- **Smooth transitions**: 300ms duration
- **Z-index elevation**: Tooltip appears above other keys

#### Statistics Dashboard
- **Total Keystrokes**: Overall press count
- **Average Accuracy**: Weighted across all keys
- **Total Errors**: Sum of all mistakes

#### Focus Analysis
- **Weakest Keys (Top 5)**: Lowest accuracy keys requiring practice
- **Strongest Keys (Top 5)**: Highest accuracy keys mastered
- Minimum 3 presses required for inclusion

### Usage

```tsx
import { TypingHeatmap } from './components/Training';

<TypingHeatmap />
```

No props required - automatically pulls data from `useOrbitStore().typingHeatmap`.

### Data Structure

```typescript
typingHeatmap: Record<string, {
  errors: number;
  presses: number;
  accuracy: number; // (presses - errors) / presses * 100
}>
```

---

## 3. ChallengeSelector

A production-grade typing challenge selection interface for Orbit OS with authentic cyberpunk terminal aesthetics.

## Features

### Visual Design
- **Cyberpunk Terminal Aesthetic**: Authentic hacker terminal feel with cyan/violet accents
- **Glassmorphism Effects**: Layered translucent backgrounds with backdrop blur
- **Animated Scan Lines**: Vertical scanning effects that activate on hover
- **Corner Decorations**: Terminal-style border accents on each card
- **Glowing Borders**: Animated glow effects on hover states

### Interactions
- **Staggered Entrance**: Cards animate in with sequential delays (80ms between each)
- **Hover Elevation**: Cards scale up and lift on hover with smooth spring physics
- **Click Feedback**: Tap animation provides tactile response
- **Badge Animations**: Difficulty badges scale independently on hover

### Responsive Layout
- **Desktop**: 2-column CSS Grid layout with 1.5rem gap
- **Mobile**: Single column layout with 1rem gap
- **Breakpoint**: 768px

### Difficulty System
Each challenge displays a difficulty badge with:
- **Easy** (⚡): Emerald green with glow effect
- **Medium** (🔥): Amber yellow with glow effect
- **Hard** (💀): Rose red with glow effect

### Empty State
When no challenges are available, displays a stylized terminal message:
```
NO CHALLENGES AVAILABLE
// CONTACT ADMIN
```
With animated cursor, scan lines, and glitch effects.

## Props

```typescript
interface ChallengeSelectorProps {
  challenges: TypingChallenge[];  // Array of typing challenges
  onSelect: (challengeId: string) => void;  // Callback when challenge is selected
}
```

### TypingChallenge Type
```typescript
interface TypingChallenge {
  id: string;
  title: string;
  text_content: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  created_at: string;
}
```

## Usage

```tsx
import ChallengeSelector from './components/Training/ChallengeSelector';
import { TypingChallenge } from './types';

function TrainingPage() {
  const challenges: TypingChallenge[] = [
    {
      id: '1',
      title: 'Terminal Basics',
      text_content: 'The quick brown fox...',
      difficulty: 'Easy',
      created_at: new Date().toISOString(),
    },
    // ... more challenges
  ];

  const handleSelect = (challengeId: string) => {
    // Navigate to challenge or start typing session
    console.log('Starting challenge:', challengeId);
  };

  return (
    <ChallengeSelector
      challenges={challenges}
      onSelect={handleSelect}
    />
  );
}
```

## Component Structure

### Main Container
- Manages responsive grid layout
- Handles empty state rendering
- Orchestrates staggered animations

### ChallengeCard
Individual challenge cards with:
- Title with cyber underline accent
- Difficulty badge with icon
- Text preview (first 100 characters)
- Interactive hover hints (">> SELECT")
- Corner decorations
- Scan line effects

## Styling Details

### Typography
- **Font**: JetBrains Mono (monospace for authentic terminal feel)
- **Title**: 1.125rem, bold, cyan glow
- **Preview**: 0.8125rem, muted cyan
- **Badge**: 0.75rem, uppercase, letter-spaced

### Colors
- **Background**: Slate-900/700 gradients with opacity
- **Primary**: Cyan-500 (rgb(6, 182, 212))
- **Accent**: Violet-500 (rgb(139, 92, 246))
- **Text**: Cyan-300 to Cyan-500

### Effects
- **Backdrop Blur**: 16px on cards, 12px on terminal box
- **Box Shadow**: Layered cyan glows with varying opacity
- **Text Shadow**: Subtle cyan glow on titles
- **Border Glow**: Animated gradient blur on hover

## Animation Timing

| Element | Duration | Easing |
|---------|----------|--------|
| Card Entrance | 500ms | Cubic bezier [0.23, 1, 0.32, 1] |
| Hover Scale | 250ms | Ease out |
| Tap Feedback | 150ms | Default |
| Stagger Delay | 80ms | Between cards |
| Scan Line | 3s | Ease-in-out infinite |
| Badge Hover | 200ms | Default |

## Accessibility

### Keyboard Navigation
- Cards are clickable with Enter/Space
- Focus states inherit hover styles

### Reduced Motion
Respects `prefers-reduced-motion` by disabling:
- Scan line animations
- Glitch effects
- Cursor blinking
- Arrow pulse animations

### Semantic HTML
- Proper heading hierarchy
- Semantic button elements via motion.div click handlers

## Performance Optimizations

1. **Transform-based animations**: All motion uses `transform` and `opacity` for GPU acceleration
2. **AnimatePresence**: Efficient mount/unmount transitions
3. **CSS-in-JS scoping**: Styles are component-scoped to prevent conflicts
4. **Conditional rendering**: Empty state only renders when needed

## Customization

### Changing Colors
Modify the CSS custom properties in the style blocks:
```css
/* Primary cyan */
rgb(6, 182, 212)

/* Accent violet */
rgb(139, 92, 246)

/* Background slate */
rgba(15, 23, 42, 0.7)
```

### Animation Speed
Adjust durations in motion components:
```tsx
whileHover={{
  scale: 1.03,
  y: -4,
  transition: { duration: 0.25 } // Change this
}}
```

### Grid Layout
Modify media query breakpoint:
```css
@media (max-width: 768px) { /* Adjust breakpoint */
  .challenges-grid {
    grid-template-columns: 1fr;
  }
}
```

## Dependencies

- `react` (>= 18.0.0)
- `framer-motion` (>= 10.0.0)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 15+
- All modern browsers with CSS Grid and backdrop-filter support

## Known Limitations

- Backdrop blur may have reduced quality on some browsers/devices
- Scan line effects are disabled when `prefers-reduced-motion` is enabled
- Very long challenge titles may overflow on small screens (consider truncation)

## Future Enhancements

- [ ] Search/filter functionality
- [ ] Sort by difficulty
- [ ] Completion status indicators
- [ ] Personal best WPM display per challenge
- [ ] Lock indicators for premium challenges
- [ ] Favorite/bookmark system
