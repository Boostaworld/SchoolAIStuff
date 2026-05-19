# CHRONOLOCK Protocol — Tri-Day Cycle System
## Deep Technical Specification

> **Module:** Cost Management Core  
> **Priority:** Critical — Foundation for all other features  
> **Dependencies:** None (base layer)

---

## 1. Executive Summary

The CHRONOLOCK Protocol implements per-model credit isolation with rolling 72-hour cycles. Unlike traditional monthly limits that encourage "feast and famine" behavior, this system:

1. **Isolates risk** — Burning through Opus credits doesn't affect Flash access
2. **Encourages experimentation** — Short cycles reduce fear of "wasting" credits
3. **Enables behavioral learning** — Students learn model selection through experience
4. **Prevents abuse cascades** — No single event can exhaust all AI access

---

## 2. Database Architecture

### 2.1 Core Tables

```sql
-- Primary cycle tracking table
CREATE TABLE user_model_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    
    -- Cycle timing
    cycle_start_at TIMESTAMPTZ,          -- NULL = never used this model
    cycle_number INTEGER DEFAULT 0,       -- Increments each reset for analytics
    
    -- Credit management
    credits_limit DECIMAL(12,8) NOT NULL, -- Base limit in USD (8 decimal precision)
    credits_remaining DECIMAL(12,8) NOT NULL,
    credits_consumed_this_cycle DECIMAL(12,8) DEFAULT 0,
    
    -- Overdraft tracking (see DEADZONE spec)
    overdraft_balance DECIMAL(12,8) DEFAULT 0,
    overdraft_used_this_cycle BOOLEAN DEFAULT false,
    
    -- Buyback tracking (see CREDIT FORGE spec)
    buyback_credits_added DECIMAL(12,8) DEFAULT 0,
    buyback_credits_remaining DECIMAL(12,8) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_request_at TIMESTAMPTZ,
    total_requests_this_cycle INTEGER DEFAULT 0,
    
    CONSTRAINT unique_user_model UNIQUE(user_id, model_id),
    CONSTRAINT positive_limit CHECK (credits_limit > 0),
    CONSTRAINT valid_remaining CHECK (credits_remaining >= -credits_limit * 0.15) -- Allow 15% overdraft
);

-- Indexes for performance
CREATE INDEX idx_cycles_user ON user_model_cycles(user_id);
CREATE INDEX idx_cycles_model ON user_model_cycles(model_id);
CREATE INDEX idx_cycles_expiry ON user_model_cycles(cycle_start_at) WHERE cycle_start_at IS NOT NULL;
CREATE INDEX idx_cycles_low_credits ON user_model_cycles(credits_remaining) WHERE credits_remaining < 0.10;

-- Model configuration table
CREATE TABLE ai_models (
    id TEXT PRIMARY KEY,                  -- e.g., 'claude-opus-4', 'gemini-3-pro-preview'
    display_name TEXT NOT NULL,
    provider TEXT NOT NULL,               -- 'anthropic', 'google', 'openai'
    
    -- Pricing (per 1M tokens, in USD)
    input_price_per_million DECIMAL(10,6) NOT NULL,
    output_price_per_million DECIMAL(10,6) NOT NULL,
    cached_input_price_per_million DECIMAL(10,6),
    
    -- Default limits
    default_credit_limit DECIMAL(10,6) NOT NULL,
    max_credit_limit DECIMAL(10,6) NOT NULL,      -- Admin can't exceed this
    
    -- Access control
    min_user_level INTEGER DEFAULT 1,
    requires_approval BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Capabilities (for smart routing)
    complexity_floor INTEGER DEFAULT 1,           -- Min complexity score to use this model
    complexity_ceiling INTEGER DEFAULT 10,        -- Max complexity this model handles well
    supports_vision BOOLEAN DEFAULT false,
    supports_code_execution BOOLEAN DEFAULT false,
    max_context_tokens INTEGER NOT NULL,
    max_output_tokens INTEGER NOT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transaction log for audit trail
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    model_id TEXT NOT NULL REFERENCES ai_models(id),
    cycle_id UUID REFERENCES user_model_cycles(id),
    
    -- Transaction details
    transaction_type TEXT NOT NULL,       -- 'consumption', 'reset', 'buyback', 'overdraft', 'admin_grant'
    amount DECIMAL(12,8) NOT NULL,        -- Positive = credit added, Negative = credit consumed
    balance_before DECIMAL(12,8) NOT NULL,
    balance_after DECIMAL(12,8) NOT NULL,
    
    -- Request details (for consumption transactions)
    request_id UUID,
    input_tokens INTEGER,
    output_tokens INTEGER,
    cached_tokens INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb    -- Additional context
);

CREATE INDEX idx_transactions_user ON credit_transactions(user_id);
CREATE INDEX idx_transactions_cycle ON credit_transactions(cycle_id);
CREATE INDEX idx_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_transactions_time ON credit_transactions(created_at DESC);
```

### 2.2 Default Model Configuration

```sql
INSERT INTO ai_models (id, display_name, provider, input_price_per_million, output_price_per_million, default_credit_limit, max_credit_limit, min_user_level, complexity_floor, complexity_ceiling, max_context_tokens, max_output_tokens) VALUES
-- Anthropic Models
('claude-opus-4', 'Claude Opus 4', 'anthropic', 15.00, 75.00, 2.00, 10.00, 5, 7, 10, 200000, 32000),
('claude-sonnet-4', 'Claude Sonnet 4', 'anthropic', 3.00, 15.00, 5.00, 20.00, 3, 4, 8, 200000, 64000),
('claude-haiku-3.5', 'Claude Haiku 3.5', 'anthropic', 0.80, 4.00, 8.00, 30.00, 1, 1, 5, 200000, 8192),

-- Google Models
('gemini-3-pro-preview', 'Gemini 3 Pro Preview', 'google', 1.25, 10.00, 5.00, 25.00, 3, 5, 9, 1000000, 65536),
('gemini-2.5-pro', 'Gemini 2.5 Pro', 'google', 1.25, 10.00, 5.00, 25.00, 2, 4, 8, 1048576, 65536),
('gemini-2.5-flash', 'Gemini 2.5 Flash', 'google', 0.075, 0.30, 10.00, 50.00, 1, 1, 4, 1048576, 65536),
('gemini-2.0-flash', 'Gemini 2.0 Flash', 'google', 0.10, 0.40, 10.00, 50.00, 1, 1, 4, 1048576, 8192);
```

---

## 3. Core Logic Implementation

### 3.1 TypeScript Types

```typescript
// types/ai-credits.ts

export interface UserModelCycle {
  id: string;
  userId: string;
  modelId: string;
  cycleStartAt: Date | null;
  cycleNumber: number;
  creditsLimit: number;
  creditsRemaining: number;
  creditsConsumedThisCycle: number;
  overdraftBalance: number;
  overdraftUsedThisCycle: boolean;
  buybackCreditsAdded: number;
  buybackCreditsRemaining: number;
  lastRequestAt: Date | null;
  totalRequestsThisCycle: number;
}

export interface CycleStatus {
  isActive: boolean;
  isBlocked: boolean;
  creditsRemaining: number;
  creditsLimit: number;
  percentUsed: number;
  cycleStartAt: Date | null;
  cycleEndsAt: Date | null;
  secondsUntilReset: number | null;
  canUseOverdraft: boolean;
  overdraftAvailable: number;
  warningLevel: 'none' | 'low' | 'critical' | 'blocked';
}

export interface CreditDeductionResult {
  success: boolean;
  newBalance: number;
  usedOverdraft: boolean;
  overdraftAmount: number;
  blocked: boolean;
  blockReason?: string;
  cycleReset: boolean;
  transactionId: string;
}

export const CYCLE_DURATION_MS = 72 * 60 * 60 * 1000; // 72 hours
export const OVERDRAFT_PERCENT = 0.15; // 15% of limit
export const OVERDRAFT_ABSOLUTE_MAX = 0.50; // $0.50 max
export const WARNING_THRESHOLD_LOW = 0.20; // 20% remaining
export const WARNING_THRESHOLD_CRITICAL = 0.05; // 5% remaining
```

### 3.2 Cycle Management Service

```typescript
// services/chronolock.ts

import { createClient } from '@supabase/supabase-js';
import type { UserModelCycle, CycleStatus, CreditDeductionResult } from '@/types/ai-credits';
import { CYCLE_DURATION_MS, OVERDRAFT_PERCENT, OVERDRAFT_ABSOLUTE_MAX } from '@/types/ai-credits';

export class ChronolockService {
  private supabase;
  
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  /**
   * Get or create a cycle for a user-model pair
   * Handles cycle resets automatically
   */
  async getOrCreateCycle(userId: string, modelId: string): Promise<UserModelCycle> {
    // First, try to get existing cycle
    const { data: existing, error } = await this.supabase
      .from('user_model_cycles')
      .select('*')
      .eq('user_id', userId)
      .eq('model_id', modelId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw new Error(`Failed to fetch cycle: ${error.message}`);
    }

    // If no cycle exists, create one
    if (!existing) {
      return this.createNewCycle(userId, modelId);
    }

    // Check if cycle needs reset
    if (this.shouldResetCycle(existing)) {
      return this.resetCycle(existing);
    }

    return this.mapToCycle(existing);
  }

  /**
   * Check if a cycle should be reset (72 hours elapsed)
   */
  private shouldResetCycle(cycle: any): boolean {
    if (!cycle.cycle_start_at) return false;
    
    const cycleStart = new Date(cycle.cycle_start_at).getTime();
    const now = Date.now();
    
    return (now - cycleStart) >= CYCLE_DURATION_MS;
  }

  /**
   * Create a brand new cycle for first-time model usage
   */
  private async createNewCycle(userId: string, modelId: string): Promise<UserModelCycle> {
    // Get model's default limit
    const { data: model } = await this.supabase
      .from('ai_models')
      .select('default_credit_limit')
      .eq('id', modelId)
      .single();

    if (!model) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    const newCycle = {
      user_id: userId,
      model_id: modelId,
      cycle_start_at: null, // Will be set on first request
      cycle_number: 0,
      credits_limit: model.default_credit_limit,
      credits_remaining: model.default_credit_limit,
      credits_consumed_this_cycle: 0,
      overdraft_balance: 0,
      overdraft_used_this_cycle: false,
      buyback_credits_added: 0,
      buyback_credits_remaining: 0,
      total_requests_this_cycle: 0,
    };

    const { data, error } = await this.supabase
      .from('user_model_cycles')
      .insert(newCycle)
      .select()
      .single();

    if (error) throw new Error(`Failed to create cycle: ${error.message}`);
    
    return this.mapToCycle(data);
  }

  /**
   * Reset an expired cycle
   * Carries over overdraft debt to new cycle
   */
  private async resetCycle(oldCycle: any): Promise<UserModelCycle> {
    const overdraftDebt = Math.min(0, oldCycle.credits_remaining);
    const newCredits = oldCycle.credits_limit + overdraftDebt; // Deduct debt from new limit

    const updates = {
      cycle_start_at: null, // Reset to null, will be set on next request
      cycle_number: oldCycle.cycle_number + 1,
      credits_remaining: newCredits,
      credits_consumed_this_cycle: 0,
      overdraft_balance: 0,
      overdraft_used_this_cycle: false,
      buyback_credits_added: 0,
      buyback_credits_remaining: 0,
      total_requests_this_cycle: 0,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('user_model_cycles')
      .update(updates)
      .eq('id', oldCycle.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to reset cycle: ${error.message}`);

    // Log the reset transaction
    await this.logTransaction({
      userId: oldCycle.user_id,
      modelId: oldCycle.model_id,
      cycleId: oldCycle.id,
      type: 'reset',
      amount: newCredits,
      balanceBefore: oldCycle.credits_remaining,
      balanceAfter: newCredits,
      metadata: {
        overdraftCarried: Math.abs(overdraftDebt),
        previousCycleNumber: oldCycle.cycle_number,
      }
    });

    return this.mapToCycle(data);
  }

  /**
   * Get detailed cycle status for UI display
   */
  async getCycleStatus(userId: string, modelId: string): Promise<CycleStatus> {
    const cycle = await this.getOrCreateCycle(userId, modelId);
    
    const cycleEndsAt = cycle.cycleStartAt 
      ? new Date(cycle.cycleStartAt.getTime() + CYCLE_DURATION_MS)
      : null;
    
    const secondsUntilReset = cycleEndsAt 
      ? Math.max(0, Math.floor((cycleEndsAt.getTime() - Date.now()) / 1000))
      : null;

    const percentUsed = ((cycle.creditsLimit - cycle.creditsRemaining) / cycle.creditsLimit) * 100;
    const percentRemaining = 100 - percentUsed;

    const maxOverdraft = Math.min(
      cycle.creditsLimit * OVERDRAFT_PERCENT,
      OVERDRAFT_ABSOLUTE_MAX
    );
    const overdraftAvailable = cycle.creditsRemaining >= 0 
      ? maxOverdraft 
      : Math.max(0, maxOverdraft + cycle.creditsRemaining);

    let warningLevel: CycleStatus['warningLevel'] = 'none';
    if (cycle.creditsRemaining <= 0) {
      warningLevel = overdraftAvailable > 0 ? 'critical' : 'blocked';
    } else if (percentRemaining <= 5) {
      warningLevel = 'critical';
    } else if (percentRemaining <= 20) {
      warningLevel = 'low';
    }

    return {
      isActive: cycle.cycleStartAt !== null,
      isBlocked: cycle.creditsRemaining <= 0 && overdraftAvailable <= 0,
      creditsRemaining: cycle.creditsRemaining,
      creditsLimit: cycle.creditsLimit,
      percentUsed,
      cycleStartAt: cycle.cycleStartAt,
      cycleEndsAt,
      secondsUntilReset,
      canUseOverdraft: overdraftAvailable > 0,
      overdraftAvailable,
      warningLevel,
    };
  }

  /**
   * Deduct credits for a request
   * Handles overdraft logic automatically
   */
  async deductCredits(
    userId: string,
    modelId: string,
    cost: number,
    requestId: string,
    tokenDetails: { input: number; output: number; cached?: number }
  ): Promise<CreditDeductionResult> {
    const cycle = await this.getOrCreateCycle(userId, modelId);
    
    // Start cycle if this is the first request
    let cycleReset = false;
    if (!cycle.cycleStartAt) {
      await this.supabase
        .from('user_model_cycles')
        .update({ cycle_start_at: new Date().toISOString() })
        .eq('id', cycle.id);
      cycleReset = true;
    }

    // Calculate available credit including overdraft
    const maxOverdraft = Math.min(
      cycle.creditsLimit * OVERDRAFT_PERCENT,
      OVERDRAFT_ABSOLUTE_MAX
    );
    const effectiveLimit = cycle.creditsRemaining + maxOverdraft;

    // Check if request can be fulfilled
    if (cost > effectiveLimit) {
      return {
        success: false,
        newBalance: cycle.creditsRemaining,
        usedOverdraft: false,
        overdraftAmount: 0,
        blocked: true,
        blockReason: `Insufficient credits. Need $${cost.toFixed(4)}, have $${effectiveLimit.toFixed(4)} (including overdraft)`,
        cycleReset,
        transactionId: '',
      };
    }

    // Calculate new balance and overdraft usage
    const newBalance = cycle.creditsRemaining - cost;
    const usedOverdraft = newBalance < 0;
    const overdraftAmount = usedOverdraft ? Math.abs(newBalance) : 0;

    // Update cycle
    const { error } = await this.supabase
      .from('user_model_cycles')
      .update({
        credits_remaining: newBalance,
        credits_consumed_this_cycle: cycle.creditsConsumedThisCycle + cost,
        overdraft_used_this_cycle: cycle.overdraftUsedThisCycle || usedOverdraft,
        last_request_at: new Date().toISOString(),
        total_requests_this_cycle: cycle.totalRequestsThisCycle + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cycle.id);

    if (error) throw new Error(`Failed to deduct credits: ${error.message}`);

    // Log transaction
    const transaction = await this.logTransaction({
      userId,
      modelId,
      cycleId: cycle.id,
      type: usedOverdraft ? 'overdraft' : 'consumption',
      amount: -cost,
      balanceBefore: cycle.creditsRemaining,
      balanceAfter: newBalance,
      requestId,
      inputTokens: tokenDetails.input,
      outputTokens: tokenDetails.output,
      cachedTokens: tokenDetails.cached,
    });

    return {
      success: true,
      newBalance,
      usedOverdraft,
      overdraftAmount,
      blocked: false,
      cycleReset,
      transactionId: transaction.id,
    };
  }

  /**
   * Pre-flight check: Can this request be processed?
   * Use before making the actual AI call
   */
  async canProcessRequest(
    userId: string,
    modelId: string,
    estimatedCost: number
  ): Promise<{ allowed: boolean; reason?: string; status: CycleStatus }> {
    const status = await this.getCycleStatus(userId, modelId);
    
    if (status.isBlocked) {
      return {
        allowed: false,
        reason: `Credit limit reached. Resets in ${this.formatDuration(status.secondsUntilReset || 0)}`,
        status,
      };
    }

    const available = status.creditsRemaining + status.overdraftAvailable;
    if (estimatedCost > available) {
      return {
        allowed: false,
        reason: `Estimated cost ($${estimatedCost.toFixed(4)}) exceeds available credits ($${available.toFixed(4)})`,
        status,
      };
    }

    return { allowed: true, status };
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  private async logTransaction(params: {
    userId: string;
    modelId: string;
    cycleId: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    requestId?: string;
    inputTokens?: number;
    outputTokens?: number;
    cachedTokens?: number;
    metadata?: Record<string, any>;
  }) {
    const { data, error } = await this.supabase
      .from('credit_transactions')
      .insert({
        user_id: params.userId,
        model_id: params.modelId,
        cycle_id: params.cycleId,
        transaction_type: params.type,
        amount: params.amount,
        balance_before: params.balanceBefore,
        balance_after: params.balanceAfter,
        request_id: params.requestId,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
        cached_tokens: params.cachedTokens,
        metadata: params.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log transaction:', error);
    }
    
    return data;
  }

  private mapToCycle(row: any): UserModelCycle {
    return {
      id: row.id,
      userId: row.user_id,
      modelId: row.model_id,
      cycleStartAt: row.cycle_start_at ? new Date(row.cycle_start_at) : null,
      cycleNumber: row.cycle_number,
      creditsLimit: parseFloat(row.credits_limit),
      creditsRemaining: parseFloat(row.credits_remaining),
      creditsConsumedThisCycle: parseFloat(row.credits_consumed_this_cycle),
      overdraftBalance: parseFloat(row.overdraft_balance),
      overdraftUsedThisCycle: row.overdraft_used_this_cycle,
      buybackCreditsAdded: parseFloat(row.buyback_credits_added),
      buybackCreditsRemaining: parseFloat(row.buyback_credits_remaining),
      lastRequestAt: row.last_request_at ? new Date(row.last_request_at) : null,
      totalRequestsThisCycle: row.total_requests_this_cycle,
    };
  }
}
```

---

## 4. Edge Cases & Error Handling

### 4.1 Race Conditions

**Problem:** Two simultaneous requests could both pass the credit check but together exceed the limit.

**Solution:** Use database-level locking via Postgres advisory locks or `FOR UPDATE` clause:

```typescript
async deductCreditsAtomic(userId: string, modelId: string, cost: number) {
  // Use Postgres function for atomic operation
  const { data, error } = await this.supabase.rpc('deduct_credits_atomic', {
    p_user_id: userId,
    p_model_id: modelId,
    p_cost: cost,
  });
  
  if (error) throw error;
  return data;
}
```

```sql
CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  p_user_id UUID,
  p_model_id TEXT,
  p_cost DECIMAL
) RETURNS JSONB AS $$
DECLARE
  v_cycle user_model_cycles%ROWTYPE;
  v_max_overdraft DECIMAL;
  v_new_balance DECIMAL;
BEGIN
  -- Lock the row for update
  SELECT * INTO v_cycle
  FROM user_model_cycles
  WHERE user_id = p_user_id AND model_id = p_model_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cycle not found';
  END IF;
  
  -- Calculate max overdraft
  v_max_overdraft := LEAST(v_cycle.credits_limit * 0.15, 0.50);
  
  -- Check if affordable
  IF p_cost > (v_cycle.credits_remaining + v_max_overdraft) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_credits');
  END IF;
  
  -- Deduct
  v_new_balance := v_cycle.credits_remaining - p_cost;
  
  UPDATE user_model_cycles
  SET credits_remaining = v_new_balance,
      credits_consumed_this_cycle = credits_consumed_this_cycle + p_cost,
      updated_at = NOW()
  WHERE id = v_cycle.id;
  
  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql;
```

### 4.2 Streaming Response Cutoff

**Problem:** User starts a response, credits run out mid-stream.

**Solution:** Pre-estimate max cost before streaming, reserve credits, then settle actual cost:

```typescript
async reserveCredits(userId: string, modelId: string, maxCost: number) {
  // Temporarily deduct max estimated cost
  const result = await this.deductCredits(userId, modelId, maxCost, 'reservation', {
    input: 0, output: 0
  });
  
  if (!result.success) return result;
  
  return {
    ...result,
    reservationId: result.transactionId,
    refundOnComplete: async (actualCost: number) => {
      const refund = maxCost - actualCost;
      if (refund > 0) {
        await this.refundCredits(userId, modelId, refund, result.transactionId);
      }
    }
  };
}
```

### 4.3 Clock Skew

**Problem:** User's device clock differs from server.

**Solution:** Always use server time. Display countdown based on server-provided `cycleEndsAt`.

### 4.4 Model Deprecation

**Problem:** Model is deprecated while user has active cycle.

**Solution:** Migration script that:
1. Converts remaining credits to new model equivalent
2. Preserves cycle timing
3. Notifies user via in-app message

---

## 5. Use Cases

### Scenario A: Fresh Start

**Context:** New student "Maya" opens the AI Lab for the first time and selects Claude Opus.

**Flow:**
1. System creates `user_model_cycles` row for Maya + Opus with `cycle_start_at = NULL`
2. Maya sends first message: "Explain quantum entanglement"
3. System sets `cycle_start_at = NOW()`, starting her 72-hour timer
4. Request costs $0.023 (750 input tokens, 1200 output tokens)
5. Balance: $2.00 → $1.977
6. UI shows: "Opus Cycle: 71h 59m remaining | $1.98 left"

**Outcome:** Maya's Opus timer is now running. Her Flash, Pro, and Gemini cycles remain dormant.

---

### Scenario B: Multi-Model Workflow

**Context:** Student "Kai" is working on a complex coding project. They've been using Gemini 3 Pro Preview to brainstorm architecture, now need Claude Opus for implementation details.

**Flow:**
1. Kai has used $3.20 of $5.00 Gemini 3 Pro Preview credits (cycle started 48h ago)
2. Kai switches to Claude Opus (never used before)
3. System creates new Opus cycle, `cycle_start_at = NULL`
4. Kai sends Opus request → Opus cycle starts NOW
5. Both cycles now run independently:
   - Gemini 3 Pro Preview: 24h remaining, $1.80 left
   - Claude Opus: 72h remaining, $2.00 left

**Outcome:** Different models have different timelines. Kai can exhaust one without losing access to others.

---

### Scenario C: Limit Hit + Recovery

**Context:** Student "Zara" is on a deadline. She's used all $2.00 of Opus credits with 12 hours until reset.

**Flow:**
1. Zara tries to send Opus message → BLOCKED
2. UI displays: "CHRONOLOCK Active — Opus resets in 12h 14m"
3. Options presented:
   a. Switch to Gemini 2.5 Pro ($4.50 remaining)
   b. Buy 1000 Orbit Points → $0.20 Opus credit
   c. Wait for reset
4. Zara uses MEMCORE Compression on her current chat (costs $0.001 from Flash)
5. Copies compressed context, opens Gemini 2.5 Pro chat
6. Pastes context, continues work seamlessly

**Outcome:** Zara leverages model isolation and context transfer to bypass Opus limit without losing progress.
