// lib/ai/creditForge.ts
// CREDIT FORGE - Orbit Point Buyback System
// Docs: /docs/ai-system/05-credit-forge.md

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ChronolockService } from './chronolock';

// ============================================================================
// Types
// ============================================================================

export interface BuybackRate {
    modelId: string;
    tier: string;
    pointsPer10Cents: number;
    isActive: boolean;
    maxBuybackPerCycle: number;
}

export interface BuybackTransaction {
    id: string;
    userId: string;
    modelId: string;
    pointsSpent: number;
    creditsReceived: number;
    exchangeRate: number;
    discountApplied: number;
    createdAt: Date;
}

export interface BuybackResult {
    success: boolean;
    transaction?: BuybackTransaction;
    newPointsBalance?: number;
    newCreditsBalance?: number;
    error?: string;
}

export interface BuybackQuote {
    modelId: string;
    pointsRequired: number;
    creditsToReceive: number;
    exchangeRate: number;
    activeDiscount?: {
        name: string;
        percent: number;
    };
    canAfford: boolean;
    currentPointBalance: number;
    maxPurchasable: number;
}

// ============================================================================
// Service
// ============================================================================

export class CreditForgeService {
    private supabase: SupabaseClient;
    private chronolock: ChronolockService;

    constructor() {
        this.supabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
        );
        this.chronolock = new ChronolockService();
    }

    /**
     * Get all available buyback rates
     */
    async getRates(): Promise<BuybackRate[]> {
        const { data, error } = await this.supabase
            .from('buyback_rates')
            .select('*')
            .eq('is_active', true);

        if (error) throw error;

        return (data || []).map(r => ({
            modelId: r.model_id,
            tier: r.tier,
            pointsPer10Cents: r.points_per_10_cents,
            isActive: r.is_active,
            maxBuybackPerCycle: Number(r.max_buyback_per_cycle),
        }));
    }

    /**
     * Get a quote for how many points needed for X credits
     */
    async getQuote(userId: string, modelId: string, creditsAmount: number): Promise<BuybackQuote> {
        // Get the rate
        const { data: rate } = await this.supabase
            .from('buyback_rates')
            .select('*')
            .eq('model_id', modelId)
            .single();

        if (!rate) {
            throw new Error(`No buyback rate found for model ${modelId}`);
        }

        // Get user's current point balance
        const { data: stats } = await this.supabase
            .from('user_activity_stats')
            .select('orbit_points')
            .eq('user_id', userId)
            .single();

        const currentBalance = stats?.orbit_points || 0;

        // Calculate points required (X points per $0.10)
        // So for $1.00 credit, need X * 10 points
        const baseRate = rate.points_per_10_cents;
        const pointsRequired = Math.ceil(creditsAmount * 10 * baseRate);

        // Check max buyback limit
        const cycle = await this.chronolock.getOrCreateCycle(userId, modelId);
        const alreadyBoughtThisCycle = cycle.buybackCreditsAdded;
        const remainingBuyback = Math.max(0, rate.max_buyback_per_cycle - alreadyBoughtThisCycle);

        const effectiveCredits = Math.min(creditsAmount, remainingBuyback);
        const effectivePoints = Math.ceil(effectiveCredits * 10 * baseRate);

        // Calculate max purchasable with current balance
        const maxCreditsFromPoints = (currentBalance / (baseRate * 10));
        const maxPurchasable = Math.min(maxCreditsFromPoints, remainingBuyback);

        return {
            modelId,
            pointsRequired: effectivePoints,
            creditsToReceive: effectiveCredits,
            exchangeRate: baseRate,
            canAfford: currentBalance >= effectivePoints,
            currentPointBalance: currentBalance,
            maxPurchasable: Math.floor(maxPurchasable * 100) / 100, // Round to 2 decimal
        };
    }

    /**
     * Execute a buyback transaction
     */
    async buyCredits(
        userId: string,
        modelId: string,
        creditsAmount: number
    ): Promise<BuybackResult> {
        // Get quote (validates availability)
        const quote = await this.getQuote(userId, modelId, creditsAmount);

        if (!quote.canAfford) {
            return {
                success: false,
                error: `Not enough Orbit Points. Need ${quote.pointsRequired}, have ${quote.currentPointBalance}`,
            };
        }

        if (quote.creditsToReceive <= 0) {
            return {
                success: false,
                error: 'Buyback limit reached for this cycle',
            };
        }

        const effectiveCredits = Math.min(creditsAmount, quote.maxPurchasable);
        const pointsToSpend = Math.ceil(effectiveCredits * 10 * quote.exchangeRate);

        // Start transaction
        try {
            // 1. Deduct points
            const { data: stats } = await this.supabase
                .from('user_activity_stats')
                .select('orbit_points')
                .eq('user_id', userId)
                .single();

            const pointsBefore = stats?.orbit_points || 0;
            const pointsAfter = pointsBefore - pointsToSpend;

            await this.supabase.from('user_activity_stats').update({
                orbit_points: pointsAfter,
                updated_at: new Date().toISOString(),
            }).eq('user_id', userId);

            // 2. Log point transaction
            await this.supabase.from('orbit_point_transactions').insert({
                user_id: userId,
                amount: -pointsToSpend,
                balance_before: pointsBefore,
                balance_after: pointsAfter,
                source: 'buyback',
                source_metadata: {
                    model_id: modelId,
                    credits_received: effectiveCredits,
                },
            });

            // 3. Add credits to cycle
            const cycle = await this.chronolock.getOrCreateCycle(userId, modelId);
            const creditsBefore = cycle.creditsRemaining;

            const { data: updatedCycle, error: cycleError } = await this.supabase
                .from('user_model_cycles')
                .update({
                    credits_used: Math.max(0, cycle.creditsUsed - effectiveCredits), // Reduce used = increase available
                    buyback_credits_added: cycle.buybackCreditsAdded + effectiveCredits,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', cycle.id)
                .select()
                .single();

            if (cycleError) throw cycleError;

            const creditsAfter = Number(updatedCycle.credits_remaining);

            // 4. Log credit transaction
            await this.supabase.from('credit_transactions').insert({
                user_id: userId,
                model_id: modelId,
                cycle_id: cycle.id,
                transaction_type: 'buyback',
                amount: effectiveCredits,
                balance_before: creditsBefore,
                balance_after: creditsAfter,
                metadata: {
                    points_spent: pointsToSpend,
                    exchange_rate: quote.exchangeRate,
                },
            });

            // 5. Log buyback transaction
            const { data: txn } = await this.supabase.from('buyback_transactions').insert({
                user_id: userId,
                model_id: modelId,
                cycle_id: cycle.id,
                points_spent: pointsToSpend,
                points_balance_before: pointsBefore,
                points_balance_after: pointsAfter,
                credits_received: effectiveCredits,
                credits_balance_before: creditsBefore,
                credits_balance_after: creditsAfter,
                exchange_rate: quote.exchangeRate,
                discount_applied: 0,
            }).select().single();

            return {
                success: true,
                transaction: txn ? {
                    id: txn.id,
                    userId: txn.user_id,
                    modelId: txn.model_id,
                    pointsSpent: txn.points_spent,
                    creditsReceived: Number(txn.credits_received),
                    exchangeRate: txn.exchange_rate,
                    discountApplied: Number(txn.discount_applied),
                    createdAt: new Date(txn.created_at),
                } : undefined,
                newPointsBalance: pointsAfter,
                newCreditsBalance: creditsAfter,
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Get user's buyback history
     */
    async getHistory(userId: string, limit = 20): Promise<BuybackTransaction[]> {
        const { data } = await this.supabase
            .from('buyback_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        return (data || []).map(t => ({
            id: t.id,
            userId: t.user_id,
            modelId: t.model_id,
            pointsSpent: t.points_spent,
            creditsReceived: Number(t.credits_received),
            exchangeRate: t.exchange_rate,
            discountApplied: Number(t.discount_applied),
            createdAt: new Date(t.created_at),
        }));
    }

    /**
     * Get user's current point balance
     */
    async getPointBalance(userId: string): Promise<number> {
        const { data } = await this.supabase
            .from('user_activity_stats')
            .select('orbit_points')
            .eq('user_id', userId)
            .single();

        return data?.orbit_points || 0;
    }
}

// Export singleton
export const creditForgeService = new CreditForgeService();
