// lib/ai/periodCheckin.ts
// Period Check-In Service - Activity-Based Point Earning
// Docs: /docs/ai-system/05-credit-forge.md

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface PeriodConfig {
    periodCount: number;
    periodSchedule: {
        period: number;
        startTime: string;  // "HH:MM" 24-hour format
        endTime: string;
    }[];
    fullDayThreshold: number;
    pointsPerPeriod: number;
    fullDayBonus: number;
}

export interface CheckinResult {
    periodPoints: number;
    periodNumber: number | null;
    fullDayBonusAwarded: boolean;
    totalPeriodsActive: number;
}

export interface DailyProgress {
    periodsActive: number[];
    totalPoints: number;
    fullDayBonusAwarded: boolean;
    currentPeriod: number | null;
}

// ============================================================================
// Default Config - 9 Period School Day
// ============================================================================

export const DEFAULT_PERIOD_SCHEDULE: PeriodConfig = {
    periodCount: 9,
    periodSchedule: [
        { period: 1, startTime: "08:00", endTime: "08:50" },
        { period: 2, startTime: "09:00", endTime: "09:50" },
        { period: 3, startTime: "10:00", endTime: "10:50" },
        { period: 4, startTime: "11:00", endTime: "11:50" },
        { period: 5, startTime: "12:00", endTime: "12:50" },  // Lunch period counts!
        { period: 6, startTime: "13:00", endTime: "13:50" },
        { period: 7, startTime: "14:00", endTime: "14:50" },
        { period: 8, startTime: "15:00", endTime: "15:50" },
        { period: 9, startTime: "16:00", endTime: "16:50" },  // After school
    ],
    fullDayThreshold: 8,  // Need 8/9 for bonus
    pointsPerPeriod: 10,
    fullDayBonus: 150,
};

// ============================================================================
// Service
// ============================================================================

export class PeriodCheckinService {
    private supabase: SupabaseClient;
    private config: PeriodConfig;

    constructor(config?: Partial<PeriodConfig>) {
        this.supabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
        );
        this.config = { ...DEFAULT_PERIOD_SCHEDULE, ...config };
    }

    /**
     * Record user activity and check if they qualify for period points
     */
    async recordActivity(
        userId: string,
        activityType: 'dm' | 'ai_query' | 'image_gen' | 'navigation' | 'interaction'
    ): Promise<CheckinResult> {
        const now = new Date();
        const currentPeriod = this.getCurrentPeriod(now);
        const today = this.getDateString(now);

        // Update last activity timestamp for mining
        await this.updateLastActivity(userId, now);

        // Increment AI interaction count if applicable
        if (activityType === 'ai_query' || activityType === 'image_gen') {
            await this.incrementInteractions(userId);
        }

        if (!currentPeriod) {
            // Outside school hours — no period points, but activity still counts for mining
            return {
                periodPoints: 0,
                periodNumber: null,
                fullDayBonusAwarded: false,
                totalPeriodsActive: 0,
            };
        }

        // Check if already checked in for this period today
        const alreadyCheckedIn = await this.hasCheckedIn(userId, currentPeriod, today);

        if (alreadyCheckedIn) {
            // Already checked in, just return current status
            const progress = await this.getDailyProgress(userId);
            return {
                periodPoints: 0,
                periodNumber: currentPeriod,
                fullDayBonusAwarded: false,
                totalPeriodsActive: progress.periodsActive.length,
            };
        }

        // Record check-in
        await this.supabase.from('period_checkins').insert({
            user_id: userId,
            period_number: currentPeriod,
            check_in_date: today,
            activity_type: activityType,
        });

        // Award period points
        await this.awardPoints(userId, this.config.pointsPerPeriod, 'period_checkin', {
            period: currentPeriod,
            activityType,
        });

        // Get updated progress
        const progress = await this.getDailyProgress(userId);
        let fullDayBonusAwarded = false;

        // Check for full day bonus (exactly at threshold to award once)
        if (progress.periodsActive.length === this.config.fullDayThreshold && !progress.fullDayBonusAwarded) {
            await this.awardPoints(userId, this.config.fullDayBonus, 'full_day_bonus', {
                periodsActive: progress.periodsActive.length,
            });

            // Mark bonus as awarded
            await this.supabase.from('daily_activity_summary').upsert({
                user_id: userId,
                summary_date: today,
                periods_active: progress.periodsActive.length,
                full_day_bonus_awarded: true,
                total_points_earned: (progress.totalPoints || 0) + this.config.pointsPerPeriod + this.config.fullDayBonus,
            }, { onConflict: 'user_id,summary_date' });

            fullDayBonusAwarded = true;
        } else {
            // Update summary without bonus
            await this.supabase.from('daily_activity_summary').upsert({
                user_id: userId,
                summary_date: today,
                periods_active: progress.periodsActive.length,
                total_points_earned: (progress.totalPoints || 0) + this.config.pointsPerPeriod,
            }, { onConflict: 'user_id,summary_date' });
        }

        return {
            periodPoints: this.config.pointsPerPeriod,
            periodNumber: currentPeriod,
            fullDayBonusAwarded,
            totalPeriodsActive: progress.periodsActive.length,
        };
    }

    /**
     * Get daily progress for a user
     */
    async getDailyProgress(userId: string): Promise<DailyProgress> {
        const today = this.getDateString(new Date());

        // Get today's check-ins
        const { data: checkins } = await this.supabase
            .from('period_checkins')
            .select('period_number')
            .eq('user_id', userId)
            .eq('check_in_date', today);

        // Get daily summary
        const { data: summary } = await this.supabase
            .from('daily_activity_summary')
            .select('*')
            .eq('user_id', userId)
            .eq('summary_date', today)
            .single();

        const periodsActive = checkins?.map(c => c.period_number) || [];

        return {
            periodsActive,
            totalPoints: summary?.total_points_earned || 0,
            fullDayBonusAwarded: summary?.full_day_bonus_awarded || false,
            currentPeriod: this.getCurrentPeriod(new Date()),
        };
    }

    /**
     * Get current period based on time
     */
    getCurrentPeriod(now: Date): number | null {
        const timeStr = now.toTimeString().slice(0, 5); // "HH:MM"

        for (const period of this.config.periodSchedule) {
            if (timeStr >= period.startTime && timeStr <= period.endTime) {
                return period.period;
            }
        }

        return null; // Outside all periods
    }

    /**
     * Check if user already checked in for this period today
     */
    private async hasCheckedIn(userId: string, period: number, date: string): Promise<boolean> {
        const { data } = await this.supabase
            .from('period_checkins')
            .select('id')
            .eq('user_id', userId)
            .eq('period_number', period)
            .eq('check_in_date', date)
            .single();

        return !!data;
    }

    /**
     * Award points to user
     */
    private async awardPoints(
        userId: string,
        amount: number,
        source: string,
        metadata: Record<string, unknown>
    ): Promise<void> {
        // Get current balance
        const { data: stats } = await this.supabase
            .from('user_activity_stats')
            .select('orbit_points')
            .eq('user_id', userId)
            .single();

        const balanceBefore = stats?.orbit_points || 0;
        const balanceAfter = balanceBefore + amount;

        // Log transaction
        await this.supabase.from('orbit_point_transactions').insert({
            user_id: userId,
            amount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            source,
            source_metadata: metadata,
        });

        // Update balance
        await this.supabase.from('user_activity_stats').upsert({
            user_id: userId,
            orbit_points: balanceAfter,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    }

    /**
     * Update last activity timestamp (for mining eligibility)
     */
    private async updateLastActivity(userId: string, now: Date): Promise<void> {
        const today = this.getDateString(now);

        // Get current stats
        const { data: stats } = await this.supabase
            .from('user_activity_stats')
            .select('last_active_date, days_active, first_active_date')
            .eq('user_id', userId)
            .single();

        const updates: Record<string, unknown> = {
            user_id: userId,
            last_active_date: today,
            updated_at: now.toISOString(),
        };

        // If this is a new day, increment days_active
        if (!stats?.last_active_date || stats.last_active_date !== today) {
            updates.days_active = (stats?.days_active || 0) + 1;
        }

        // Set first_active_date if not set
        if (!stats?.first_active_date) {
            updates.first_active_date = today;
        }

        await this.supabase.from('user_activity_stats').upsert(updates, { onConflict: 'user_id' });
    }

    /**
     * Increment AI interaction count (for NEURALYNC unlocks)
     */
    private async incrementInteractions(userId: string): Promise<void> {
        const { data: stats } = await this.supabase
            .from('user_activity_stats')
            .select('total_ai_interactions')
            .eq('user_id', userId)
            .single();

        await this.supabase.from('user_activity_stats').upsert({
            user_id: userId,
            total_ai_interactions: (stats?.total_ai_interactions || 0) + 1,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    }

    /**
     * Get date string in YYYY-MM-DD format
     */
    private getDateString(date: Date): string {
        return date.toISOString().split('T')[0];
    }
}

// Export singleton
export const periodCheckinService = new PeriodCheckinService();
