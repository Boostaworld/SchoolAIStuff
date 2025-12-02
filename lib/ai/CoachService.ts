import { GoogleGenAI } from "@google/genai";
import { KeyStat, EnhancedTypingSession } from '../../types';

/**
 * Get Gemini API key from environment
 */
const getGeminiKey = (): string => {
  const viteKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY)
    || (typeof import.meta !== 'undefined' && (import.meta as any).env?.GEMINI_API_KEY);
  const nodeKey = (typeof process !== 'undefined' && (process as any).env?.GEMINI_API_KEY)
    || (typeof process !== 'undefined' && (process as any).env?.API_KEY);
  return viteKey || nodeKey || '';
};

export type DrillType = 'SPEED_DRILL' | 'PRECISION_DRILL' | 'METRONOME_MODE' | 'BALANCED_DRILL';

/**
 * CoachService - AI-Powered Typing Coach
 *
 * Provides personalized typing drills and performance analysis using Gemini AI.
 * Focuses on weak keys, accuracy improvement, and rhythm training.
 */
export class CoachService {
  /**
   * Generate a personalized 50-word typing drill
   * Focuses on keys with <70% accuracy
   *
   * @param weakKeys - Array of key statistics showing weak performance
   * @returns Plain English drill text (no code blocks)
   */
  static async generateDrill(weakKeys: KeyStat[]): Promise<string> {
    const apiKey = getGeminiKey();
    if (!apiKey) {
      console.warn('Gemini API key missing, returning default drill');
      return 'The quick brown fox jumps over the lazy dog. Practice makes perfect with consistent rhythm and accuracy.';
    }

    // Find keys with < 70% accuracy
    const problemKeys = weakKeys
      .filter(k => k.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy) // Worst first
      .map(k => k.key)
      .slice(0, 3); // Focus on top 3 worst keys

    // If no weak keys, generate a speed drill
    if (problemKeys.length === 0) {
      return this.generateSpeedDrill();
    }

    const prompt = `
Generate a 50-word typing drill (plain English, no code or special formatting) that focuses on improving accuracy for the keys: ${problemKeys.join(', ')}.

Requirements:
- Exactly 50 words (count carefully)
- Use common, natural words that contain these letters frequently
- Natural sentence structure (not just random word lists)
- Intermediate difficulty vocabulary
- Avoid contractions, numbers, or special characters
- Make it engaging and meaningful

Example for keys 'P', 'Q': "The equipment quality depends on proper preparation. Unique techniques require practice and patience. Quick performance improvements happen when people apply persistent effort."

Return ONLY the drill text, no explanations or extra formatting.
    `.trim();

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: 'You are a professional typing coach. Generate focused, natural-language typing drills.',
          temperature: 0.8, // More creative for varied drills
          maxOutputTokens: 200
        }
      });

      const drillText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!drillText || drillText.length < 20) {
        throw new Error('Invalid drill text returned');
      }

      // Remove any code blocks or markdown formatting if present
      const cleanText = drillText
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/`/g, '') // Remove inline code
        .replace(/\*\*/g, '') // Remove bold
        .replace(/\*/g, '') // Remove italic
        .replace(/^#.*$/gm, '') // Remove headers
        .trim();

      return cleanText || 'The quick brown fox jumps over the lazy dog. Practice makes perfect with consistent rhythm and accuracy.';

    } catch (error) {
      console.error('Drill generation error:', error);
      return this.generateSpeedDrill();
    }
  }

  /**
   * Generate a speed-focused drill for users with high accuracy
   */
  private static async generateSpeedDrill(): Promise<string> {
    const apiKey = getGeminiKey();
    if (!apiKey) {
      return 'Speed drills focus on quick, common words. Type fast and maintain your excellent accuracy. Every word counts.';
    }

    const prompt = `
Generate a 50-word speed drill for an advanced typist with excellent accuracy.

Requirements:
- Exactly 50 words of common, short words (3-6 letters average)
- Natural sentences, not just word lists
- Fast-paced, energetic content
- No special characters or numbers
- Plain English only

Example: "Quick brown cats jump over lazy dogs daily. Fast typing requires smooth hand movements and consistent practice. Speed builds when accuracy stays high."

Return ONLY the drill text.
    `.trim();

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: 'You are a professional typing coach specializing in speed training.',
          temperature: 0.7,
          maxOutputTokens: 150
        }
      });

      const drillText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return drillText?.replace(/```[\s\S]*?```/g, '').replace(/`/g, '').trim()
        || 'Speed drills focus on quick, common words. Type fast and maintain your excellent accuracy. Every word counts.';

    } catch (error) {
      console.error('Speed drill generation error:', error);
      return 'Speed drills focus on quick, common words. Type fast and maintain your excellent accuracy. Every word counts.';
    }
  }

  /**
   * Analyze typing session performance and recommend drill type
   *
   * Logic:
   * - SPEED_DRILL if accuracy > 95% (user is proficient, focus on speed)
   * - PRECISION_DRILL if accuracy < 80% (focus on accuracy first)
   * - METRONOME_MODE if rhythm score < 60% (erratic typing rhythm)
   * - BALANCED_DRILL otherwise
   *
   * @param session - Enhanced typing session with accuracy and rhythm data
   * @returns Recommended drill type
   */
  static analyzePerformance(session: EnhancedTypingSession): DrillType {
    const { accuracy, rhythmScore } = session;

    // High accuracy - focus on speed
    if (accuracy > 95) {
      return 'SPEED_DRILL';
    }

    // Low accuracy - focus on precision
    if (accuracy < 80) {
      return 'PRECISION_DRILL';
    }

    // Erratic rhythm - focus on consistency
    if (rhythmScore !== undefined && rhythmScore < 60) {
      return 'METRONOME_MODE';
    }

    // Balanced performance
    return 'BALANCED_DRILL';
  }

  /**
   * Generate drill recommendation message
   *
   * @param drillType - The recommended drill type
   * @param session - The typing session data
   * @returns Human-readable recommendation
   */
  static getDrillRecommendation(drillType: DrillType, session: EnhancedTypingSession): string {
    switch (drillType) {
      case 'SPEED_DRILL':
        return `Excellent accuracy (${session.accuracy.toFixed(1)}%)! Let's focus on building speed. Try sprints with common words.`;

      case 'PRECISION_DRILL':
        return `Accuracy at ${session.accuracy.toFixed(1)}% needs work. Slow down and focus on hitting the right keys. Speed will follow.`;

      case 'METRONOME_MODE':
        return `Your rhythm is inconsistent (score: ${session.rhythmScore?.toFixed(0) || 'N/A'}). Try typing to a steady beat to build muscle memory.`;

      case 'BALANCED_DRILL':
        return `You're progressing well! Let's balance speed and accuracy with varied practice drills.`;

      default:
        return 'Keep practicing! Consistency is key to improvement.';
    }
  }

  /**
   * Calculate WPM target for next drill based on current performance
   *
   * @param recentSessions - Array of recent typing sessions
   * @returns Recommended target WPM for next practice
   */
  static calculateTargetWpm(recentSessions: EnhancedTypingSession[]): number {
    if (!recentSessions || recentSessions.length === 0) {
      return 40; // Default beginner target
    }

    // Calculate average WPM from last 5 sessions
    const recent = recentSessions.slice(-5);
    const avgWpm = recent.reduce((sum, s) => sum + s.wpm, 0) / recent.length;

    // Calculate average accuracy
    const avgAccuracy = recent.reduce((sum, s) => sum + s.accuracy, 0) / recent.length;

    // If accuracy is high (>90%), suggest pushing speed
    if (avgAccuracy > 90) {
      return Math.ceil(avgWpm * 1.1); // 10% faster
    }

    // If accuracy is low (<80%), suggest slowing down
    if (avgAccuracy < 80) {
      return Math.ceil(avgWpm * 0.9); // 10% slower
    }

    // Otherwise, maintain current pace
    return Math.ceil(avgWpm);
  }

  /**
   * Identify weak keys from typing statistics
   *
   * @param keyStats - Map of key characters to their statistics
   * @param threshold - Accuracy threshold (default 70%)
   * @returns Array of weak keys sorted by accuracy (worst first)
   */
  static identifyWeakKeys(keyStats: Record<string, KeyStat>, threshold: number = 70): KeyStat[] {
    return Object.entries(keyStats)
      .map(([key, stats]) => ({
        key,
        ...stats
      }))
      .filter(stat => stat.accuracy < threshold)
      .sort((a, b) => a.accuracy - b.accuracy); // Worst first
  }
}
