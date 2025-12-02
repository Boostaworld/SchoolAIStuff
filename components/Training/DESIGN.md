# ChallengeSelector Design System

## Aesthetic Philosophy

The ChallengeSelector embodies an **authentic cyberpunk terminal aesthetic** that avoids generic AI design patterns. This component creates an immersive hacker experience through:

1. **Distinctive Typography**: JetBrains Mono creates genuine terminal authenticity
2. **Layered Depth**: Glassmorphism with strategic backdrop blur
3. **Dynamic Motion**: Purposeful animations that enhance, not distract
4. **Cyberpunk Color Theory**: Cyan/violet duality representing data streams and energy

## Visual Language

### Color Palette

```css
/* Primary Data Stream */
--cyan-primary: rgb(6, 182, 212);
--cyan-bright: rgb(103, 232, 249);
--cyan-muted: rgba(6, 182, 212, 0.6);
--cyan-border: rgba(6, 182, 212, 0.3);

/* Energy Accent */
--violet-accent: rgb(139, 92, 246);
--violet-glow: rgba(139, 92, 246, 0.3);

/* Terminal Background */
--slate-deep: rgba(15, 23, 42, 0.95);
--slate-mid: rgba(30, 41, 59, 0.85);
--slate-card: rgba(15, 23, 42, 0.7);

/* Difficulty Spectrum */
--emerald-easy: rgb(52, 211, 153);
--amber-medium: rgb(251, 191, 36);
--rose-hard: rgb(251, 113, 133);
```

### Typography Scale

```css
/* Display - Titles */
font-size: 1.125rem; /* 18px */
font-weight: 700;
letter-spacing: 0.02em;

/* Body - Preview Text */
font-size: 0.8125rem; /* 13px */
line-height: 1.6;

/* Label - Badges & Hints */
font-size: 0.75rem; /* 12px */
font-weight: 600;
letter-spacing: 0.05em;
text-transform: uppercase;

/* Monospace Family */
font-family: 'JetBrains Mono', 'Courier New', monospace;
```

### Spacing System

```css
/* Grid Gaps */
--gap-desktop: 1.5rem; /* 24px */
--gap-mobile: 1rem; /* 16px */

/* Card Padding */
--card-padding: 1.75rem; /* 28px */

/* Element Spacing */
--space-xs: 0.25rem; /* 4px */
--space-sm: 0.5rem; /* 8px */
--space-md: 0.75rem; /* 12px */
--space-lg: 1rem; /* 16px */
```

## Motion Design

### Animation Principles

1. **Purpose**: Every animation serves user understanding
2. **Natural Physics**: Spring-based easing for organic feel
3. **Performance**: GPU-accelerated transforms only
4. **Accessibility**: Respects prefers-reduced-motion

### Key Animations

#### Entrance Sequence
```typescript
// Staggered card entrance
variants={{
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.23, 1, 0.32, 1], // Custom spring
    },
  },
}}

// Stagger delay
transition: {
  staggerChildren: 0.08, // 80ms between cards
}
```

#### Hover Interaction
```typescript
whileHover={{
  scale: 1.03,      // Subtle scale increase
  y: -4,            // Lift effect
  transition: {
    duration: 0.25,
    ease: 'easeOut'
  },
}}
```

#### Tap Feedback
```typescript
whileTap={{
  scale: 0.98  // Subtle press-down
}}
```

### Scan Line Effect

Creates the iconic terminal scanning animation:

```css
.scan-line {
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(6, 182, 212, 0.03) 50%,
    transparent 100%
  );
  animation: scan-vertical 4s ease-in-out infinite;
}

@keyframes scan-vertical {
  0%, 100% { transform: translateY(-100%); }
  50% { transform: translateY(100%); }
}
```

## Component Anatomy

### Challenge Card Structure

```
┌─────────────────────────────────────┐
│ ┌──┐                         ┌──┐  │ ← Corner decorations
│ │  │                         │  │  │
│                                     │
│  Title Text _______________        │ ← Title + underline
│                                     │
│  ⚡ EASY                           │ ← Difficulty badge
│                                     │
│  Challenge preview text that       │
│  shows first 100 characters...     │ ← Preview text
│                                     │
│  >> SELECT ←                       │ ← Hover hint
│                                     │
│ ┌──┐                         ┌──┐  │
│ │  │                         │  │  │
└─────────────────────────────────────┘
   Glassmorphic card with glow border
```

### Empty State Structure

```
╔═══════════════════════════════════╗
║                                   ║
║   NO CHALLENGES AVAILABLE         ║ ← Glitch text
║   // CONTACT ADMIN                ║ ← Subtitle
║   _                               ║ ← Blinking cursor
║                                   ║
╚═══════════════════════════════════╝
     Terminal box with scan lines
```

## Visual Effects Catalog

### 1. Glassmorphism
```css
background: linear-gradient(
  135deg,
  rgba(15, 23, 42, 0.7) 0%,
  rgba(30, 41, 59, 0.5) 100%
);
backdrop-filter: blur(16px);
border: 1px solid rgba(6, 182, 212, 0.3);
```

### 2. Glow Effects
```css
/* Text glow */
text-shadow: 0 0 20px rgba(103, 232, 249, 0.3);

/* Box glow */
box-shadow:
  0 0 30px rgba(6, 182, 212, 0.15),
  inset 0 0 60px rgba(6, 182, 212, 0.03);
```

### 3. Border Animation
```css
/* Hover glow border */
.card-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(
    135deg,
    rgba(6, 182, 212, 0.2),
    rgba(139, 92, 246, 0.2)
  );
  filter: blur(8px);
  opacity: 0;
}

/* Activate on hover */
.card:hover .card-glow {
  opacity: 1;
}
```

### 4. Corner Decorations
```css
/* Terminal-style corners */
.corner {
  width: 12px;
  height: 12px;
  border: 1px solid rgba(6, 182, 212, 0.4);
}

/* Example: top-left */
.corner-tl {
  top: 8px;
  left: 8px;
  border-right: none;
  border-bottom: none;
}
```

### 5. Difficulty Badge Glow
```css
.badge-glow {
  position: absolute;
  inset: 0;
  border-radius: 100px;
  background-color: rgba(16, 185, 129, 0.4); /* Varies by difficulty */
  filter: blur(8px);
  opacity: 0;
  transition: opacity 0.3s;
}

.badge:hover .badge-glow {
  opacity: 0.6;
}
```

## Responsive Behavior

### Desktop (>768px)
- 2-column grid layout
- Larger gap spacing (1.5rem)
- Full hover effects enabled
- Corner decorations visible

### Mobile (≤768px)
- Single column layout
- Reduced gap spacing (1rem)
- Touch-friendly tap targets
- Maintained visual hierarchy

### Breakpoint Strategy
```css
@media (max-width: 768px) {
  .challenges-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
```

## Accessibility Features

### 1. Keyboard Navigation
- All cards are keyboard-accessible
- Focus states inherit hover styles
- Enter/Space activates selection

### 2. Screen Readers
- Semantic HTML structure
- Clear heading hierarchy
- Descriptive button labels

### 3. Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  /* Disable all animations */
  .scan-line,
  .card-scan-line,
  .terminal-cursor,
  .glitch-text,
  .hint-arrow {
    animation: none;
  }
}
```

### 4. Color Contrast
All text meets WCAG AA standards:
- Cyan text on slate: 7.2:1 ratio
- Badge text on backgrounds: 4.8:1+ ratio
- Preview text: 4.5:1 ratio

## Performance Optimizations

### 1. GPU Acceleration
```css
/* Only animate transform/opacity */
transform: translateY(-4px) scale(1.03);
opacity: 1;
will-change: transform; /* Use sparingly */
```

### 2. Lazy Animation Loading
```typescript
// Cards only animate when visible
initial="hidden"
animate="visible"
whileInView={{ opacity: 1 }}
```

### 3. Efficient Re-renders
- React.memo on ChallengeCard
- Stable callback references
- Minimal state updates

## Design Tokens

For consistent theming across Orbit OS:

```typescript
export const challengeSelectorTokens = {
  colors: {
    primary: 'rgb(6, 182, 212)',
    primaryBright: 'rgb(103, 232, 249)',
    accent: 'rgb(139, 92, 246)',
    background: 'rgba(15, 23, 42, 0.7)',
    border: 'rgba(6, 182, 212, 0.3)',
  },
  spacing: {
    cardPadding: '1.75rem',
    gridGap: '1.5rem',
  },
  animation: {
    duration: {
      fast: 200,
      normal: 400,
      slow: 600,
    },
    easing: {
      spring: [0.23, 1, 0.32, 1],
      smooth: 'ease-out',
    },
  },
  typography: {
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    sizes: {
      title: '1.125rem',
      body: '0.8125rem',
      label: '0.75rem',
    },
  },
};
```

## Implementation Notes

### Why Inline Styles?
The component uses inline styles (CSS-in-JS via style tags) for:
1. **Portability**: Zero external dependencies
2. **Scoping**: Automatic style isolation
3. **Co-location**: Styles live with component logic
4. **Dynamic**: Easy prop-based styling

### Alternative Approaches
For larger projects, consider:
- CSS Modules (provided as optional file)
- Styled-components
- Tailwind CSS
- Emotion

### Framer Motion Benefits
- Declarative animation syntax
- Gesture recognition
- Layout animations
- Orchestration via variants
- AnimatePresence for exit animations

## Testing Recommendations

### Visual Regression
- Screenshot tests for each difficulty level
- Empty state rendering
- Hover state capture
- Mobile/desktop layouts

### Interaction Tests
```typescript
// Click interaction
fireEvent.click(challengeCard);
expect(onSelect).toHaveBeenCalledWith('challenge-id');

// Keyboard navigation
fireEvent.keyDown(challengeCard, { key: 'Enter' });
expect(onSelect).toHaveBeenCalled();

// Hover state
fireEvent.mouseEnter(challengeCard);
expect(hoverHint).toBeVisible();
```

### Animation Tests
```typescript
// Check AnimatePresence triggers
await waitFor(() => {
  expect(emptyState).toBeInTheDocument();
});

// Verify stagger delay
const cards = screen.getAllByRole('button');
expect(cards[1]).toHaveStyle({
  animationDelay: '0.08s'
});
```

## Inspiration & References

This design draws from:
- **Blade Runner 2049**: Cyan/orange color theory
- **Cyberpunk 2077**: UI glassmorphism and scan lines
- **Hackers (1995)**: Terminal aesthetic authenticity
- **Tron Legacy**: Glowing accents and grid systems
- **Terminal emulators**: Cool Retro Term, Hyper, iTerm2

## Future Design Explorations

Potential enhancements while maintaining aesthetic:
1. **Holographic effects**: Iridescent gradients on badges
2. **Data stream particles**: Animated background elements
3. **Sound design**: Subtle terminal beeps on interaction
4. **Completion indicators**: Progress rings or checkmarks
5. **Leaderboard integration**: Top WPM display per challenge
6. **Lock animations**: Keyframe padlock for premium challenges
