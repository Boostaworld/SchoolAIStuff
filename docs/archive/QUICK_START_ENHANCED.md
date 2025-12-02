# 🚀 QUICK START - Enhanced Typing System

## Step 1: Install Dependencies

```bash
npm install @google/generative-ai
```

## Step 2: Apply Database Migrations

1. Open [Supabase Dashboard](https://app.supabase.com) → Your Project
2. Go to SQL Editor
3. Copy **entire contents** of `phase3_enhanced_migrations.sql`
4. Paste and click "Run"
5. Verify success: Should see "Success. No rows returned"

## Step 3: Update Dashboard Component

Replace the training view in `components/Dashboard/Dashboard.tsx`:

```tsx
import EnhancedChallengeSelector from '../Training/EnhancedChallengeSelector';
import ImprovedTypingTerminal from '../Training/ImprovedTypingTerminal';
import RacingTerminal from '../Training/RacingTerminal';
import AIGeneratorModal from '../Training/AIGeneratorModal';
import ResultsHistory from '../Training/ResultsHistory';

// Inside Dashboard component:
const [showAIModal, setShowAIModal] = useState(false);
const [showRaceMode, setShowRaceMode] = useState(false);
const [showHistory, setShowHistory] = useState(false);

// In training view:
{activeView === 'training' && (
  <div className="absolute inset-0 p-6 overflow-y-auto">
    {/* Toggle buttons */}
    <div className="flex gap-3 mb-6">
      <button
        onClick={() => setShowHistory(false)}
        className={showHistory ? 'btn-secondary' : 'btn-primary'}
      >
        CHALLENGES
      </button>
      <button
        onClick={() => setShowHistory(true)}
        className={showHistory ? 'btn-primary' : 'btn-secondary'}
      >
        HISTORY
      </button>
    </div>

    {!showHistory ? (
      !activeChallenge && !showRaceMode ? (
        <EnhancedChallengeSelector
          challenges={typingChallenges}
          onSelect={(id) => startChallenge(id)}
          onGenerateCustom={() => setShowAIModal(true)}
        />
      ) : showRaceMode ? (
        <RacingTerminal
          challenge={activeChallenge!}
          botRanges={[35, 65, 85]}
          onComplete={(results) => {
            console.log('Race complete:', results);
            setShowRaceMode(false);
            startChallenge('');
          }}
          onExit={() => {
            setShowRaceMode(false);
            startChallenge('');
          }}
        />
      ) : (
        <ImprovedTypingTerminal
          challenge={activeChallenge!}
          onComplete={(results) => {
            console.log('Challenge complete:', results);
            startChallenge('');
          }}
          onExit={() => startChallenge('')}
        />
      )
    ) : (
      <ResultsHistory />
    )}

    {/* AI Modal */}
    {showAIModal && (
      <AIGeneratorModal
        onClose={() => setShowAIModal(false)}
        onGenerated={(challengeId) => {
          setShowAIModal(false);
          fetchChallenges(); // Reload challenges
          startChallenge(challengeId); // Start immediately
        }}
      />
    )}
  </div>
)}
```

## Step 4: Add Race Mode Button (Optional)

In the `EnhancedChallengeSelector`, add a button to trigger race mode:

```tsx
<button
  onClick={() => setShowRaceMode(true)}
  className="btn-race"
>
  🏎️ RACE MODE
</button>
```

## Step 5: Test Features

### Test AI Generation:
1. Click "AI GENERATE" button
2. Select category: Programming
3. Select difficulty: Medium
4. Select length: Medium
5. Add custom prompt: "Focus on React hooks"
6. Click "GENERATE CHALLENGE"
7. Wait 3-5 seconds
8. New challenge appears in list

### Test Improved Typing:
1. Start any challenge
2. Type normally
3. Make a mistake mid-word
4. Press backspace to fix it
5. Verify: Only incorrect char was red, can continue

### Test Racing Mode:
1. Click any challenge card (or Race Mode button)
2. Watch 3-2-1 countdown
3. Start typing
4. Watch bots progress in parallel
5. Complete the race
6. See final rankings

### Test History:
1. Complete 2-3 challenges
2. Click "HISTORY" tab
3. Verify sessions appear
4. Check stats cards update
5. Try period filters (Today/Week/Month/All)

## Troubleshooting

### "AI Generate fails"
- Check `.env.local` has `GEMINI_API_KEY`
- Verify API key is valid (test in Google AI Studio)
- Check browser console for error messages

### "Challenges don't filter"
- Verify `category`, `length_type`, `difficulty` columns exist in database
- Run: `SELECT * FROM typing_challenges LIMIT 1;` to check schema

### "Bots don't move"
- Check browser console for JavaScript errors
- Verify `RacingTerminal` component imported correctly
- Ensure state updates not blocked by React strict mode

### "History shows empty"
- Complete at least one challenge first
- Check `typing_history` table exists: `SELECT * FROM typing_history;`
- Verify RLS policies allow reading own history

### "Duplicate messages still happening"
- Restart dev server: `npm run dev`
- Clear browser cache
- Check Realtime subscription has skip logic for own messages

## Performance Tips

1. **Lazy load components**:
```tsx
const RacingTerminal = lazy(() => import('../Training/RacingTerminal'));
```

2. **Memoize challenge list**:
```tsx
const filteredChallenges = useMemo(() => {
  return challenges.filter(...);
}, [challenges, filters]);
```

3. **Debounce typing input**:
```tsx
const debouncedWPM = useDebounce(calculateWPM(), 500);
```

4. **Optimize bot simulation**:
```tsx
// Use requestAnimationFrame instead of setInterval
useEffect(() => {
  let frameId: number;
  const updateBots = () => {
    setBotProgress(...);
    frameId = requestAnimationFrame(updateBots);
  };
  frameId = requestAnimationFrame(updateBots);
  return () => cancelAnimationFrame(frameId);
}, []);
```

## Customization Ideas

### Add More Bot Tiers:
```tsx
const BOT_PRESETS = {
  'turtle': [15, 25, 35],
  'normal': [35, 65, 85],
  'pro': [70, 95, 120],
  'godlike': [100, 130, 160]
};
```

### Custom Category Colors:
```tsx
const CATEGORY_COLORS = {
  'MyCategory': {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.3)]'
  }
};
```

### Personalized Challenges:
```tsx
// In AIGeneratorModal
const handleGeneratePersonalized = async () => {
  const weakKeys = Object.entries(typingHeatmap)
    .filter(([_, stat]) => stat.accuracy < 70)
    .map(([key]) => key)
    .slice(0, 5);

  const challenge = await generatePersonalizedChallenge(weakKeys, 'Medium');
  // Save and start...
};
```

## Next Steps

1. ✅ Test all features
2. ✅ Apply enhanced migrations
3. ✅ Generate your first AI challenge
4. ✅ Race against bots
5. ✅ Review your history
6. 📝 Plan multiplayer features
7. 🎨 Customize colors/themes
8. 📊 Add more analytics
9. 🏆 Implement achievements
10. 🌐 Deploy to production

## Support

If you encounter issues:
1. Check `ENHANCED_FEATURES.md` for detailed docs
2. Review `phase3_enhanced_migrations.sql` for schema
3. Inspect browser console for errors
4. Test in incognito mode (rule out extensions)
5. Verify Supabase connection is active

## Resources

- **Gemini API Docs**: https://ai.google.dev/docs
- **Framer Motion**: https://www.framer.com/motion/
- **Supabase Realtime**: https://supabase.com/docs/guides/realtime
- **Tailwind CSS**: https://tailwindcss.com/docs

---

**Happy Typing! 🚀⌨️**
