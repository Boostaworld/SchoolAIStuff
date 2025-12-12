// =============================================
// POKER AI - Gemini-Powered Decision Making
// =============================================

import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";
import { PokerGamePlayer, PokerActionType, AIDifficulty } from './types';

// Get API key (same logic as gemini.ts)
const getApiKey = () => {
    const viteKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
        (typeof import.meta !== 'undefined' && (import.meta as any).env?.GEMINI_API_KEY);
    const nodeKey = (typeof process !== 'undefined' && (process as any).env?.GEMINI_API_KEY) ||
        (typeof process !== 'undefined' && (process as any).env?.API_KEY);
    return viteKey || nodeKey || '';
};

// =============================================
// RATE LIMITING SYSTEM
// =============================================

interface QueuedRequest {
    execute: () => Promise<AIDecision>;
    resolve: (value: AIDecision) => void;
    reject: (error: any) => void;
}

class AIRequestQueue {
    private queue: QueuedRequest[] = [];
    private processing: boolean = false;
    private lastRequestTime: number = 0;
    private readonly MIN_REQUEST_INTERVAL = 5000; // 5 seconds between requests

    async enqueue(requestFn: () => Promise<AIDecision>): Promise<AIDecision> {
        return new Promise((resolve, reject) => {
            this.queue.push({ execute: requestFn, resolve, reject });
            this.processQueue();
        });
    }

    private async processQueue() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;

        while (this.queue.length > 0) {
            const request = this.queue.shift()!;

            // Enforce minimum delay between requests
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
                const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
                console.log(`⏱️ Rate limiting: waiting ${delay}ms before next AI request`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            try {
                this.lastRequestTime = Date.now();
                const result = await request.execute();
                request.resolve(result);
            } catch (error) {
                request.reject(error);
            }
        }

        this.processing = false;
    }
}

// Global queue instance
const aiRequestQueue = new AIRequestQueue();

// =============================================
// EXPONENTIAL BACKOFF RETRY
// =============================================

async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 2000
): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            const isRateLimit = error?.message?.includes('429') || error?.message?.includes('quota');
            const isLastAttempt = attempt === maxRetries - 1;

            if (!isRateLimit || isLastAttempt) {
                throw error;
            }

            const delay = baseDelay * Math.pow(2, attempt); // Exponential: 2s, 4s, 8s
            console.log(`⏳ Rate limit hit, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Max retries exceeded');
}

export interface PokerGameState {
    potAmount: number;
    currentRound: string; // 'pre_flop', 'flop', 'turn', 'river'
    communityCards: string[]; // e.g., ['Ah', 'Ks', '10d']
    highestBet: number;
    bigBlind: number;
    players: Array<{
        name: string;
        chips: number;
        currentBet: number;
        isFolded: boolean;
        isAllIn: boolean;
        isAI: boolean;
    }>;
}

export interface AIDecision {
    action: PokerActionType;
    amount: number;
    reasoning: string;
}

// =============================================
// MODEL POOLS BY DIFFICULTY
// =============================================

const MODEL_POOLS: Record<AIDifficulty | 'expert_god', string[]> = {
    // NOVICE: High-limit "lite" models - fast, cheap, unlimited RPD
    'novice': [
        'gemini-2.5-flash-lite',  // 4K RPM, Unlimited RPD ⭐
        'gemini-2.0-flash-lite',  // 4K RPM, Unlimited RPD ⭐
        'gemini-2.0-flash',       // 2K RPM, Unlimited RPD
    ],
    // INTERMEDIATE: Mix of flash variants for variety
    'intermediate': [
        'gemini-2.5-flash',       // 1K RPM, 10K RPD - Good balance
        'gemini-2.5-flash-lite',  // 4K RPM, Unlimited RPD
        'gemini-2.0-flash',       // 2K RPM, Unlimited RPD
        'gemini-2.0-flash-lite',  // 4K RPM, Unlimited RPD
    ],
    // EXPERT: Premium models for smarter play
    'expert': [
        'gemini-2.5-pro',         // 150 RPM, 10K RPD - Smart
        'gemini-2.5-flash',       // 1K RPM, 10K RPD - Backup
        'gemini-2.0-flash-exp',   // 10 RPM - Experimental
    ],
    // GOD MODE: Best models with reliable JSON output
    'expert_god': [
        'gemini-2.5-pro',         // Most powerful
        'gemini-2.5-flash',       // Fast + smart
        'gemini-2.0-flash',       // Reliable fallback
    ]
};

/**
 * Selects a random model from the pool for the given difficulty
 */
function selectModel(difficulty: AIDifficulty | 'expert_god'): string {
    const pool = MODEL_POOLS[difficulty];
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
}

/**
 * Makes an intelligent poker decision using Gemini AI.
 *
 * @param aiPlayer - The AI player making the decision
 * @param holeCards - AI's hole cards (e.g., ['Ah', 'Ks'])
 * @param gameState - Current game state
 * @param difficulty - AI difficulty level
 * @param useGodMode - Whether to use Gemini 3 Pro (requires permission)
 */
export const makePokerDecision = async (
    aiPlayer: PokerGamePlayer,
    holeCards: any[], // PokerCard objects or strings
    gameState: PokerGameState,
    difficulty: AIDifficulty = 'intermediate',
    useGodMode: boolean = false
): Promise<AIDecision> => {
    // Enqueue the request to prevent rate limiting
    return aiRequestQueue.enqueue(async () => {
        return makePokerDecisionInternal(aiPlayer, holeCards, gameState, difficulty, useGodMode);
    });
};

/**
 * Internal function that makes the actual API call (with retry logic)
 */
async function makePokerDecisionInternal(
    aiPlayer: PokerGamePlayer,
    holeCards: any[],
    gameState: PokerGameState,
    difficulty: AIDifficulty,
    useGodMode: boolean = false
): Promise<AIDecision> {
    const apiKey = getApiKey();

    // Fallback to basic logic if no API key
    if (!apiKey) {
        console.warn('⚠️ No API key for Poker AI, using basic fallback');
        return makeBasicDecision(aiPlayer, gameState);
    }

    const ai = new GoogleGenAI({ apiKey });

    // Select model based on difficulty and god mode
    const effectiveDifficulty = useGodMode ? 'expert_god' : difficulty;
    const selectedModel = selectModel(effectiveDifficulty);
    const botName = aiPlayer.ai_name || `Player ${aiPlayer.position}`;
    console.log(`🎲 ${botName} using model: ${selectedModel} (difficulty: ${effectiveDifficulty})`);

    // Format hole cards for the prompt
    const holeCardsStr = holeCards.map(c => {
        if (typeof c === 'string') return c;
        return `${c.rank}${c.suit}`;
    }).join(', ');

    // Format community cards
    const communityCardsStr = gameState.communityCards.length > 0
        ? gameState.communityCards.join(', ')
        : 'None (Pre-Flop)';

    // Calculate call amount
    const callAmount = gameState.highestBet - aiPlayer.current_bet;
    const canCheck = callAmount <= 0;
    const potOdds = callAmount > 0 ? (callAmount / (gameState.potAmount + callAmount)) * 100 : 0;

    // Build difficulty-specific personality - ALL MORE AGGRESSIVE
    const difficultyPrompts: Record<AIDifficulty | 'expert_god', string> = {
        'novice': `You are a LOOSE-PASSIVE beginner poker player who LOVES to play hands:
- You RARELY fold - you like to see flops and stay in hands
- You call most bets because you're curious to see the cards
- You almost never fold pre-flop unless you have absolute garbage (2-7 offsuit)
- You get excited about any pair, any face card, or any suited cards
- You prefer calling or checking over folding
- Only fold if facing a HUGE bet with nothing`,
        'intermediate': `You are a LOOSE-AGGRESSIVE poker player who likes action:
- You play many hands and like to see flops
- You bluff occasionally and semi-bluff with draws
- You raise with strong hands and sometimes with medium hands
- You rarely fold pre-flop - you like to gamble a bit
- You only fold post-flop with absolute nothing facing big bets
- You prefer raises and calls over folds`,
        'expert': `You are an AGGRESSIVE professional poker player:
- You apply maximum pressure with bets and raises
- You bluff smartly with good timing
- You rarely fold - you fight for pots
- You raise frequently to put pressure on opponents
- You 3-bet pre-flop with a wide range
- You only fold when you're clearly beat and the math doesn't work
- You mix in raises even with medium hands to keep opponents guessing`,
        'expert_god': `You are THE ULTIMATE POKER AI - an UNBEATABLE world-class poker master powered by Gemini 3 Pro:
- You calculate pot odds, implied odds, and expected value with PERFECT precision
- You read betting patterns and exploit weaknesses RUTHLESSLY
- You employ optimal game theory (GTO) mixed with exploitative play
- You balance your ranges PERFECTLY - opponents can't read you
- You apply ICM (Independent Chip Model) pressure when appropriate
- You use advanced concepts: blockers, range construction, multi-street planning
- You bluff at EXACTLY the right frequency to maximize EV
- You NEVER make mistakes - every decision is mathematically optimal
- You are RELENTLESS and UNSTOPPABLE - a true poker deity`
    };

    const prompt = `You are playing Texas Hold'em Poker as "${aiPlayer.ai_name || 'AI Player'}"${useGodMode ? ' 🔥 [GOD MODE - GEMINI 3 PRO]' : ''}.

${difficultyPrompts[effectiveDifficulty]}

CURRENT SITUATION:
- Your Hole Cards: ${holeCardsStr}
- Community Cards: ${communityCardsStr}
- Round: ${gameState.currentRound.replace('_', ' ').toUpperCase()}
- Pot: ${gameState.potAmount} chips
- Your Chips: ${aiPlayer.chips}
- Your Current Bet: ${aiPlayer.current_bet}
- Highest Bet on Table: ${gameState.highestBet}
- Call Amount: ${callAmount}
- Pot Odds: ${potOdds.toFixed(1)}%
- Can Check: ${canCheck}

OPPONENTS:
${gameState.players.filter(p => p.name !== aiPlayer.ai_name && !p.isFolded).map(p =>
        `- ${p.name}: ${p.chips} chips, bet ${p.currentBet}${p.isAllIn ? ' (ALL-IN)' : ''}`
    ).join('\n')}

FOLDED: ${gameState.players.filter(p => p.isFolded).map(p => p.name).join(', ') || 'None'}

YOUR OPTIONS:
${canCheck ? '- CHECK (bet 0)' : ''}
${callAmount > 0 && aiPlayer.chips >= callAmount ? `- CALL (${callAmount} chips)` : ''}
- FOLD (give up hand)
${aiPlayer.chips > gameState.highestBet ? `- RAISE (min: ${gameState.highestBet + gameState.bigBlind}, max: ${aiPlayer.chips})` : ''}
${aiPlayer.chips <= callAmount ? `- ALL-IN (${aiPlayer.chips} chips)` : ''}

DECIDE your action. Return ONLY a JSON object with NO other text, NO explanation:
{"action": "fold" | "check" | "call" | "raise" | "all_in", "amount": number, "reasoning": "brief"}
Do NOT include chain-of-thought, analysis, or any text outside the JSON.`;

    try {
        // Wrap API call with exponential backoff retry
        const response = await retryWithBackoff(async () => {
            return await ai.models.generateContent({
                model: selectedModel,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json",
                    // Enforce a strict schema so the model must return valid JSON
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            action: { type: Type.STRING, enum: ['fold', 'check', 'call', 'raise', 'all_in'] },
                            amount: { type: Type.NUMBER },
                            reasoning: { type: Type.STRING },
                        },
                        required: ['action', 'amount', 'reasoning'],
                        propertyOrdering: ['action', 'amount', 'reasoning']
                    },
                    temperature: useGodMode ? 0.1 : difficulty === 'novice' ? 0.8 : difficulty === 'expert' ? 0.2 : 0.5,
                    maxOutputTokens: 400,
                    stopSequences: ['}'] // encourage clean JSON close
                }
            });
        });

        const primaryCandidate = response.candidates?.[0];
        const finishReason = primaryCandidate?.finishReason;
        let text = primaryCandidate?.content?.parts?.[0]?.text || (response as any).text?.trim?.();
        if (!text || (finishReason && finishReason !== 'STOP')) {
            console.warn('AI response incomplete, retrying with compact prompt.', { finishReason });
            const compactPrompt = `Texas Hold'em. JSON only. Hole cards: ${holeCardsStr}. Community: ${communityCardsStr}. Round: ${gameState.currentRound}. Pot: ${gameState.potAmount}. Highest bet: ${gameState.highestBet}. Call: ${callAmount}. Stack: ${aiPlayer.chips}. Can check: ${canCheck}. Respond JSON: {"action": "...", "amount": number, "reasoning": "brief"} (no extra text).`;
            const retry = await ai.models.generateContent({
                model: selectedModel,
                contents: [{ role: 'user', parts: [{ text: compactPrompt }] }],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            action: { type: Type.STRING, enum: ['fold', 'check', 'call', 'raise', 'all_in'] },
                            amount: { type: Type.NUMBER },
                            reasoning: { type: Type.STRING },
                        },
                        required: ['action', 'amount', 'reasoning'],
                        propertyOrdering: ['action', 'amount', 'reasoning']
                    },
                    temperature: useGodMode ? 0.1 : difficulty === 'novice' ? 0.8 : difficulty === 'expert' ? 0.2 : 0.5,
                    maxOutputTokens: 200,
                    stopSequences: ['}']
                }
            });
            text = retry.candidates?.[0]?.content?.parts?.[0]?.text || (retry as any).text?.trim?.();
        }
        if (!text) {
            console.error('Empty AI response after retry, using fallback. Response:', JSON.stringify(response, null, 2));
            return makeBasicDecision(aiPlayer, gameState);
        }

        // Try to extract JSON from response if it contains extra text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            text = jsonMatch[0];
        } else {
            console.warn('ƒsÿ‹,? AI response lacked JSON, using fallback.', text);
            return makeBasicDecision(aiPlayer, gameState);
        }

        const decision = JSON.parse(text) as AIDecision;

        // Validate and sanitize the decision
        const validActions: PokerActionType[] = ['fold', 'check', 'call', 'raise', 'all_in'];
        if (!validActions.includes(decision.action)) {
            decision.action = canCheck ? 'check' : 'fold';
        }

        // Validate amounts - IMPORTANT: Cap to available chips
        if (decision.action === 'call') {
            // Cap call to available chips - if can't afford, switch to all-in
            if (callAmount > aiPlayer.chips) {
                decision.action = 'all_in';
                decision.amount = Math.max(0, aiPlayer.chips);
            } else {
                decision.amount = callAmount;
            }
        } else if (decision.action === 'check' || decision.action === 'fold') {
            decision.amount = 0;
        } else if (decision.action === 'raise') {
            const minRaise = gameState.highestBet + gameState.bigBlind;
            const maxRaise = aiPlayer.chips;
            // If can't afford min raise, switch to all-in or call
            if (maxRaise < minRaise) {
                decision.action = 'all_in';
                decision.amount = Math.max(0, aiPlayer.chips);
            } else {
                decision.amount = Math.max(minRaise, Math.min(decision.amount, maxRaise));
            }
        } else if (decision.action === 'all_in') {
            // All-in must be positive (remaining chips)
            decision.amount = Math.max(0, aiPlayer.chips);
        }

        console.log(`🤖 AI Decision (${difficulty}): ${decision.action} ${decision.amount} - ${decision.reasoning}`);
        return decision;

    } catch (error: any) {
        console.error('❌ AI decision error:', error.message || error);
        console.warn('⚠️ Falling back to basic AI logic');
        return makeBasicDecision(aiPlayer, gameState);
    }
}

/**
 * Basic fallback decision when API is unavailable.
 */
function makeBasicDecision(aiPlayer: PokerGamePlayer, gameState: PokerGameState): AIDecision {
    const callAmount = Math.max(0, gameState.highestBet - aiPlayer.current_bet);
    const canCheck = callAmount <= 0;
    const stack = aiPlayer.chips;
    const minRaise = Math.max(gameState.highestBet + gameState.bigBlind, gameState.highestBet + 1);

    // Helper to clamp a desired total bet into a legal raise/all-in
    const resolveRaiseTarget = (targetTotal: number) => {
        const clamped = Math.min(Math.max(targetTotal, minRaise), stack + aiPlayer.current_bet);
        return clamped;
    };

    // If broke or tiny stack, default to all-in or fold logic
    if (stack <= 0) {
        return { action: 'fold', amount: 0, reasoning: 'No chips left.' };
    }

    if (canCheck) {
        // With no pressure, be semi-aggressive ~40% of the time to grow pots
        const shouldRaise = stack > gameState.bigBlind * 4 && Math.random() < 0.4;
        if (!shouldRaise) {
            return { action: 'check', amount: 0, reasoning: 'Free check.' };
        }

        const targetTotal = gameState.highestBet + gameState.bigBlind * 2;
        return {
            action: 'raise',
            amount: resolveRaiseTarget(targetTotal),
            reasoning: 'Pressing the pot after a free check opportunity.'
        };
    }

    // Facing a bet
    if (callAmount >= stack) {
        // Short stack facing a bet: shove
        return { action: 'all_in', amount: stack, reasoning: 'Short-stacked, shoving over a bet.' };
    }

    // Aggressive branch ~35% when we have room to raise
    const canRaise = stack + aiPlayer.current_bet > minRaise && stack > callAmount * 2;
    if (canRaise && Math.random() < 0.35) {
        const targetTotal = gameState.highestBet + Math.max(gameState.bigBlind * 2, callAmount * 2);
        return {
            action: 'raise',
            amount: resolveRaiseTarget(targetTotal),
            reasoning: 'Applying pressure with a raise.'
        };
    }

    // Default: call to continue
    return { action: 'call', amount: callAmount, reasoning: 'Calling to continue.' };
}





