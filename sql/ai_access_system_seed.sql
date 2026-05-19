-- ============================================================================
-- AI ACCESS SYSTEM - Seed Data
-- ============================================================================
-- Run AFTER ai_access_system.sql
-- ============================================================================

-- ============================================================================
-- Seed AI Models
-- ============================================================================
INSERT INTO ai_models (id, display_name, provider, tier, input_cost_per_million, output_cost_per_million, max_context_tokens, max_output_tokens, is_active)
VALUES 
    -- Google Flash tier
    ('gemini-2.0-flash', 'Gemini 2.0 Flash', 'google', 'flash', 0.075, 0.30, 1048576, 8192, true),
    ('gemini-2.5-flash', 'Gemini 2.5 Flash', 'google', 'flash', 0.075, 0.30, 1048576, 8192, true),
    
    -- Google Standard tier
    ('gemini-2.5-pro', 'Gemini 2.5 Pro', 'google', 'standard', 1.25, 10.00, 1048576, 8192, true),
    
    -- Google Premium tier
    ('gemini-3-pro-preview', 'Gemini 3 Pro Preview', 'google', 'premium', 2.50, 15.00, 1048576, 8192, true),
    
    -- Anthropic Flash tier
    ('claude-haiku-3.5', 'Claude 3.5 Haiku', 'anthropic', 'flash', 0.80, 4.00, 200000, 8192, true),
    
    -- Anthropic Standard tier
    ('claude-sonnet-4', 'Claude Sonnet 4', 'anthropic', 'standard', 3.00, 15.00, 200000, 8192, true),
    
    -- Anthropic Premium tier
    ('claude-opus-4', 'Claude Opus 4', 'anthropic', 'premium', 15.00, 75.00, 200000, 8192, true)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    input_cost_per_million = EXCLUDED.input_cost_per_million,
    output_cost_per_million = EXCLUDED.output_cost_per_million,
    updated_at = now();

-- ============================================================================
-- Seed Buyback Rates (CREDIT FORGE)
-- ============================================================================
INSERT INTO buyback_rates (model_id, tier, points_per_10_cents, is_active, max_buyback_per_cycle)
VALUES
    -- Flash tier: 50 points per $0.10
    ('gemini-2.0-flash', 'flash', 50, true, 2.50),
    ('gemini-2.5-flash', 'flash', 50, true, 2.50),
    ('claude-haiku-3.5', 'flash', 75, true, 2.50),
    
    -- Standard tier: 150 points per $0.10
    ('gemini-2.5-pro', 'standard', 150, true, 2.50),
    ('claude-sonnet-4', 'standard', 150, true, 2.50),
    
    -- Premium tier: 400-500 points per $0.10
    ('gemini-3-pro-preview', 'premium', 400, true, 2.50),
    ('claude-opus-4', 'premium', 500, true, 2.50)
ON CONFLICT (model_id) DO UPDATE SET
    points_per_10_cents = EXCLUDED.points_per_10_cents,
    updated_at = now();

-- ============================================================================
-- Seed Model Unlock Requirements (NEURALYNC)
-- ============================================================================
INSERT INTO model_unlock_requirements (model_id, is_locked_by_default, min_interactions, min_days_active, require_all, unlock_description)
VALUES
    -- Flash models: Available immediately
    ('gemini-2.0-flash', false, NULL, NULL, false, 'Available immediately'),
    ('gemini-2.5-flash', false, NULL, NULL, false, 'Available immediately'),
    ('claude-haiku-3.5', false, NULL, NULL, false, 'Available immediately'),
    
    -- Standard models: 30 interactions OR 7 days
    ('gemini-2.5-pro', true, 30, 7, false, 'Complete 30 AI interactions OR be active for 7 days'),
    ('claude-sonnet-4', true, 50, NULL, false, 'Complete 50 AI interactions OR get teacher approval'),
    
    -- Premium models: Stricter requirements
    ('gemini-3-pro-preview', true, 100, 14, true, 'Complete 100 AI interactions AND be active for 14 days'),
    ('claude-opus-4', true, NULL, NULL, false, 'Teacher approval required')
ON CONFLICT (model_id) DO UPDATE SET
    min_interactions = EXCLUDED.min_interactions,
    min_days_active = EXCLUDED.min_days_active,
    require_all = EXCLUDED.require_all,
    unlock_description = EXCLUDED.unlock_description;

-- ============================================================================
-- Add unlock_options for teacher approval
-- ============================================================================
UPDATE model_unlock_requirements 
SET unlock_options = '[{"type": "teacher_approval"}]'::jsonb
WHERE model_id IN ('claude-sonnet-4', 'claude-opus-4');

-- ============================================================================
-- Default Credit Limits by Model Tier
-- ============================================================================
-- These will be used when creating new cycles
-- Flash: $2.00 per 72-hour cycle
-- Standard: $5.00 per 72-hour cycle  
-- Premium: $5.00 per 72-hour cycle
-- (Configured in ChronolockService, not stored in DB)
