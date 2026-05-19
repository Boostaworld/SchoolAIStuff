# CREDIT FORGE — Orbit Point Buyback System
## Deep Technical Specification

> **Module:** Virtual Economy Integration  
> **Priority:** Medium-High — Ties Engagement to AI Access  
> **Dependencies:** CHRONOLOCK Protocol, Orbit Points Economy

---

## 1. Executive Summary

CREDIT FORGE creates a **bridge between platform engagement and AI access**:
1. Students **earn Orbit Points** through non-gameable mechanisms (time-based, daily rewards, social)
2. When AI credits are exhausted, they can **spend points to buy more**
3. Creates engagement loop: **Use Platform → Earn Points → Use AI → Use Platform More**
4. Prevents students from being "locked out", but requires genuine engagement

> [!IMPORTANT]
> **This is NOT a study app.** Orbit OS is a homework help / "cheat sheet" platform with AI labs, image generation, and social features. Points CANNOT come from task completion (too easily gamed with fake tasks).

---

## 1.1 Orbit Point Earning Mechanisms (Anti-Gaming)

Since users could create fake tasks to farm points infinitely, all earning mechanisms must be:
- **Time-gated** (can't be accelerated by spamming)
- **Activity-verified** (requires actual platform interactions)
- **Admin-controlled** (grants are auditable)

### Earning Sources

| Source | Points | Cooldown | Anti-Gaming Logic |
|--------|--------|----------|-------------------|
| **Period Check-In** | 10 pts/period | 9 periods/day | Must perform action during each period (DM, AI query, tab change) |
| **Full Day Bonus** | 150 pts | Daily | Earned if active in 8+ of 9 periods (huge reward) |
| **Daily Login** | 25 pts | 24 hours | One per calendar day |
| **Login Streak Bonus** | +5 pts/day | Cumulative | Caps at 7-day streak (max +35 bonus) |
| **ORBIT MINING** | 1-3 pts | 5 minutes | Passive while active (must have performed action in last 10 min) |
| **Admin Grant** | Variable | Manual | Teacher/admin can gift points (audited) |
| **DM Engagement** | 5 pts | Per unique thread | First message in a new DM thread (prevents spam) |

### PERIOD CHECK-IN — Activity-Based Class Period Rewards

This is the **primary earning mechanism** — rewards students for being active throughout the school day.

**How It Works:**
1. School day is divided into 9 periods (configurable)
2. During each period, the user must perform at least ONE action:
   - Send a DM
   - Send an AI query
   - Generate an image
   - Change tabs/panels in the app
   - Any clickable interaction (backend-tracked)
3. If they perform an action during a period, they earn **10 points** for that period
4. If they are active in **8 or more periods**, they get a massive **150 bonus points**

**Daily Maximum (Perfect Day):**
- 9 periods × 10 pts = 90 pts
- Full day bonus (8+/9): +150 pts
- Daily login: +25 pts
- Login streak (max): +35 pts
- **Total: 300 pts/day** (theoretical max)

```typescript
// services/period-checkin.ts

export interface PeriodConfig {
  periodCount: 9;
  periodSchedule: {
    period: number;
    startTime: string;  // "08:00"
    endTime: string;    // "08:50"
  }[];
  fullDayThreshold: 8;  // Need 8/9 for bonus
  pointsPerPeriod: 10;
  fullDayBonus: 150;
}

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
  fullDayThreshold: 8,
  pointsPerPeriod: 10,
  fullDayBonus: 150,
};

export class PeriodCheckinService {
  
  /**
   * Record user activity and check if they qualify for period points
   */
  async recordActivity(
    userId: string,
    activityType: 'dm' | 'ai_query' | 'image_gen' | 'navigation' | 'interaction'
  ): Promise<{ periodPoints: number; periodNumber: number | null }> {
    const now = new Date();
    const currentPeriod = this.getCurrentPeriod(now);
    
    if (!currentPeriod) {
      // Outside school hours — no period points, but activity still counts for mining
      return { periodPoints: 0, periodNumber: null };
    }
    
    // Check if already checked in for this period today
    const alreadyCheckedIn = await this.hasCheckedIn(userId, currentPeriod, now);
    
    if (alreadyCheckedIn) {
      return { periodPoints: 0, periodNumber: currentPeriod };
    }
    
    // Record check-in
    await this.recordCheckin(userId, currentPeriod, activityType, now);
    
    // Award period points
    await this.awardPoints(userId, DEFAULT_PERIOD_SCHEDULE.pointsPerPeriod, {
      source: 'period_checkin',
      period: currentPeriod,
      activityType,
    });
    
    // Check for full day bonus
    const todayCheckins = await this.getTodayCheckinCount(userId, now);
    if (todayCheckins === DEFAULT_PERIOD_SCHEDULE.fullDayThreshold) {
      // Just hit 8 periods — award bonus!
      await this.awardPoints(userId, DEFAULT_PERIOD_SCHEDULE.fullDayBonus, {
        source: 'full_day_bonus',
        periodsActive: todayCheckins,
      });
    }
    
    return { periodPoints: DEFAULT_PERIOD_SCHEDULE.pointsPerPeriod, periodNumber: currentPeriod };
  }
  
  private getCurrentPeriod(now: Date): number | null {
    const timeStr = now.toTimeString().slice(0, 5); // "HH:MM"
    
    for (const period of DEFAULT_PERIOD_SCHEDULE.periodSchedule) {
      if (timeStr >= period.startTime && timeStr <= period.endTime) {
        return period.period;
      }
    }
    
    return null; // Outside all periods
  }
}
```

### Database Schema for Period Check-Ins

```sql
-- Period check-in tracking
CREATE TABLE period_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 9),
    check_in_date DATE NOT NULL,
    activity_type TEXT NOT NULL,
    checked_in_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, period_number, check_in_date)  -- One check-in per period per day
);

CREATE INDEX idx_checkins_user_date ON period_checkins(user_id, check_in_date);

-- Daily summary for quick queries
CREATE TABLE daily_activity_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    summary_date DATE NOT NULL,
    periods_active INTEGER DEFAULT 0,
    full_day_bonus_awarded BOOLEAN DEFAULT false,
    total_points_earned INTEGER DEFAULT 0,
    
    UNIQUE(user_id, summary_date)
);

-- Point transaction log (audit trail)
CREATE TABLE orbit_point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    amount INTEGER NOT NULL,           -- Positive = earned, Negative = spent
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    
    source TEXT NOT NULL,              -- 'period_checkin', 'full_day_bonus', 'daily_login', 'mining', 'admin_grant', 'buyback'
    source_metadata JSONB DEFAULT '{}',-- Additional context
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_points_user ON orbit_point_transactions(user_id);
CREATE INDEX idx_points_source ON orbit_point_transactions(source);
CREATE INDEX idx_points_time ON orbit_point_transactions(created_at DESC);

-- Daily login tracking (prevent duplicate claims)
CREATE TABLE daily_login_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    claimed_date DATE NOT NULL,
    streak_day INTEGER DEFAULT 1,
    points_awarded INTEGER NOT NULL,
    
    UNIQUE(user_id, claimed_date)
);

-- Mining state per user
CREATE TABLE user_mining_state (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    last_mining_tick TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,      -- For activity requirement
    ticks_today INTEGER DEFAULT 0,
    ticks_today_date DATE DEFAULT CURRENT_DATE,
    total_mined INTEGER DEFAULT 0
);
```

### UI: Period Progress Indicator

```tsx
// components/PeriodProgress.tsx

export function PeriodProgress({ periodsActive, currentPeriod }: { 
  periodsActive: number[]; 
  currentPeriod: number | null 
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((period) => (
        <div
          key={period}
          className={`
            w-3 h-3 rounded-full transition-all
            ${periodsActive.includes(period)
              ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
              : period === currentPeriod
                ? 'bg-amber-400 animate-pulse'
                : 'bg-slate-700'
            }
          `}
          title={`Period ${period}${periodsActive.includes(period) ? ' ✓' : ''}`}
        />
      ))}
      <span className="ml-2 text-xs text-slate-400">
        {periodsActive.length}/9 periods
        {periodsActive.length >= 8 && <span className="text-emerald-400 ml-1">🔥 Bonus!</span>}
      </span>
    </div>
  );
}
```

## 2. Exchange Rate Economy

### 2.1 Tiered Exchange Rates

More expensive models cost more points (incentivizes efficient model usage):

| Model Tier | Model Examples | Points per $0.10 | Rationale |
|------------|----------------|------------------|-----------|
| **Flash** | Gemini Flash, Claude Haiku | 50 pts | Cheap access, low barrier |
| **Standard** | Gemini 2.5 Pro, Sonnet | 150 pts | Moderate cost |
| **Premium** | Gemini 3 Pro, Claude Opus | 500 pts | Premium = premium cost |

### 2.2 Dynamic Pricing Considerations

```typescript
// config/credit-forge.ts

export interface BuybackPricing {
  modelId: string;
  tier: 'flash' | 'standard' | 'premium';
  basePointsPer10Cents: number;
  
  // Optional modifiers
  examWeekMultiplier?: number;      // 0.5 = 50% discount during exams
  bulkDiscountTiers?: { points: number; discount: number }[];
}

export const BUYBACK_PRICING: BuybackPricing[] = [
  // Flash tier
  { modelId: 'gemini-2.5-flash', tier: 'flash', basePointsPer10Cents: 50 },
  { modelId: 'gemini-2.0-flash', tier: 'flash', basePointsPer10Cents: 50 },
  { modelId: 'claude-haiku-3.5', tier: 'flash', basePointsPer10Cents: 75 },
  
  // Standard tier
  { modelId: 'gemini-2.5-pro', tier: 'standard', basePointsPer10Cents: 150 },
  { modelId: 'claude-sonnet-4', tier: 'standard', basePointsPer10Cents: 150 },
  
  // Premium tier
  { modelId: 'gemini-3-pro-preview', tier: 'premium', basePointsPer10Cents: 400 },
  { modelId: 'claude-opus-4', tier: 'premium', basePointsPer10Cents: 500 },
];

// Bulk discount: buy more, save more
export const BULK_DISCOUNTS = [
  { minPoints: 500, discount: 0.05 },   // 5% off at 500+ points
  { minPoints: 1000, discount: 0.10 },  // 10% off at 1000+ points
  { minPoints: 2500, discount: 0.15 },  // 15% off at 2500+ points
];
```

---

## 3. Database Schema

```sql
-- Buyback configuration per model
CREATE TABLE buyback_rates (
    model_id TEXT PRIMARY KEY REFERENCES ai_models(id),
    tier TEXT NOT NULL CHECK (tier IN ('flash', 'standard', 'premium')),
    points_per_10_cents INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Optional overrides
    min_user_level INTEGER DEFAULT 1,           -- Minimum level to buy this model
    requires_unlock BOOLEAN DEFAULT false,      -- Must unlock in skill tree first
    max_buyback_per_cycle DECIMAL(10,6),        -- Cap purchases per cycle
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Buyback transactions
CREATE TABLE buyback_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    model_id TEXT NOT NULL REFERENCES ai_models(id),
    cycle_id UUID REFERENCES user_model_cycles(id),
    
    -- Points spent
    points_spent INTEGER NOT NULL,
    points_balance_before INTEGER NOT NULL,
    points_balance_after INTEGER NOT NULL,
    
    -- Credits received
    credits_received DECIMAL(10,6) NOT NULL,
    credits_balance_before DECIMAL(10,6) NOT NULL,
    credits_balance_after DECIMAL(10,6) NOT NULL,
    
    -- Pricing details at time of transaction
    exchange_rate INTEGER NOT NULL,             -- Points per $0.10 at time of purchase
    discount_applied DECIMAL(5,4) DEFAULT 0,    -- e.g., 0.10 for 10% off
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_buyback_user ON buyback_transactions(user_id);
CREATE INDEX idx_buyback_model ON buyback_transactions(model_id);
CREATE INDEX idx_buyback_time ON buyback_transactions(created_at DESC);

-- Scheduled promotions
CREATE TABLE buyback_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Timing
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    
    -- Effect
    discount_multiplier DECIMAL(3,2) NOT NULL,  -- 0.5 = 50% off points required
    applies_to_tiers TEXT[],                    -- e.g., ['flash', 'standard']
    applies_to_models TEXT[],                   -- Specific models (overrides tiers)
    
    -- Targeting
    min_user_level INTEGER,
    max_user_level INTEGER,
    school_ids UUID[],                          -- Specific schools only
    
    created_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);
```

---

## 4. Core Service Implementation

```typescript
// services/credit-forge.ts

import { createClient } from '@supabase/supabase-js';
import { ChronolockService } from './chronolock';
import { OrbitPointsService } from './orbit-points';

export interface BuybackQuote {
  modelId: string;
  creditsAmount: number;
  pointsRequired: number;
  discountApplied: number;
  discountReason?: string;
  effectiveRate: number;      // Points per $0.10 after discounts
  expiresAt?: Date;           // Quote expiration for promotions
  
  // Validation
  canPurchase: boolean;
  blockedReason?: string;
}

export interface BuybackResult {
  success: boolean;
  transactionId: string;
  creditsAdded: number;
  pointsSpent: number;
  newCreditBalance: number;
  newPointsBalance: number;
  error?: string;
}

export class CreditForgeService {
  private supabase;
  private chronolock: ChronolockService;
  private orbitPoints: OrbitPointsService;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.chronolock = new ChronolockService();
    this.orbitPoints = new OrbitPointsService();
  }

  /**
   * Get a price quote for buying credits
   */
  async getQuote(
    userId: string,
    modelId: string,
    creditsAmount: number
  ): Promise<BuybackQuote> {
    // Get base rate
    const { data: rateConfig } = await this.supabase
      .from('buyback_rates')
      .select('*')
      .eq('model_id', modelId)
      .eq('is_active', true)
      .single();

    if (!rateConfig) {
      return {
        modelId,
        creditsAmount,
        pointsRequired: 0,
        discountApplied: 0,
        effectiveRate: 0,
        canPurchase: false,
        blockedReason: 'Buyback not available for this model',
      };
    }

    // Check if user has unlocked this model
    const hasAccess = await this.checkModelAccess(userId, modelId, rateConfig);
    if (!hasAccess.allowed) {
      return {
        modelId,
        creditsAmount,
        pointsRequired: 0,
        discountApplied: 0,
        effectiveRate: 0,
        canPurchase: false,
        blockedReason: hasAccess.reason,
      };
    }

    // Check cycle and buyback limit
    const cycle = await this.chronolock.getOrCreateCycle(userId, modelId);
    const maxBuyback = rateConfig.max_buyback_per_cycle ?? (cycle.creditsLimit * 0.5);
    const alreadyBought = cycle.buybackCreditsAdded;
    const remainingAllowance = maxBuyback - alreadyBought;

    if (creditsAmount > remainingAllowance) {
      return {
        modelId,
        creditsAmount,
        pointsRequired: 0,
        discountApplied: 0,
        effectiveRate: 0,
        canPurchase: false,
        blockedReason: `Maximum buyback for this cycle is $${maxBuyback.toFixed(2)}. You've already purchased $${alreadyBought.toFixed(2)}.`,
      };
    }

    // Calculate base points required
    const baseRate = rateConfig.points_per_10_cents;
    const unitsOf10Cents = creditsAmount / 0.10;
    let pointsRequired = Math.ceil(unitsOf10Cents * baseRate);

    // Check for active promotions
    const promotion = await this.getActivePromotion(userId, modelId, rateConfig.tier);
    let discountApplied = 0;
    let discountReason: string | undefined;
    let expiresAt: Date | undefined;

    if (promotion) {
      discountApplied = 1 - promotion.discount_multiplier;
      discountReason = promotion.name;
      expiresAt = new Date(promotion.ends_at);
      pointsRequired = Math.ceil(pointsRequired * promotion.discount_multiplier);
    }

    // Check for bulk discount
    const bulkDiscount = this.calculateBulkDiscount(pointsRequired);
    if (bulkDiscount > discountApplied) {
      discountApplied = bulkDiscount;
      discountReason = `Bulk discount (${Math.round(bulkDiscount * 100)}% off)`;
      pointsRequired = Math.ceil(pointsRequired * (1 - bulkDiscount));
    }

    // Check user's point balance
    const pointsBalance = await this.orbitPoints.getBalance(userId);
    const canPurchase = pointsBalance >= pointsRequired;

    return {
      modelId,
      creditsAmount,
      pointsRequired,
      discountApplied,
      discountReason,
      effectiveRate: Math.round(pointsRequired / unitsOf10Cents),
      expiresAt,
      canPurchase,
      blockedReason: canPurchase ? undefined : `Insufficient Orbit Points. Need ${pointsRequired}, have ${pointsBalance}.`,
    };
  }

  /**
   * Execute a buyback transaction
   */
  async executeBuyback(
    userId: string,
    modelId: string,
    creditsAmount: number
  ): Promise<BuybackResult> {
    // Get fresh quote (prices may have changed)
    const quote = await this.getQuote(userId, modelId, creditsAmount);

    if (!quote.canPurchase) {
      return {
        success: false,
        transactionId: '',
        creditsAdded: 0,
        pointsSpent: 0,
        newCreditBalance: 0,
        newPointsBalance: 0,
        error: quote.blockedReason,
      };
    }

    // Begin transaction
    const pointsBefore = await this.orbitPoints.getBalance(userId);
    const cycle = await this.chronolock.getOrCreateCycle(userId, modelId);
    const creditsBefore = cycle.creditsRemaining;

    try {
      // Deduct points
      await this.orbitPoints.deduct(userId, quote.pointsRequired, {
        type: 'ai_buyback',
        modelId,
        creditsAmount,
      });

      // Add credits to cycle
      const { data: updatedCycle, error } = await this.supabase
        .from('user_model_cycles')
        .update({
          credits_remaining: cycle.creditsRemaining + creditsAmount,
          buyback_credits_added: cycle.buybackCreditsAdded + creditsAmount,
          buyback_credits_remaining: cycle.buybackCreditsRemaining + creditsAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cycle.id)
        .select()
        .single();

      if (error) throw error;

      // Log transaction
      const { data: transaction } = await this.supabase
        .from('buyback_transactions')
        .insert({
          user_id: userId,
          model_id: modelId,
          cycle_id: cycle.id,
          points_spent: quote.pointsRequired,
          points_balance_before: pointsBefore,
          points_balance_after: pointsBefore - quote.pointsRequired,
          credits_received: creditsAmount,
          credits_balance_before: creditsBefore,
          credits_balance_after: updatedCycle.credits_remaining,
          exchange_rate: quote.effectiveRate,
          discount_applied: quote.discountApplied,
        })
        .select('id')
        .single();

      return {
        success: true,
        transactionId: transaction?.id ?? '',
        creditsAdded: creditsAmount,
        pointsSpent: quote.pointsRequired,
        newCreditBalance: updatedCycle.credits_remaining,
        newPointsBalance: pointsBefore - quote.pointsRequired,
      };

    } catch (error) {
      // Rollback points if credit update failed
      await this.orbitPoints.credit(userId, quote.pointsRequired, {
        type: 'ai_buyback_rollback',
        reason: 'Credit update failed',
      });

      return {
        success: false,
        transactionId: '',
        creditsAdded: 0,
        pointsSpent: 0,
        newCreditBalance: creditsBefore,
        newPointsBalance: pointsBefore,
        error: error instanceof Error ? error.message : 'Transaction failed',
      };
    }
  }

  private async checkModelAccess(
    userId: string,
    modelId: string,
    rateConfig: any
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check user level
    const userLevel = await this.getUserLevel(userId);
    
    if (userLevel < rateConfig.min_user_level) {
      return {
        allowed: false,
        reason: `Requires Level ${rateConfig.min_user_level}. You are Level ${userLevel}.`,
      };
    }

    // Check if model requires unlock
    if (rateConfig.requires_unlock) {
      const isUnlocked = await this.checkModelUnlocked(userId, modelId);
      if (!isUnlocked) {
        return {
          allowed: false,
          reason: `Unlock ${modelId} in the Skill Tree first.`,
        };
      }
    }

    return { allowed: true };
  }

  private async getActivePromotion(
    userId: string,
    modelId: string,
    tier: string
  ): Promise<any | null> {
    const now = new Date().toISOString();
    
    const { data: promotions } = await this.supabase
      .from('buyback_promotions')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .gte('ends_at', now)
      .order('discount_multiplier', { ascending: true }); // Best discount first

    if (!promotions?.length) return null;

    // Filter to applicable promotions
    for (const promo of promotions) {
      // Check if applies to this model specifically
      if (promo.applies_to_models?.includes(modelId)) {
        return promo;
      }
      // Check if applies to this tier
      if (promo.applies_to_tiers?.includes(tier)) {
        return promo;
      }
    }

    return null;
  }

  private calculateBulkDiscount(points: number): number {
    const tiers = [
      { min: 2500, discount: 0.15 },
      { min: 1000, discount: 0.10 },
      { min: 500, discount: 0.05 },
    ];

    for (const tier of tiers) {
      if (points >= tier.min) {
        return tier.discount;
      }
    }

    return 0;
  }

  private async getUserLevel(userId: string): Promise<number> {
    const { data } = await this.supabase
      .from('users')
      .select('level')
      .eq('id', userId)
      .single();
    return data?.level ?? 1;
  }

  private async checkModelUnlocked(userId: string, modelId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('user_skill_unlocks')
      .select('id')
      .eq('user_id', userId)
      .eq('skill_id', `model_${modelId}`)
      .single();
    return !!data;
  }
}
```

---

## 5. Frontend Components

### 5.1 Buyback Modal

```tsx
// components/ai/BuybackModal.tsx

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Zap, AlertTriangle, Sparkles, Check } from 'lucide-react';

interface BuybackModalProps {
  modelId: string;
  modelName: string;
  currentCredits: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: BuybackResult) => void;
}

export function BuybackModal({
  modelId,
  modelName,
  currentCredits,
  isOpen,
  onClose,
  onSuccess,
}: BuybackModalProps) {
  const [amount, setAmount] = useState(0.20);
  const [quote, setQuote] = useState<BuybackQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Fetch quote when amount changes
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchQuote = async () => {
      setIsLoading(true);
      const response = await fetch('/api/ai/buyback/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, creditsAmount: amount }),
      });
      const data = await response.json();
      setQuote(data);
      setIsLoading(false);
    };

    fetchQuote();
  }, [amount, modelId, isOpen]);

  const handlePurchase = async () => {
    if (!quote?.canPurchase) return;
    
    setIsPurchasing(true);
    try {
      const response = await fetch('/api/ai/buyback/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, creditsAmount: amount }),
      });
      const result = await response.json();
      
      if (result.success) {
        onSuccess(result);
        onClose();
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const presetAmounts = [0.10, 0.20, 0.50, 1.00];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-slate-900 border border-violet-500/30 rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-700 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">CREDIT FORGE</h2>
                  <p className="text-sm text-slate-400">Convert Orbit Points to {modelName} credits</p>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Current {modelName} balance:</span>
                <span className="text-white font-medium">${currentCredits.toFixed(4)}</span>
              </div>
            </div>

            {/* Amount Selection */}
            <div className="p-4">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Credits to purchase
              </label>
              
              <div className="flex gap-2 mb-4">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(preset)}
                    className={`
                      flex-1 py-2 rounded-lg text-sm font-medium transition-all
                      ${amount === preset
                        ? 'bg-violet-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }
                    `}
                  >
                    ${preset.toFixed(2)}
                  </button>
                ))}
              </div>

              {/* Quote Display */}
              {isLoading ? (
                <div className="h-24 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : quote ? (
                <div className="space-y-3">
                  {/* Cost */}
                  <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Points required:</span>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-xl font-bold text-white">
                          {quote.pointsRequired.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {quote.discountApplied > 0 && (
                      <div className="mt-2 text-sm text-emerald-400">
                        ✨ {quote.discountReason} ({Math.round(quote.discountApplied * 100)}% off)
                      </div>
                    )}
                  </div>

                  {/* Blocked Warning */}
                  {!quote.canPurchase && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-200">{quote.blockedReason}</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-4 border-t border-slate-700 bg-slate-800/30">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                disabled={!quote?.canPurchase || isPurchasing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-violet-500/25"
              >
                {isPurchasing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Purchase
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## 6. Use Cases

### Scenario A: Deadline Crunch

**Context:** Student "Alex" has an essay due tomorrow. Opus credits are at $0. Flash won't cut it. Alex has 3,500 Orbit Points from studying.

**Flow:**
1. Alex tries Opus → "CHRONOLOCK Active — resets in 52h"
2. System shows: "Purchase credits with Orbit Points?"
3. Alex opens CREDIT FORGE modal
4. Selects $0.50 Opus credits
5. Quote: 2,500 points (500 pts / $0.10)
6. Bulk discount applies: 2,375 points (5% off)
7. Alex confirms → Transaction succeeds
8. New Opus balance: $0.50
9. Alex finishes essay

**Outcome:** Alex's study discipline (earning points) unlocked AI access when needed.

---

### Scenario B: Exam Week Promotion

**Context:** School admin runs "Finals Week" promotion: 50% off Flash/Pro buyback.

**Flow:**
1. Admin creates promotion:
   - `discount_multiplier: 0.5`
   - `applies_to_tiers: ['flash', 'standard']`
   - `starts_at: 2024-12-15`, `ends_at: 2024-12-22`
2. Student "Sam" opens buyback during finals
3. Sees: "🎉 Finals Week! 50% off Flash & Pro buyback"
4. $0.20 Pro normally costs 300 points
5. With promotion: 150 points
6. Sam buys more credits than usual

**Outcome:** School incentivizes studying during high-stress period.

---

### Scenario C: Model Unlock Requirement

**Context:** New student "Jamie" wants to buy Opus credits but hasn't unlocked Opus yet.

**Flow:**
1. Jamie hits Flash limit, wants Opus
2. Opens buyback, selects Opus
3. Error: "Unlock Claude Opus in the Skill Tree first"
4. Link to skill tree shows requirements:
   - Reach Level 5
   - OR complete "Responsible AI Use" tutorial
5. Jamie completes tutorial → Opus unlocked
6. Now can purchase Opus credits

**Outcome:** Buyback doesn't bypass progression system.
