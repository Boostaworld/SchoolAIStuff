import { useEffect, useMemo, useState } from 'react';
import { RaceBot } from '../types';

export interface BotPositions {
  [botId: string]: number; // 0-100 percentage
}

/**
 * useBotRacing Hook
 *
 * Time-based deterministic interpolation for bot racers.
 * Features:
 * - Formula: position = ((now - startTime) / targetDuration) * 100
 * - Humanization: 100ms reaction delay at start
 * - Fatigue: 70% speed reduction after 30 seconds
 * - 20fps position updates (50ms intervals)
 * - Smooth, deterministic movement (no random setInterval drift)
 *
 * @param bots - Array of RaceBot configurations
 * @param raceStartTime - Epoch timestamp (ms) when race started
 * @param textLength - Total character count of the challenge
 * @returns Object mapping bot IDs to their current position (0-100%)
 */
export function useBotRacing(
  bots: RaceBot[],
  raceStartTime: number,
  textLength: number
): BotPositions {
  const [botPositions, setBotPositions] = useState<BotPositions>({});

  useEffect(() => {
    if (!bots.length || !raceStartTime || !textLength) {
      setBotPositions({});
      return;
    }

    let animationFrameId: number;
    let lastUpdateTime = 0;
    const UPDATE_INTERVAL = 50; // 20fps (1000ms / 20 = 50ms)

    /**
     * Calculate bot position with humanization factors
     */
    const calculatePosition = (bot: RaceBot, elapsedSeconds: number): number => {
      // Reaction delay: bots don't start moving for 100ms
      const REACTION_DELAY = 0.1; // seconds
      if (elapsedSeconds < REACTION_DELAY) {
        return 0;
      }

      const adjustedElapsed = elapsedSeconds - REACTION_DELAY;

      // Base typing speed calculation
      // Formula: (WPM / 60) = characters per second (assuming 5 chars per word)
      const charsPerSecond = (bot.targetWpm * 5) / 60;

      // Apply fatigue factor after 30 seconds
      const FATIGUE_THRESHOLD = 30; // seconds
      const FATIGUE_MULTIPLIER = 0.7; // 30% slowdown
      let speedMultiplier = 1.0;

      if (adjustedElapsed > FATIGUE_THRESHOLD) {
        speedMultiplier = FATIGUE_MULTIPLIER;
      }

      // Apply personality modifiers
      let personalityModifier = 1.0;
      switch (bot.personality) {
        case 'aggressive':
          // Fast start, maintains pace
          personalityModifier = 1.05;
          break;
        case 'steady':
          // Consistent pace throughout
          personalityModifier = 1.0;
          break;
        case 'cautious':
          // Slower but very accurate
          personalityModifier = 0.95;
          break;
      }

      // Calculate characters typed
      const charsTyped = charsPerSecond * adjustedElapsed * speedMultiplier * personalityModifier;

      // Convert to percentage (0-100)
      const percentage = Math.min(100, (charsTyped / textLength) * 100);

      return percentage;
    };

    /**
     * Update loop - runs at ~20fps
     */
    const updatePositions = (timestamp: number) => {
      // Throttle updates to 20fps
      if (timestamp - lastUpdateTime < UPDATE_INTERVAL) {
        animationFrameId = requestAnimationFrame(updatePositions);
        return;
      }

      lastUpdateTime = timestamp;

      // Calculate elapsed time since race start
      const now = Date.now();
      const elapsed = (now - raceStartTime) / 1000; // convert to seconds

      // Calculate each bot's position
      const newPositions: BotPositions = {};
      bots.forEach(bot => {
        const position = calculatePosition(bot, elapsed);
        newPositions[bot.id] = Math.round(position * 100) / 100; // Round to 2 decimals
      });

      setBotPositions(newPositions);

      // Continue animation loop
      animationFrameId = requestAnimationFrame(updatePositions);
    };

    // Start the animation loop
    animationFrameId = requestAnimationFrame(updatePositions);

    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [bots, raceStartTime, textLength]);

  return botPositions;
}

/**
 * Helper function to match bots to user's skill level
 * Auto-selects 3 bots within ±10 WPM of user's average
 * Ensures personality diversity (1 aggressive, 1 steady, 1 cautious)
 *
 * @param allBots - Full list of available bots
 * @param userAverageWpm - User's average typing speed
 * @returns Array of 3 matched bots
 */
export function matchBotsToUser(allBots: RaceBot[], userAverageWpm: number): RaceBot[] {
  const WPM_THRESHOLD = 10;

  // Filter bots within ±10 WPM
  const matchedBots = allBots.filter(
    bot => Math.abs(bot.targetWpm - userAverageWpm) <= WPM_THRESHOLD
  );

  // If we have enough matched bots, try to get personality diversity
  if (matchedBots.length >= 3) {
    const aggressive = matchedBots.find(b => b.personality === 'aggressive');
    const steady = matchedBots.find(b => b.personality === 'steady');
    const cautious = matchedBots.find(b => b.personality === 'cautious');

    if (aggressive && steady && cautious) {
      return [aggressive, steady, cautious];
    }

    // Fallback: just take first 3 matched
    return matchedBots.slice(0, 3);
  }

  // Not enough matched bots, find 3 closest by WPM distance
  const sortedByDistance = [...allBots].sort(
    (a, b) =>
      Math.abs(a.targetWpm - userAverageWpm) - Math.abs(b.targetWpm - userAverageWpm)
  );

  const selectedBots = sortedByDistance.slice(0, 3);

  // Try to ensure personality diversity if possible
  const personalities = new Set(selectedBots.map(b => b.personality));
  if (personalities.size < 3) {
    // Replace duplicate personalities if better options exist
    const aggressive = sortedByDistance.find(b => b.personality === 'aggressive');
    const steady = sortedByDistance.find(b => b.personality === 'steady');
    const cautious = sortedByDistance.find(b => b.personality === 'cautious');

    if (aggressive && steady && cautious) {
      return [aggressive, steady, cautious];
    }
  }

  return selectedBots;
}
