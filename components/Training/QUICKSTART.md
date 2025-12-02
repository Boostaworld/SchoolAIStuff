# ChallengeSelector Quick Start

Get up and running with the ChallengeSelector component in 60 seconds.

## Installation

No additional dependencies needed beyond your existing setup. Just ensure you have:
- `react` >= 18.0.0
- `framer-motion` >= 10.0.0

## Basic Usage

```tsx
import { ChallengeSelector } from './components/Training';
import { TypingChallenge } from './types';

function MyTrainingPage() {
  const challenges: TypingChallenge[] = [
    {
      id: '1',
      title: 'Terminal Basics',
      text_content: 'The quick brown fox jumps over the lazy dog.',
      difficulty: 'Easy',
      created_at: new Date().toISOString(),
    },
    // ... more challenges
  ];

  const handleSelect = (challengeId: string) => {
    console.log('Selected:', challengeId);
    // Navigate or start session
  };

  return (
    <ChallengeSelector
      challenges={challenges}
      onSelect={handleSelect}
    />
  );
}
```

## Visual Preview

```
╔═══════════════════════════════════════════════════════════════╗
║                    CHALLENGE SELECTOR                         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ┌─────────────────────┐  ┌─────────────────────┐           ║
║  │ ┌──┐         ┌──┐   │  │ ┌──┐         ┌──┐   │           ║
║  │                     │  │                     │           ║
║  │  Terminal Basics    │  │  Code Combat        │           ║
║  │  ___________        │  │  ___________        │           ║
║  │                     │  │                     │           ║
║  │  ⚡ EASY            │  │  🔥 MEDIUM          │           ║
║  │                     │  │                     │           ║
║  │  The quick brown... │  │  function fib(n)... │           ║
║  │                     │  │                     │           ║
║  │  >> SELECT          │  │  >> SELECT          │           ║
║  │                     │  │                     │           ║
║  │ ┌──┐         ┌──┐   │  │ ┌──┐         ┌──┐   │           ║
║  └─────────────────────┘  └─────────────────────┘           ║
║                                                               ║
║  ┌─────────────────────┐  ┌─────────────────────┐           ║
║  │ ┌──┐         ┌──┐   │  │ ┌──┐         ┌──┐   │           ║
║  │                     │  │                     │           ║
║  │  Elite Hacker       │  │  Speed Demon        │           ║
║  │  ___________        │  │  ___________        │           ║
║  │                     │  │                     │           ║
║  │  💀 HARD            │  │  ⚡ EASY            │           ║
║  │                     │  │                     │           ║
║  │  const handler =... │  │  Lorem ipsum dol... │           ║
║  │                     │  │                     │           ║
║  │  >> SELECT          │  │  >> SELECT          │           ║
║  │                     │  │                     │           ║
║  │ ┌──┐         ┌──┐   │  │ ┌──┐         ┌──┐   │           ║
║  └─────────────────────┘  └─────────────────────┘           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

## Props Reference

| Prop | Type | Description |
|------|------|-------------|
| `challenges` | `TypingChallenge[]` | Array of challenges to display |
| `onSelect` | `(id: string) => void` | Callback when challenge is clicked |

## Challenge Object Structure

```typescript
interface TypingChallenge {
  id: string;                          // Unique identifier
  title: string;                       // Display name
  text_content: string;                // Full challenge text
  difficulty: 'Easy' | 'Medium' | 'Hard'; // Difficulty level
  created_at: string;                  // ISO timestamp
}
```

## Common Use Cases

### 1. Fetching from API
```tsx
const [challenges, setChallenges] = useState<TypingChallenge[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchChallenges() {
    const response = await fetch('/api/challenges');
    const data = await response.json();
    setChallenges(data);
    setLoading(false);
  }
  fetchChallenges();
}, []);

if (loading) return <LoadingSpinner />;

return <ChallengeSelector challenges={challenges} onSelect={handleSelect} />;
```

### 2. Filtering by Difficulty
```tsx
const [filter, setFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');

const filteredChallenges = filter === 'All'
  ? challenges
  : challenges.filter(c => c.difficulty === filter);

return (
  <>
    <DifficultyFilter value={filter} onChange={setFilter} />
    <ChallengeSelector challenges={filteredChallenges} onSelect={handleSelect} />
  </>
);
```

### 3. Navigation Integration
```tsx
import { useNavigate } from 'react-router-dom';

function TrainingPage() {
  const navigate = useNavigate();

  const handleSelect = (challengeId: string) => {
    navigate(`/training/challenge/${challengeId}`);
  };

  return <ChallengeSelector challenges={challenges} onSelect={handleSelect} />;
}
```

### 4. State Management (Zustand)
```tsx
import { useStore } from '../store';

function TrainingPage() {
  const challenges = useStore(state => state.typingChallenges);
  const startChallenge = useStore(state => state.startTypingSession);

  return (
    <ChallengeSelector
      challenges={challenges}
      onSelect={startChallenge}
    />
  );
}
```

## Styling Customization

### Background Container
Wrap the component in a styled container:

```tsx
<div style={{
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  padding: '2rem'
}}>
  <ChallengeSelector challenges={challenges} onSelect={handleSelect} />
</div>
```

### Max Width Constraint
```tsx
<div style={{ maxWidth: '1200px', margin: '0 auto' }}>
  <ChallengeSelector challenges={challenges} onSelect={handleSelect} />
</div>
```

## Troubleshooting

### Cards Not Animating
Ensure framer-motion is installed:
```bash
npm install framer-motion
```

### Backdrop Blur Not Working
Some browsers have limited support. Check:
- Safari: Requires `-webkit-backdrop-filter`
- Firefox: Enable `layout.css.backdrop-filter.enabled` in about:config

### Type Errors
Ensure you're importing the correct TypingChallenge type:
```tsx
import { TypingChallenge } from './types';
```

### Empty State Showing Unexpectedly
Verify your challenges array is populated:
```tsx
console.log('Challenges:', challenges);
console.log('Length:', challenges.length);
```

## Performance Tips

### Large Lists
For 50+ challenges, consider pagination or virtual scrolling:
```tsx
const paginatedChallenges = challenges.slice(
  page * pageSize,
  (page + 1) * pageSize
);
```

### Memoization
Prevent unnecessary re-renders:
```tsx
const memoizedSelector = useMemo(() => (
  <ChallengeSelector challenges={challenges} onSelect={handleSelect} />
), [challenges, handleSelect]);
```

## Accessibility Testing

### Keyboard Navigation
- Tab through cards
- Press Enter or Space to select
- Ensure focus indicators are visible

### Screen Reader
- Read aloud with VoiceOver (Mac) or NVDA (Windows)
- Verify difficulty levels are announced
- Check card titles and previews are readable

### Color Contrast
Use browser DevTools to verify WCAG compliance:
- Chrome: Lighthouse audit
- Firefox: Accessibility inspector

## Next Steps

1. Check out the full component code: `ChallengeSelector.tsx`
2. Read design system details: `DESIGN.md`
3. View comprehensive docs: `README.md`
4. Run the example: `ChallengeSelector.example.tsx`

## File Structure

```
components/Training/
├── ChallengeSelector.tsx          # Main component
├── ChallengeSelector.example.tsx  # Usage example
├── ChallengeSelector.module.css   # Optional CSS modules
├── README.md                      # Full documentation
├── DESIGN.md                      # Design system details
├── QUICKSTART.md                  # This file
└── index.ts                       # Export barrel
```

## Questions?

- Component not rendering? Check console for errors
- Styling issues? Verify backdrop-filter browser support
- Animation glitches? Test with `prefers-reduced-motion` disabled
- Type errors? Ensure TypeScript is configured correctly

For advanced customization, refer to `DESIGN.md` for the complete design token system and visual effect catalog.
