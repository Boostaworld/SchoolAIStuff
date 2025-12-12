Poker updates (latest session)
------------------------------
- Hardened Gemini AI decisions to return valid JSON with retries and schema enforcement; added compact retry prompt to avoid empty responses.
- Fixed Texas Hold’em flow to keep all seated players between hands: funded players post blinds, busted seats stay folded/all-in until rebuy; per-hand state respects folded/all-in flags; action order uses funded players only.
- Blocked mid-hand rebuys to prevent chip-reset exploits; rebuys only between hands.
- Restored AI reasoning display: store captures each AI bot’s reasoning and the table UI shows a short reasoning overlay after the bot acts.
