// lib/ai/chronolock.ts
// CHRONOLOCK Protocol - Per-Model 72-Hour Credit Cycles
// Docs: /docs/ai-system/01-chronolock-protocol.md

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface ModelCycle {
    id: string;
    userId: string;
    modelId: string;
    cycleStartedAt: Date;
    cycleEndsAt: Date;
    creditsLimit: number;
    creditsUsed: number;
    creditsRemaining: number;
    overdraftLimit: number;
    overdraftUsed: number;
    buybackCreditsAdded: number;
    carriedDebt: number;
}

export interface CycleStatus {
    cycle: ModelCycle;
    isActive: boolean;
    isExpired: boolean;
    isBlocked: boolean;        // No credits remaining (including overdraft)
    inOverdraft: boolean;      // Using overdraft buffer
    timeRemaining: number;     // Milliseconds until reset
    percentUsed: number;
    effectiveRemaining: number; // Credits + overdraft available
}

export interface DeductionResult {
    success: boolean;
    creditsDeducted: number;
    usedOverdraft: boolean;
    overdraftAmount: number;
    newBalance: number;
    error?: string;
}

// ============================================================================
// Credit Limits by Tier
// ============================================================================

const CREDIT_LIMITS: Record<string, number> = {
    flash: 2.00,      // $2.00 per 72h cycle for Flash models
    standard: 5.00,   // $5.00 per 72h cycle for Pro models
    premium: 5.00,    // $5.00 per 72h cycle for Premium models
};

const CYCLE_DURATION_MS = 72 * 60 * 60 * 1000; // 72 hours

// ============================================================================
// Service
// ============================================================================

export class ChronolockService {
    private supabase: SupabaseClient;

    constructor(supabaseUrl?: string, supabaseKey?: string) {
        this.supabase = createClient(
            supabaseUrl || import.meta.env.VITE_SUPABASE_URL,
            supabaseKey || import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
        );
    }

    /**
     * Get or create a cycle for a user+model combination
     */
    async getOrCreateCycle(userId: string, modelId: string): Promise<ModelCycle> {
        // Try to get existing active cycle
        const { data: existingCycle } = await this.supabase
            .from('user_model_cycles')
            .select('*')
            .eq('user_id', userId)
            .eq('model_id', modelId)
            .single();

        if (existingCycle) {
            const cycle = this.mapToCycle(existingCycle);

            // Check if cycle has expired and needs reset
            if (new Date() >= cycle.cycleEndsAt) {
                return await this.resetCycle(cycle);
            }

            return cycle;
        }

        // Create new cycle
        return await this.createCycle(userId, modelId);
    }

    /**
     * Get cycle status with computed fields
     */
    async getCycleStatus(userId: string, modelId: string): Promise<CycleStatus> {
        const cycle = await this.getOrCreateCycle(userId, modelId);
        const now = new Date();

        const isExpired = now >= cycle.cycleEndsAt;
        const effectiveRemaining = cycle.creditsRemaining + (cycle.overdraftLimit - cycle.overdraftUsed);
        const isBlocked = effectiveRemaining <= 0;
        const inOverdraft = cycle.creditsRemaining <= 0 && cycle.overdraftUsed > 0;

        return {
            cycle,
            isActive: !isExpired,
            isExpired,
            isBlocked,
            inOverdraft,
            timeRemaining: Math.max(0, cycle.cycleEndsAt.getTime() - now.getTime()),
            percentUsed: cycle.creditsLimit > 0 ? (cycle.creditsUsed / cycle.creditsLimit) * 100 : 0,
            effectiveRemaining,
        };
    }

    /**
     * Deduct credits for AI usage (atomic operation)
     */
    async deductCredits(
        userId: string,
        modelId: string,
        amount: number,
        metadata?: { inputTokens?: number; outputTokens?: number }
    ): Promise<DeductionResult> {
        const status = await this.getCycleStatus(userId, modelId);

        if (status.isExpired) {
            // Auto-reset expired cycle
            await this.resetCycle(status.cycle);
            return this.deductCredits(userId, modelId, amount, metadata);
        }

        if (status.isBlocked) {
            return {
                success: false,
                creditsDeducted: 0,
                usedOverdraft: false,
                overdraftAmount: 0,
                newBalance: status.cycle.creditsRemaining,
                error: `CHRONOLOCK Active — Resets in ${this.formatTimeRemaining(status.timeRemaining)}`,
            };
        }

        const cycle = status.cycle;
        let creditsToDeduct = amount;
        let overdraftToUse = 0;
        let usedOverdraft = false;

        // Check if we need to dip into overdraft
        if (creditsToDeduct > cycle.creditsRemaining) {
            const overflow = creditsToDeduct - cycle.creditsRemaining;
            const availableOverdraft = cycle.overdraftLimit - cycle.overdraftUsed;

            if (overflow > availableOverdraft) {
                return {
                    success: false,
                    creditsDeducted: 0,
                    usedOverdraft: false,
                    overdraftAmount: 0,
                    newBalance: cycle.creditsRemaining,
                    error: `Insufficient credits. Request: $${amount.toFixed(4)}, Available: $${status.effectiveRemaining.toFixed(4)}`,
                };
            }

            overdraftToUse = overflow;
            usedOverdraft = true;
        }

        // Perform atomic update
        const { data, error } = await this.supabase
            .from('user_model_cycles')
            .update({
                credits_used: cycle.creditsUsed + creditsToDeduct,
                overdraft_used: cycle.overdraftUsed + overdraftToUse,
                updated_at: new Date().toISOString(),
            })
            .eq('id', cycle.id)
            .select()
            .single();

        if (error) {
            return {
                success: false,
                creditsDeducted: 0,
                usedOverdraft: false,
                overdraftAmount: 0,
                newBalance: cycle.creditsRemaining,
                error: error.message,
            };
        }

        // Log transaction
        await this.logTransaction(userId, modelId, cycle.id, {
            type: 'usage',
            amount: -creditsToDeduct,
            balanceBefore: cycle.creditsRemaining,
            balanceAfter: data.credits_remaining,
            metadata: {
                ...metadata,
                overdraftUsed: overdraftToUse,
            },
        });

        return {
            success: true,
            creditsDeducted: creditsToDeduct,
            usedOverdraft,
            overdraftAmount: overdraftToUse,
            newBalance: data.credits_remaining,
        };
    }

    /**
     * Create a new cycle for user+model
     */
    private async createCycle(userId: string, modelId: string): Promise<ModelCycle> {
        // Get model tier to determine credit limit
        const { data: model } = await this.supabase
            .from('ai_models')
            .select('tier')
            .eq('id', modelId)
            .single();

        const tier = model?.tier || 'standard';
        const creditsLimit = CREDIT_LIMITS[tier] || CREDIT_LIMITS.standard;

        const now = new Date();
        const cycleEndsAt = new Date(now.getTime() + CYCLE_DURATION_MS);

        const { data, error } = await this.supabase
            .from('user_model_cycles')
            .insert({
                user_id: userId,
                model_id: modelId,
                cycle_started_at: now.toISOString(),
                cycle_ends_at: cycleEndsAt.toISOString(),
                credits_limit: creditsLimit,
                credits_used: 0,
                overdraft_used: 0,
                buyback_credits_added: 0,
                carried_debt: 0,
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapToCycle(data);
    }

    /**
     * Reset an expired cycle (carries over overdraft debt)
     */
    private async resetCycle(oldCycle: ModelCycle): Promise<ModelCycle> {
        // Calculate debt to carry over
        const debtToCarry = oldCycle.overdraftUsed;

        // Get model tier
        const { data: model } = await this.supabase
            .from('ai_models')
            .select('tier')
            .eq('id', oldCycle.modelId)
            .single();

        const tier = model?.tier || 'standard';
        const newCreditsLimit = CREDIT_LIMITS[tier] || CREDIT_LIMITS.standard;

        const now = new Date();
        const cycleEndsAt = new Date(now.getTime() + CYCLE_DURATION_MS);

        // New credits after debt deduction
        const effectiveCredits = Math.max(0, newCreditsLimit - debtToCarry);

        const { data, error } = await this.supabase
            .from('user_model_cycles')
            .update({
                cycle_started_at: now.toISOString(),
                cycle_ends_at: cycleEndsAt.toISOString(),
                credits_limit: newCreditsLimit,
                credits_used: debtToCarry, // Start with debt already "used"
                overdraft_used: 0,
                buyback_credits_added: 0,
                carried_debt: debtToCarry,
                updated_at: now.toISOString(),
            })
            .eq('id', oldCycle.id)
            .select()
            .single();

        if (error) throw error;

        // Log the reset
        if (debtToCarry > 0) {
            await this.logTransaction(oldCycle.userId, oldCycle.modelId, oldCycle.id, {
                type: 'debt_carryover',
                amount: -debtToCarry,
                balanceBefore: newCreditsLimit,
                balanceAfter: effectiveCredits,
                metadata: { previousCycleDebt: debtToCarry },
            });
        }

        return this.mapToCycle(data);
    }

    /**
     * Log a credit transaction for audit
     */
    private async logTransaction(
        userId: string,
        modelId: string,
        cycleId: string,
        tx: {
            type: string;
            amount: number;
            balanceBefore: number;
            balanceAfter: number;
            metadata?: Record<string, unknown>;
        }
    ): Promise<void> {
        await this.supabase.from('credit_transactions').insert({
            user_id: userId,
            model_id: modelId,
            cycle_id: cycleId,
            transaction_type: tx.type,
            amount: tx.amount,
            balance_before: tx.balanceBefore,
            balance_after: tx.balanceAfter,
            input_tokens: tx.metadata?.inputTokens,
            output_tokens: tx.metadata?.outputTokens,
            metadata: tx.metadata || {},
        });
    }

    /**
     * Map database row to ModelCycle interface
     */
    private mapToCycle(row: Record<string, unknown>): ModelCycle {
        return {
            id: row.id as string,
            userId: row.user_id as string,
            modelId: row.model_id as string,
            cycleStartedAt: new Date(row.cycle_started_at as string),
            cycleEndsAt: new Date(row.cycle_ends_at as string),
            creditsLimit: Number(row.credits_limit),
            creditsUsed: Number(row.credits_used),
            creditsRemaining: Number(row.credits_remaining),
            overdraftLimit: Number(row.overdraft_limit),
            overdraftUsed: Number(row.overdraft_used),
            buybackCreditsAdded: Number(row.buyback_credits_added),
            carriedDebt: Number(row.carried_debt),
        };
    }

    /**
     * Format time remaining as human-readable string
     */
    private formatTimeRemaining(ms: number): string {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
}

// Export singleton instance
export const chronolockService = new ChronolockService();
