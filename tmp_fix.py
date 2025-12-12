from pathlib import Path

text_path = Path('store/useOrbitStore.ts')
text = text_path.read_text(encoding='utf-8', errors='ignore')
anchor = text.find('adminDeletePokerGame')
start = text.find('  processAITurn: async', anchor)
end = text.find('  performPokerAction:', start)
if start == -1 or end == -1:
    raise SystemExit('markers not found')

new_block = """
  processAITurn: async (gameId: string, aiPlayerId: string) => {
    const { activePokerGame, currentUser } = get();
    if (!activePokerGame || activePokerGame.game.id !== gameId) return;

    // Guard against stale calls if the turn already moved
    if (activePokerGame.game.current_turn_player_id !== aiPlayerId) {
      return;
    }

    // God Mode: Either explicitly set via `expert_god` difficulty, OR expert + permission
    const hasGemini3Permission = currentUser?.unlocked_models?.includes('gemini-3-pro');
    const isExplicitGodMode = activePokerGame.game.ai_difficulty === 'expert_god';
    const useGodMode = isExplicitGodMode || (hasGemini3Permission && activePokerGame.game.ai_difficulty === 'expert');

    // Short delay for realism (reduced since we have multi-model support with high RPM)
    const delay = useGodMode ? 2000 :
      activePokerGame.game.ai_difficulty === 'expert' ? 1500 :
        activePokerGame.game.ai_difficulty === 'novice' ? 1000 : 1200;

    console.log(`AI turn delay: ${delay / 1000}s${useGodMode ? ' (GOD MODE)' : ''}`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Re-check the turn after the delay to avoid acting out of turn
    const latestState = get().activePokerGame;
    if (!latestState || latestState.game.id !== gameId || latestState.game.current_turn_player_id !== aiPlayerId) {
      return;
    }

    const currentPlayer = latestState.players.find(p => p.id === aiPlayerId);
    if (!currentPlayer || !currentPlayer.hole_cards) return;

    // Build game state for AI
    const gameState = {
      potAmount: latestState.game.pot_amount,
      currentRound: latestState.game.current_round || 'pre_flop',
      communityCards: (latestState.game.community_cards || []).map((c: any) =>
        typeof c === 'string' ? c : `${c.rank}${c.suit}`
      ),
      highestBet: Math.max(...latestState.players.map(p => p.current_bet || 0)),
      bigBlind: latestState.game.big_blind,
      players: latestState.players.map(p => ({
        name: p.username || p.ai_name || 'Unknown',
        chips: p.chips,
        currentBet: p.current_bet || 0,
        isFolded: p.is_folded || false,
        isAllIn: p.is_all_in || false,
        isAI: p.is_ai || false
      }))
    };

    // Import the AI decision maker dynamically to avoid circular deps
    const { makePokerDecision } = await import('../lib/poker/aiPlayer');

    // Hard timeout + fallback so the turn never hangs on a slow model
    const callAmount = Math.max(0, gameState.highestBet - (currentPlayer.current_bet || 0));
    const decision = await Promise.race([
      makePokerDecision(
        currentPlayer,
        currentPlayer.hole_cards,
        gameState,
        latestState.game.ai_difficulty || 'intermediate',
        useGodMode
      ),
      new Promise((resolve) => setTimeout(() => resolve({
        action: callAmount === 0 ? 'check' : 'call',
        amount: callAmount,
        reasoning: 'Timeout fallback'
      }), 7000))
    ]) as { action: any; amount: number; reasoning?: string };

    // Store reasoning for UI display
    set({
      lastPokerAIReasoning: {
        playerId: currentPlayer.id,
        name: currentPlayer.ai_name || currentPlayer.username || 'AI',
        action: decision.action,
        amount: decision.amount,
        reasoning: decision.reasoning || '',
        round: gameState.currentRound
      }
    });

    // Final guard to avoid firing if turn already moved while thinking
    if (get().activePokerGame?.game.current_turn_player_id !== aiPlayerId) {
      return;
    }

    // Execute the decision
    console.log(`AI ${currentPlayer.ai_name} plays: ${decision.action} ${decision.amount}`);
    await get().performPokerAction(gameId, decision.action, decision.amount, currentPlayer.id);
  },
"""

text_path.write_text(text[:start] + new_block + text[end:], encoding='utf-8')
