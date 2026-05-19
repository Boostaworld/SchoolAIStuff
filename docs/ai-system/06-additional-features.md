# Additional Features — THERMAL THROTTLE, MNEMONIC CACHE, NEURALYNC
## Deep Technical Specification

> **Module:** Supporting Systems  
> **Priority:** Medium — Enhancement Layer  
> **Dependencies:** CHRONOLOCK Protocol, User Progression System

---

# Part 1: THERMAL THROTTLE — Rate Limiting System

## 1.1 Executive Summary

THERMAL THROTTLE prevents API abuse through **adaptive rate limiting** that:
1. Limits requests-per-minute based on user tier
2. Detects and blocks automated/bot behavior
3. Provides graceful degradation, not hard blocks
4. Educates users about rate limits via themed UI

---

## 1.2 Rate Limit Tiers

```typescript
// config/thermal-throttle.ts

export interface RateLimitTier {
  name: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstAllowance: number;        // Extra requests allowed in 10-second window
  cooldownSeconds: number;        // Cooldown when limit hit
  warningThreshold: number;       // % of limit before warning
}

export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  free: {
    name: 'Free Tier',
    requestsPerMinute: 5,
    requestsPerHour: 60,
    burstAllowance: 2,
    cooldownSeconds: 60,
    warningThreshold: 0.8,
  },
  standard: {
    name: 'Standard',
    requestsPerMinute: 15,
    requestsPerHour: 300,
    burstAllowance: 5,
    cooldownSeconds: 30,
    warningThreshold: 0.8,
  },
  premium: {
    name: 'Premium',
    requestsPerMinute: 30,
    requestsPerHour: 600,
    burstAllowance: 10,
    cooldownSeconds: 15,
    warningThreshold: 0.9,
  },
  admin: {
    name: 'Admin',
    requestsPerMinute: 100,
    requestsPerHour: 2000,
    burstAllowance: 20,
    cooldownSeconds: 5,
    warningThreshold: 0.95,
  },
};
```

## 1.3 Implementation with Sliding Window

```typescript
// services/thermal-throttle.ts

import Redis from 'ioredis';

export class ThermalThrottleService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
  }

  /**
   * Check if request is allowed, using sliding window counter
   */
  async checkRateLimit(
    userId: string,
    tier: string
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetIn: number;
    warningLevel: 'none' | 'approaching' | 'exceeded';
  }> {
    const config = RATE_LIMIT_TIERS[tier] ?? RATE_LIMIT_TIERS.free;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const key = `ratelimit:${userId}:${Math.floor(now / windowMs)}`;

    // Increment counter
    const count = await this.redis.incr(key);
    
    // Set expiry on first request
    if (count === 1) {
      await this.redis.pexpire(key, windowMs);
    }

    const remaining = Math.max(0, config.requestsPerMinute - count);
    const ttl = await this.redis.pttl(key);
    const resetIn = ttl > 0 ? Math.ceil(ttl / 1000) : 60;

    // Determine warning level
    let warningLevel: 'none' | 'approaching' | 'exceeded' = 'none';
    const usagePercent = count / config.requestsPerMinute;
    
    if (count > config.requestsPerMinute) {
      warningLevel = 'exceeded';
    } else if (usagePercent >= config.warningThreshold) {
      warningLevel = 'approaching';
    }

    // Allow burst allowance
    const effectiveLimit = config.requestsPerMinute + config.burstAllowance;
    const allowed = count <= effectiveLimit;

    return { allowed, remaining, resetIn, warningLevel };
  }

  /**
   * Detect suspicious patterns (potential bot behavior)
   */
  async detectAnomalies(userId: string): Promise<{
    suspicious: boolean;
    reason?: string;
    riskScore: number;
  }> {
    const patterns = await this.getRecentPatterns(userId);
    let riskScore = 0;
    const reasons: string[] = [];

    // Check for inhuman speed (requests < 500ms apart)
    if (patterns.avgTimeBetweenRequests < 500) {
      riskScore += 30;
      reasons.push('Requests too fast');
    }

    // Check for identical prompts in sequence
    if (patterns.identicalPromptCount > 3) {
      riskScore += 20;
      reasons.push('Repeated identical prompts');
    }

    // Check for unusual hours (if user has established pattern)
    if (patterns.unusualTimeOfDay) {
      riskScore += 10;
      reasons.push('Unusual activity time');
    }

    return {
      suspicious: riskScore >= 50,
      reason: reasons.join('; '),
      riskScore,
    };
  }
}
```

## 1.4 UI Treatment

```tsx
// When approaching limit
<Toast variant="warning">
  <ToastTitle>THERMAL WARNING</ToastTitle>
  <ToastDescription>
    Neural pathways heating up. {remaining} requests remaining this minute.
  </ToastDescription>
</Toast>

// When limit exceeded
<Toast variant="error">
  <ToastTitle>THERMAL THROTTLE ENGAGED</ToastTitle>
  <ToastDescription>
    Cooldown active. Resume in {resetIn} seconds.
    <Progress value={(60 - resetIn) / 60 * 100} />
  </ToastDescription>
</Toast>
```

---

# Part 2: MNEMONIC CACHE — Response Deduplication

## 2.1 Executive Summary

MNEMONIC CACHE prevents charging for identical requests by:
1. Caching responses for a short window (5 minutes)
2. Detecting near-duplicate prompts (fuzzy matching)
3. Returning cached responses instantly with 0 cost
4. Showing clear UI indication of cached responses

---

## 2.2 Cache Strategy

```typescript
// services/mnemonic-cache.ts

import { createHash } from 'crypto';
import Redis from 'ioredis';

export interface CachedResponse {
  content: string;
  modelId: string;
  tokens: { input: number; output: number };
  cachedAt: number;
  expiresAt: number;
  hitCount: number;
}

export class MnemonicCacheService {
  private redis: Redis;
  private readonly CACHE_TTL = 5 * 60; // 5 minutes
  private readonly FUZZY_THRESHOLD = 0.95; // 95% similarity

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
  }

  /**
   * Generate cache key from normalized prompt
   */
  private generateKey(userId: string, modelId: string, prompt: string): string {
    const normalized = this.normalizePrompt(prompt);
    const hash = createHash('sha256')
      .update(`${userId}:${modelId}:${normalized}`)
      .digest('hex')
      .slice(0, 16);
    return `memcache:${hash}`;
  }

  /**
   * Normalize prompt for comparison
   */
  private normalizePrompt(prompt: string): string {
    return prompt
      .toLowerCase()
      .replace(/\s+/g, ' ')           // Collapse whitespace
      .replace(/[^\w\s]/g, '')        // Remove punctuation
      .trim();
  }

  /**
   * Check cache for existing response
   */
  async get(
    userId: string,
    modelId: string,
    prompt: string
  ): Promise<CachedResponse | null> {
    const key = this.generateKey(userId, modelId, prompt);
    const cached = await this.redis.get(key);
    
    if (!cached) return null;

    const response: CachedResponse = JSON.parse(cached);
    
    // Increment hit count
    response.hitCount += 1;
    await this.redis.setex(key, this.CACHE_TTL, JSON.stringify(response));

    return response;
  }

  /**
   * Store response in cache
   */
  async set(
    userId: string,
    modelId: string,
    prompt: string,
    content: string,
    tokens: { input: number; output: number }
  ): Promise<void> {
    const key = this.generateKey(userId, modelId, prompt);
    const now = Date.now();
    
    const cached: CachedResponse = {
      content,
      modelId,
      tokens,
      cachedAt: now,
      expiresAt: now + (this.CACHE_TTL * 1000),
      hitCount: 0,
    };

    await this.redis.setex(key, this.CACHE_TTL, JSON.stringify(cached));
  }

  /**
   * Check for near-duplicate (fuzzy match)
   */
  async findSimilar(
    userId: string,
    modelId: string,
    prompt: string
  ): Promise<CachedResponse | null> {
    // Get recent prompts from this user
    const recentKeys = await this.redis.keys(`memcache:${userId.slice(0, 8)}*`);
    
    if (recentKeys.length === 0) return null;

    const normalized = this.normalizePrompt(prompt);
    
    for (const key of recentKeys.slice(0, 10)) { // Check last 10
      const cached = await this.redis.get(key);
      if (!cached) continue;
      
      const response: CachedResponse = JSON.parse(cached);
      
      // Simple Jaccard similarity
      const similarity = this.calculateSimilarity(normalized, key);
      if (similarity >= this.FUZZY_THRESHOLD) {
        return response;
      }
    }

    return null;
  }

  private calculateSimilarity(a: string, b: string): number {
    const setA = new Set(a.split(' '));
    const setB = new Set(b.split(' '));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }
}
```

## 2.3 UI Indication

```tsx
// Response header when cached
<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs">
  <Database className="w-3 h-3 text-emerald-400" />
  <span className="text-emerald-300">
    Retrieved from MNEMONIC CACHE — 0 credits used
  </span>
</div>
```

## 2.4 Use Cases

**Scenario A: Accidental Double-Click**
- User clicks send twice by accident
- Second request hits cache → returns instantly
- User sees same response, pays $0

**Scenario B: Iterative Refinement**
- User asks "What is photosynthesis?"
- 2 minutes later asks "what is photosynthesis"
- Fuzzy match triggers → cached response
- Toast: "Similar question detected. Using cached response."

**Scenario C: Teaching Moment**
- User asks same question 10 times
- After 5th cache hit, show educational prompt:
  "You've asked this 5 times. Would you like to save this to your notes?"

---

# Part 3: NEURALYNC — Progressive Model Unlocks

## 3.1 Executive Summary

NEURALYNC creates a **progression system** for AI model access:
1. New users start with basic models only
2. Advanced models unlock through **engagement & usage** (NOT levels — this platform has no level system)
3. Creates "aspirational" goals for students
4. Ensures students have experience before accessing expensive tools

> [!NOTE]
> **No levels exist in Orbit OS currently.** Unlock requirements are based on:
> - Total AI interactions (query count)
> - Days active on platform
> - Teacher approval

> [!TIP]
> **Future Enhancement: Leveling System**  
> The current `user_activity_stats` table tracks interactions and days active — this is the foundation for a potential XP/leveling system. If added later, levels could be calculated as:
> ```
> level = floor(sqrt(total_interactions / 10) + days_active / 7)
> ```
> Model unlock requirements could then reference levels instead of raw interaction counts.

---

## 3.2 Unlock Requirements

| Model | Default Locked? | Unlock Requirements |
|-------|-----------------|---------------------|
| Gemini 2.0/2.5 Flash | No | Available immediately |
| Claude Haiku | No | Available immediately |
| Gemini 2.5 Pro | Yes | 30+ AI interactions OR 7+ days active |
| Claude Sonnet | Yes | 50+ AI interactions OR teacher approval |
| Gemini 3 Pro Preview | Yes | 100+ AI interactions AND 14+ days active |
| Claude Opus | Yes | Teacher approval only (most expensive model) |

## 3.3 Database Schema

```sql
-- Model unlock definitions
CREATE TABLE model_unlock_requirements (
    model_id TEXT PRIMARY KEY REFERENCES ai_models(id),
    is_locked_by_default BOOLEAN DEFAULT true,
    
    -- Usage-based unlock (no levels in this platform)
    min_interactions INTEGER,           -- Total AI queries sent
    min_days_active INTEGER,            -- Days with at least 1 period check-in
    require_all BOOLEAN DEFAULT false,  -- TRUE = AND, FALSE = OR
    
    -- Alternative unlocks
    unlock_options JSONB DEFAULT '[]',
    -- Example: [
    --   {"type": "interactions", "count": 50},
    --   {"type": "days_active", "count": 7},
    --   {"type": "teacher_approval"}
    -- ]
    
    -- Description for UI
    unlock_description TEXT,
    unlock_icon TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- User unlock progress
CREATE TABLE user_model_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    model_id TEXT NOT NULL REFERENCES ai_models(id),
    
    unlock_method TEXT NOT NULL,  -- 'interactions', 'days_active', 'teacher_approval'
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    unlocked_by UUID,             -- Teacher ID if approved
    
    UNIQUE(user_id, model_id)
);

-- Track user activity stats
CREATE TABLE user_activity_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    total_ai_interactions INTEGER DEFAULT 0,
    days_active INTEGER DEFAULT 0,
    first_active_date DATE,
    last_active_date DATE,
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

## 3.4 Service Implementation

```typescript
// services/neuralync.ts

export interface UnlockStatus {
  modelId: string;
  isUnlocked: boolean;
  unlockedVia?: string;
  unlockedAt?: Date;
  
  // If locked, what are the unlock options?
  requirements?: {
    type: 'interactions' | 'days_active' | 'teacher_approval';
    current: number;
    required: number;
    description: string;
    progress: number;  // 0-1
  }[];
}

export class NeuralyncService {
  
  async getUnlockStatus(userId: string, modelId: string): Promise<UnlockStatus> {
    // Check if already unlocked
    const { data: unlock } = await this.supabase
      .from('user_model_unlocks')
      .select('*')
      .eq('user_id', userId)
      .eq('model_id', modelId)
      .single();

    if (unlock) {
      return {
        modelId,
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
      return { modelId, isUnlocked: true };
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
        isUnlocked: true,
        unlockedVia: satisfiedReq?.type,
        unlockedAt: new Date(),
      };
    }

    return {
      modelId,
      isUnlocked: false,
      requirements,
    };
  }

  private async buildRequirementProgress(
    userId: string,
    req: any
  ): Promise<UnlockStatus['requirements']> {
    const requirements = [];
    const stats = await this.getUserStats(userId);

    // Interaction count requirement
    if (req.min_interactions) {
      requirements.push({
        type: 'interactions' as const,
        current: stats.total_ai_interactions,
        required: req.min_interactions,
        description: `Complete ${req.min_interactions} AI interactions`,
        progress: Math.min(1, stats.total_ai_interactions / req.min_interactions),
      });
    }

    // Days active requirement
    if (req.min_days_active) {
      requirements.push({
        type: 'days_active' as const,
        current: stats.days_active,
        required: req.min_days_active,
        description: `Be active for ${req.min_days_active} days`,
        progress: Math.min(1, stats.days_active / req.min_days_active),
      });
    }

    // Parse unlock_options for teacher approval
    for (const option of req.unlock_options || []) {
      if (option.type === 'teacher_approval') {
        requirements.push({
          type: 'teacher_approval' as const,
          current: 0,
          required: 1,
          description: 'Get teacher approval',
          progress: 0,
        });
      }
    }

    return requirements;
  }

  private async getUserStats(userId: string) {
    const { data } = await this.supabase
      .from('user_activity_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    return data ?? { total_ai_interactions: 0, days_active: 0 };
  }

  async unlockModel(
    userId: string,
    modelId: string,
    method: string,
    approvedBy?: string
  ): Promise<void> {
    await this.supabase.from('user_model_unlocks').insert({
      user_id: userId,
      model_id: modelId,
      unlock_method: method,
      unlocked_by: approvedBy,
    });

    // Notify user
    await this.sendUnlockNotification(userId, modelId);
  }
}
```

## 3.5 UI: Unlock Progress Panel

```tsx
// components/ai/ModelUnlockProgress.tsx

export function ModelUnlockProgress({ userId }: { userId: string }) {
  const { data: models } = useModels();
  const { data: unlocks } = useUnlockStatuses(userId);

  return (
    <div className="grid grid-cols-3 gap-6 p-6">
      {models?.map((model) => {
        const status = unlocks?.[model.id];
        
        return (
          <motion.div
            key={model.id}
            className={`
              relative p-4 rounded-xl border-2 transition-all
              ${status?.isUnlocked
                ? 'bg-slate-800 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/50 border-slate-700/50 opacity-75'
              }
            `}
          >
            {/* Lock overlay */}
            {!status?.isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-xl">
                <Lock className="w-8 h-8 text-slate-500" />
              </div>
            )}

            <div className="flex items-center gap-3 mb-3">
              <ModelIcon modelId={model.id} />
              <div>
                <h3 className="font-semibold text-white">{model.display_name}</h3>
                <span className="text-xs text-slate-400">{model.provider}</span>
              </div>
            </div>

            {/* Progress bars for locked models */}
            {!status?.isUnlocked && status?.requirements && (
              <div className="space-y-2 mt-4">
                {status.requirements.map((req, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{req.description}</span>
                      <span>{Math.round(req.progress * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-violet-500 to-cyan-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${req.progress * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Unlocked badge */}
            {status?.isUnlocked && (
              <div className="absolute top-2 right-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
```

## 3.6 Use Cases

**Scenario A: Natural Progression**
- New student starts with Flash/Haiku only
- Uses AI regularly over first week
- Hits 30 interactions → Gemini Pro auto-unlocks
- Celebration animation, notification
- Student feels accomplishment

**Scenario B: Active User Fast-Track**
- Student is very active but doesn't use AI much
- After 7 days active on platform, Pro unlocks
- Days-active requirement satisfied before interactions

**Scenario C: Teacher Approval for Opus**
- Student needs Opus for research project
- Opus requires teacher approval (most expensive)
- Teacher views request in admin panel
- Reviews student's usage history, approves
- Student gets Opus access
- Teacher can revoke if misused
