from pathlib import Path
p = Path('components/Economy/PassiveMiner.tsx')
text = p.read_text(encoding='utf-8')
start = text.find('async function handleClaim')
end = text.find('function formatTime', start)
if start == -1 or end == -1:
    raise SystemExit('bounds not found')
new_block = """async function handleClaim() {
    if (!canClaim || claiming) return;

    setClaiming(true);
    try {
      const res = await claimPassivePoints();
      if (!res.success) throw new Error(res.error || 'Mining failed');
      const pointsEarned = res.earned ?? 0;

      if (pointsEarned > 0) {
        toast.success(`ƒ>?‹,? Mined ${pointsEarned} orbit points!`);
        setUserPoints(prev => prev + pointsEarned);
        setLastClaim(new Date());
        setCanClaim(false);
      } else {
        toast.info('Mining cooldown active - Come back in 5 minutes!');
      }
    } catch (error) {
      console.error('Claim error:', error);
      toast.error(error.message or 'Mining failed - Please try again');
    } finally {
      setClaiming(false);
    }
  }

"""
text = text[:start] + new_block + text[end:]
p.write_text(text, encoding='utf-8')
