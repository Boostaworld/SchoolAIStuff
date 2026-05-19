// lib/ai/neuralync.ts
// NEURALYNC - Progressive Model Unlock System
// Docs: /docs/ai-system/06-additional-features.md#part-3

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface UnlockRequirement {
    type: 'interactions' | 'days_active' | 'teacher_approval';
    current: number;
    required: number;
    description: string;
    progress: number;  // 0-1
}

export interface UnlockStatus {
    modelId: string;
    displayName: string;
    isUnlocked: boolean;
    unlockedVia?: string;
    unlockedAt?: Date;
    requirements?: UnlockRequirement[];
}

export interface UserActivityStats {
    totalAiInteractions: number;
    daysActive: number;
    orbitPoints: number;
    firstActiveDate: Date | null;
    lastActiveDate: Date | null;
}

// ============================================================================
// Service
// ============================================================================

export class NeuralyncService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
        );
    }

    /**
     * Get unlock status for a specific model
     */
    async getUnlockStatus(userId: string, modelId: string): Promise<UnlockStatus> {
        // Check if already unlocked
        const { data: unlock } = await this.supabase
            .from('user_model_unlocks')
            .select('*')
            .eq('user_id', userId)
            .eq('model_id', modelId)
            .single();

        // Get model display name
        const { data: model } = await this.supabase
            .from('ai_models')
            .select('display_name')
            .eq('id', modelId)
            .single();

        const displayName = model?.display_name || modelId;

        if (unlock) {
            return {
                modelId,
                displayName,
                isUnlocked: true,
                unlockedVia: unlock.unlock_method,
                unlockedAt: new Date(unlock.unlocked_at),
            };
        }

        // Get requirements
        const { data: req } = await this.supabase
            .from('model_unlock_requirements')
            .select('*')
            .eq('model_id', modelId)
            .single();

        if (!req || !req.is_locked_by_default) {
            return { modelId, displayName, isUnlocked: true };
        }

        // Build requirement progress
        const requirements = await this.buildRequirementProgress(userId, req);

        // Check if requirements are satisfied
        const requireAll = req.require_all;
        const satisfied = requireAll
            ? requirements.every(r => r.progress >= 1)
            : requirements.some(r => r.progress >= 1);

        if (satisfied) {
            const satisfiedReq = requirements.find(r => r.progress >= 1);
            // Auto-unlock
            await this.unlockModel(userId, modelId, satisfiedReq?.type ?? 'auto');
            return {
                modelId,
                displayName,
                isUnlocked: true,
                unlockedVia: satisfiedReq?.type,
                unlockedAt: new Date(),
            };
        }

        return {
            modelId,
            displayName,
            isUnlocked: false,
            requirements,
        };
    }

    /**
     * Get unlock status for all models
     */
    async getAllUnlockStatuses(userId: string): Promise<UnlockStatus[]> {
        const { data: models } = await this.supabase
            .from('ai_models')
            .select('id')
            .eq('is_active', true);

        if (!models) return [];

        return Promise.all(
            models.map(m => this.getUnlockStatus(userId, m.id))
        );
    }

    /**
     * Get user's activity stats
     */
    async getUserStats(userId: string): Promise<UserActivityStats> {
        const { data } = await this.supabase
            .from('user_activity_stats')
            .select('*')
            .eq('user_id', userId)
            .single();

        return {
            totalAiInteractions: data?.total_ai_interactions || 0,
            daysActive: data?.days_active || 0,
            orbitPoints: data?.orbit_points || 0,
            firstActiveDate: data?.first_active_date ? new Date(data.first_active_date) : null,
            lastActiveDate: data?.last_active_date ? new Date(data.last_active_date) : null,
        };
    }

    /**
     * Manually unlock a model (e.g., teacher approval)
     */
    async unlockModel(
        userId: string,
        modelId: string,
        method: string,
        approvedBy?: string
    ): Promise<void> {
        await this.supabase.from('user_model_unlocks').upsert({
            user_id: userId,
            model_id: modelId,
            unlock_method: method,
            unlocked_by: approvedBy,
            unlocked_at: new Date().toISOString(),
        }, { onConflict: 'user_id,model_id' });
    }

    /**
     * Revoke model access (for admin use)
     */
    async revokeUnlock(userId: string, modelId: string): Promise<void> {
        await this.supabase
            .from('user_model_unlocks')
            .delete()
            .eq('user_id', userId)
            .eq('model_id', modelId);
    }

    /**
     * Build progress for each requirement
     */
    private async buildRequirementProgress(
        userId: string,
        req: Record<string, unknown>
    ): Promise<UnlockRequirement[]> {
        const requirements: UnlockRequirement[] = [];
        const stats = await this.getUserStats(userId);

        // Interaction count requirement
        if (req.min_interactions) {
            const required = Number(req.min_interactions);
            requirements.push({
                type: 'interactions',
                current: stats.totalAiInteractions,
                required,
                description: `Complete ${required} AI interactions`,
                progress: Math.min(1, stats.totalAiInteractions / required),
            });
        }

        // Days active requirement
        if (req.min_days_active) {
            const required = Number(req.min_days_active);
            requirements.push({
                type: 'days_active',
                current: stats.daysActive,
                required,
                description: `Be active for ${required} days`,
                progress: Math.min(1, stats.daysActive / required),
            });
        }

        // Parse unlock_options for teacher approval
        const options = (req.unlock_options || []) as { type: string }[];
        for (const option of options) {
            if (option.type === 'teacher_approval') {
                requirements.push({
                    type: 'teacher_approval',
                    current: 0,
                    required: 1,
                    description: 'Get teacher approval',
                    progress: 0,
                });
            }
        }

        return requirements;
    }
}

// Export singleton
export const neuralyncService = new NeuralyncService();
