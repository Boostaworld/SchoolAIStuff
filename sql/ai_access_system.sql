-- ============================================================================
-- AI ACCESS SYSTEM MIGRATION - Phase 1: Core Tables
-- ============================================================================
-- Run this in Supabase SQL Editor
-- Created: 2025-12-12
-- Docs: /docs/ai-system/*.md
-- ============================================================================

-- ============================================================================
-- 1. AI Models Registry
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_models (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'anthropic', 'openai')),
    tier TEXT NOT NULL CHECK (tier IN ('flash', 'standard', 'premium')),
    
    -- Pricing per 1M tokens
    input_cost_per_million DECIMAL(10,4) NOT NULL,
    output_cost_per_million DECIMAL(10,4) NOT NULL,
    
    -- Limits
    max_context_tokens INTEGER DEFAULT 128000,
    max_output_tokens INTEGER DEFAULT 8192,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_deprecated BOOLEAN DEFAULT false,
    deprecation_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. CHRONOLOCK - Per-Model Credit Cycles
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_model_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL REFERENCES ai_models(id),
    
    -- Cycle timing
    cycle_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cycle_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '72 hours'),
    
    -- Credit tracking
    credits_limit DECIMAL(10,6) NOT NULL DEFAULT 1.00,  -- Base allocation
    credits_used DECIMAL(10,6) NOT NULL DEFAULT 0,
    credits_remaining DECIMAL(10,6) GENERATED ALWAYS AS (credits_limit - credits_used) STORED,
    
    -- Overdraft (DEADZONE)
    overdraft_limit DECIMAL(10,6) GENERATED ALWAYS AS (
        LEAST(0.50, credits_limit * 0.15)
    ) STORED,
    overdraft_used DECIMAL(10,6) NOT NULL DEFAULT 0,
    
    -- Buyback tracking
    buyback_credits_added DECIMAL(10,6) NOT NULL DEFAULT 0,
    
    -- Debt from previous cycle
    carried_debt DECIMAL(10,6) NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, model_id)
);

CREATE INDEX idx_cycles_user ON user_model_cycles(user_id);
CREATE INDEX idx_cycles_model ON user_model_cycles(model_id);
CREATE INDEX idx_cycles_ends_at ON user_model_cycles(cycle_ends_at);

-- ============================================================================
-- 3. Credit Transaction Log (Audit)
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL REFERENCES ai_models(id),
    cycle_id UUID REFERENCES user_model_cycles(id),
    
    -- Transaction details
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'usage', 'cycle_reset', 'buyback', 'admin_grant', 'refund', 'debt_carryover'
    )),
    
    amount DECIMAL(10,6) NOT NULL,  -- Positive = credit added, Negative = credit used
    balance_before DECIMAL(10,6) NOT NULL,
    balance_after DECIMAL(10,6) NOT NULL,
    
    -- Token details for usage transactions
    input_tokens INTEGER,
    output_tokens INTEGER,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_tx_time ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_tx_type ON credit_transactions(transaction_type);

-- ============================================================================
-- 4. Period Check-Ins (Activity Tracking for Points)
-- ============================================================================
CREATE TABLE IF NOT EXISTS period_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 9),
    check_in_date DATE NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'dm', 'ai_query', 'image_gen', 'navigation', 'interaction'
    )),
    checked_in_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, period_number, check_in_date)
);

CREATE INDEX idx_checkins_user_date ON period_checkins(user_id, check_in_date);

-- ============================================================================
-- 5. Daily Activity Summary
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_activity_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    periods_active INTEGER DEFAULT 0,
    full_day_bonus_awarded BOOLEAN DEFAULT false,
    total_points_earned INTEGER DEFAULT 0,
    
    UNIQUE(user_id, summary_date)
);

CREATE INDEX idx_daily_summary_user ON daily_activity_summary(user_id);

-- ============================================================================
-- 6. Orbit Point Transactions (Point Audit Log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orbit_point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    amount INTEGER NOT NULL,  -- Positive = earned, Negative = spent
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    
    source TEXT NOT NULL CHECK (source IN (
        'period_checkin', 'full_day_bonus', 'daily_login', 'login_streak',
        'mining', 'admin_grant', 'buyback', 'dm_engagement'
    )),
    source_metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_points_user ON orbit_point_transactions(user_id);
CREATE INDEX idx_points_source ON orbit_point_transactions(source);
CREATE INDEX idx_points_time ON orbit_point_transactions(created_at DESC);

-- ============================================================================
-- 7. User Activity Stats (for NEURALYNC unlocks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_activity_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_ai_interactions INTEGER DEFAULT 0,
    days_active INTEGER DEFAULT 0,
    orbit_points INTEGER DEFAULT 0,
    first_active_date DATE,
    last_active_date DATE,
    
    -- Login tracking
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_login_date DATE,
    
    -- Mining state
    last_mining_tick TIMESTAMPTZ,
    mining_ticks_today INTEGER DEFAULT 0,
    mining_ticks_today_date DATE DEFAULT CURRENT_DATE,
    
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 8. Buyback Rates (CREDIT FORGE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS buyback_rates (
    model_id TEXT PRIMARY KEY REFERENCES ai_models(id),
    tier TEXT NOT NULL CHECK (tier IN ('flash', 'standard', 'premium')),
    points_per_10_cents INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    max_buyback_per_cycle DECIMAL(10,6),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 9. Buyback Transactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS buyback_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL REFERENCES ai_models(id),
    cycle_id UUID REFERENCES user_model_cycles(id),
    
    points_spent INTEGER NOT NULL,
    points_balance_before INTEGER NOT NULL,
    points_balance_after INTEGER NOT NULL,
    
    credits_received DECIMAL(10,6) NOT NULL,
    credits_balance_before DECIMAL(10,6) NOT NULL,
    credits_balance_after DECIMAL(10,6) NOT NULL,
    
    exchange_rate INTEGER NOT NULL,
    discount_applied DECIMAL(5,4) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_buyback_user ON buyback_transactions(user_id);

-- ============================================================================
-- 10. Model Unlock Requirements (NEURALYNC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS model_unlock_requirements (
    model_id TEXT PRIMARY KEY REFERENCES ai_models(id),
    is_locked_by_default BOOLEAN DEFAULT true,
    
    min_interactions INTEGER,
    min_days_active INTEGER,
    require_all BOOLEAN DEFAULT false,  -- TRUE = AND, FALSE = OR
    
    unlock_options JSONB DEFAULT '[]',
    unlock_description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 11. User Model Unlocks
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_model_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL REFERENCES ai_models(id),
    
    unlock_method TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    unlocked_by UUID REFERENCES auth.users(id),
    
    UNIQUE(user_id, model_id)
);

CREATE INDEX idx_unlocks_user ON user_model_unlocks(user_id);

-- ============================================================================
-- 12. Streaming Reservations (DEADZONE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS streaming_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL REFERENCES ai_models(id),
    cycle_id UUID NOT NULL REFERENCES user_model_cycles(id),
    
    reserved_amount DECIMAL(10,6) NOT NULL,
    actual_amount DECIMAL(10,6),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '5 minutes'),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_reservations_active ON streaming_reservations(user_id, status) 
    WHERE status = 'active';

-- ============================================================================
-- Enable RLS
-- ============================================================================
ALTER TABLE user_model_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyback_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_model_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
CREATE POLICY "Users view own cycles" ON user_model_cycles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own credit transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own checkins" ON period_checkins
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own daily summary" ON daily_activity_summary
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own point transactions" ON orbit_point_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own stats" ON user_activity_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own buyback transactions" ON buyback_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own unlocks" ON user_model_unlocks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own reservations" ON streaming_reservations
    FOR SELECT USING (auth.uid() = user_id);

-- Public read for models and rates
CREATE POLICY "Anyone can view models" ON ai_models
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view buyback rates" ON buyback_rates
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view unlock requirements" ON model_unlock_requirements
    FOR SELECT USING (true);
