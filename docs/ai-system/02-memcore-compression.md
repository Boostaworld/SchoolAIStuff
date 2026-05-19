# MEMCORE Compression — Context Distillation System
## Deep Technical Specification

> **Module:** Cost Optimization & Workflow Efficiency  
> **Priority:** High — Enables Multi-Model Workflows  
> **Dependencies:** CHRONOLOCK Protocol (for credit tracking)

---

## 1. Executive Summary

MEMCORE Compression is a **context transfer system** that enables students to:
1. **"Save game"** on complex conversations using cheap models
2. **Transfer context** between different AI models seamlessly
3. **Reduce costs** by compressing verbose conversations into dense, prompt-ready blocks
4. **Enable multi-model workflows** (e.g., understand with Gemini 3 Pro → explain with 2.5 Pro)

This is NOT just a summary feature. It's a **strategic workflow tool** that transforms how students interact with multiple AI models.

---

## 2. Core Concept: The Multi-Model Workflow

### 2.1 The Problem

Students often need different models for different phases of work:

| Phase | Best Model | Why |
|-------|------------|-----|
| **Understanding** | Gemini 3 Pro Preview | Cutting-edge reasoning, grasps complex ideas |
| **Explanation** | Gemini 2.5 Pro | Excellent at step-by-step breakdowns |
| **Quick Drafts** | Claude Haiku / Flash | Fast, cheap, good for iteration |
| **Final Polish** | Claude Opus | Best writing quality |
| **Code Review** | Gemini 2.5 Pro | Large context, code-aware |

**Problem:** Switching models means losing context. Re-explaining a complex concept wastes credits and time.

### 2.2 The Solution: Portable Context Blocks

MEMCORE creates a **standardized context format** that any model can understand:

```
[MEMCORE v1.0 | Compressed from 47 messages | Original: 28,450 tokens]

## GOAL
Student is implementing a distributed cache system for their school's library app.
Requirements: Redis backend, Express.js API, React frontend with optimistic updates.

## CURRENT STATE
✓ Redis connection established (using ioredis client)
✓ Basic CRUD operations working for book lookups
✗ Cache invalidation strategy not yet decided
✗ Frontend integration pending

## KEY DECISIONS MADE
1. TTL-based expiration: 1 hour for popular books, 24h for rarely accessed
2. Write-through caching for inventory updates
3. Using Redis Streams for real-time sync (not Pub/Sub)

## TECHNICAL CONTEXT
- Node.js 20, Express 4.18, React 18.2
- Supabase Postgres as source of truth
- Vercel deployment (serverless, requires connection pooling)

## OPEN QUESTIONS
1. How to handle cache stampede during cold starts?
2. Should we implement probabilistic early expiration?

## NEXT STEP
Implement cache invalidation hooks in the Express middleware.
```

---

## 3. Database Schema

```sql
-- Stored compressions for history/reuse
CREATE TABLE context_compressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Source conversation
    source_conversation_id UUID,           -- Optional: link to conversation table
    source_model_id TEXT,                  -- Model that had the original conversation
    source_message_count INTEGER NOT NULL,
    source_token_count INTEGER NOT NULL,
    
    -- Compression output
    compressed_content TEXT NOT NULL,
    compressed_token_count INTEGER NOT NULL,
    compression_ratio DECIMAL(5,2) NOT NULL, -- e.g., 0.03 = 3% of original size
    
    -- Cost tracking
    compression_cost DECIMAL(10,6) NOT NULL, -- USD cost to create this compression
    model_used TEXT NOT NULL,              -- Model that performed compression
    
    -- Metadata
    title TEXT,                            -- Auto-generated or user-provided
    tags TEXT[],                           -- For searchability
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,                -- Optional expiration
    
    -- Usage tracking
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_compressions_user ON context_compressions(user_id);
CREATE INDEX idx_compressions_created ON context_compressions(created_at DESC);
CREATE INDEX idx_compressions_tags ON context_compressions USING GIN(tags);

-- Log compressions for analytics
CREATE TABLE compression_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compression_id UUID REFERENCES context_compressions(id),
    user_id UUID NOT NULL REFERENCES users(id),
    target_model_id TEXT NOT NULL,         -- Model the compression was pasted into
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. API Design

### 4.1 Endpoints

```typescript
// POST /api/ai/compress
// Compress current conversation into portable context block

interface CompressRequest {
  messages: Message[];                    // Full conversation history
  options?: {
    targetTokens?: number;                // Aim for this token count (default: 500)
    preserveCode?: boolean;               // Keep code blocks intact (default: true)
    focusAreas?: ('technical' | 'creative' | 'research' | 'discussion')[];
    customInstructions?: string;          // Additional compression directives
  };
}

interface CompressResponse {
  id: string;                             // Compression ID for future reference
  compressedContext: string;              // The actual compression output
  
  // Metrics
  originalMessages: number;
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;               // compressedTokens / originalTokens
  
  // Cost info
  compressionCost: number;                // USD cost of this compression
  estimatedSavingsPerModel: {             // Estimated savings if used instead of full context
    [modelId: string]: number;
  };
  
  // Metadata
  autoTitle: string;                      // AI-generated title for the compression
  suggestedTags: string[];
}

// GET /api/ai/compressions
// List user's saved compressions

interface ListCompressionsResponse {
  compressions: {
    id: string;
    title: string;
    tags: string[];
    compressedTokens: number;
    sourceModel: string;
    createdAt: string;
    timesUsed: number;
    preview: string;                      // First 200 chars
  }[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
}

// POST /api/ai/compressions/:id/expand
// Get full compression content and log usage

interface ExpandRequest {
  targetModelId: string;                  // Log which model this is being pasted into
}

interface ExpandResponse {
  compressedContext: string;
  formattedForModel: string;              // Slightly adjusted for target model's preferences
  suggestedFollowUp: string;              // AI-suggested prompt to continue
}
```

### 4.2 Compression System Prompt

```typescript
const COMPRESSION_SYSTEM_PROMPT = `You are MEMCORE, a context compression engine for the Orbit OS educational platform.

Your task is to analyze a conversation and produce a DENSE, PROMPT-READY context block that allows any AI model to continue the work seamlessly.

## Output Format

Use this exact structure:

\`\`\`
[MEMCORE v1.0 | Compressed from {N} messages | Original: {T} tokens]

## GOAL
{One clear sentence describing what the user is trying to accomplish}

## CURRENT STATE
{Bulleted list using ✓ for completed, ✗ for pending, → for in-progress}

## KEY DECISIONS MADE
{Numbered list of important choices/constraints established}

## TECHNICAL CONTEXT
{Relevant technical details: languages, frameworks, APIs, constraints}

## OPEN QUESTIONS
{Unresolved questions or blockers}

## NEXT STEP
{The immediate next action to take}
\`\`\`

## Compression Guidelines

1. **Be ruthlessly concise** — Every word must earn its place
2. **Preserve precision** — Technical terms, variable names, and specific values matter
3. **Maintain actionability** — The receiving model should know exactly what to do next
4. **Use shorthand** — "React 18.2" not "the React JavaScript library version 18.2"
5. **Compress, don't summarize** — This is for AI consumption, not human reading
6. **Keep code snippets** if they're essential to the context (use minimal excerpts)

## What to NEVER lose:
- The core goal/objective
- Critical constraints or requirements
- Specific technical decisions with rationale
- Current blockers or open questions
- The immediate next step

## Token Budget
Aim for {targetTokens} tokens. If the conversation is simple, use fewer. If complex, use up to 2x but no more.`;

const COMPRESSION_USER_PROMPT = (messages: Message[], options: CompressOptions) => `
Compress this ${messages.length}-message conversation into a portable context block.

${options.preserveCode ? 'PRESERVE essential code snippets (minimal excerpts only).' : 'OMIT code blocks, describe their purpose instead.'}
${options.focusAreas?.length ? `FOCUS especially on: ${options.focusAreas.join(', ')}` : ''}
${options.customInstructions ? `ADDITIONAL INSTRUCTIONS: ${options.customInstructions}` : ''}

<conversation>
${messages.map((m, i) => `[${i+1}] ${m.role}: ${m.content}`).join('\n\n')}
</conversation>

Generate the MEMCORE compression block now.`;
```

---

## 5. Service Implementation

```typescript
// services/memcore.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChronolockService } from './chronolock';
import { createClient } from '@supabase/supabase-js';
import { countTokens } from '@/lib/tokenizer';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CompressOptions {
  targetTokens?: number;
  preserveCode?: boolean;
  focusAreas?: ('technical' | 'creative' | 'research' | 'discussion')[];
  customInstructions?: string;
}

export interface CompressionResult {
  id: string;
  compressedContext: string;
  originalMessages: number;
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  compressionCost: number;
  estimatedSavingsPerModel: Record<string, number>;
  autoTitle: string;
  suggestedTags: string[];
}

// Model used for compressions — deliberately the cheapest
const COMPRESSION_MODEL = 'gemini-2.0-flash';
const COMPRESSION_MODEL_INPUT_PRICE = 0.10 / 1_000_000;  // $0.10 per 1M input tokens
const COMPRESSION_MODEL_OUTPUT_PRICE = 0.40 / 1_000_000; // $0.40 per 1M output tokens

export class MemcoreService {
  private gemini: GoogleGenerativeAI;
  private supabase;
  private chronolock: ChronolockService;

  constructor() {
    this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.chronolock = new ChronolockService();
  }

  /**
   * Compress a conversation into a portable context block
   */
  async compress(
    userId: string,
    messages: Message[],
    options: CompressOptions = {}
  ): Promise<CompressionResult> {
    const targetTokens = options.targetTokens ?? 500;
    
    // Calculate original token count
    const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const originalTokens = await countTokens(conversationText);

    // Build prompts
    const systemPrompt = COMPRESSION_SYSTEM_PROMPT.replace('{targetTokens}', targetTokens.toString());
    const userPrompt = this.buildUserPrompt(messages, options);

    // Estimate cost and check credits
    const estimatedInputTokens = await countTokens(systemPrompt + userPrompt);
    const estimatedOutputTokens = targetTokens * 1.5; // Buffer
    const estimatedCost = 
      (estimatedInputTokens * COMPRESSION_MODEL_INPUT_PRICE) +
      (estimatedOutputTokens * COMPRESSION_MODEL_OUTPUT_PRICE);

    // Pre-flight credit check
    const creditCheck = await this.chronolock.canProcessRequest(
      userId, 
      COMPRESSION_MODEL, 
      estimatedCost
    );

    if (!creditCheck.allowed) {
      throw new Error(`Insufficient credits for compression: ${creditCheck.reason}`);
    }

    // Perform compression
    const model = this.gemini.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
      ],
      generationConfig: {
        maxOutputTokens: Math.max(targetTokens * 2, 1000),
        temperature: 0.3, // Lower temperature for more consistent formatting
      }
    });

    const compressedContext = result.response.text();
    const compressedTokens = await countTokens(compressedContext);

    // Calculate actual cost
    const usageMetadata = result.response.usageMetadata;
    const actualInputTokens = usageMetadata?.promptTokenCount ?? estimatedInputTokens;
    const actualOutputTokens = usageMetadata?.candidatesTokenCount ?? compressedTokens;
    const actualCost = 
      (actualInputTokens * COMPRESSION_MODEL_INPUT_PRICE) +
      (actualOutputTokens * COMPRESSION_MODEL_OUTPUT_PRICE);

    // Deduct credits
    await this.chronolock.deductCredits(
      userId,
      COMPRESSION_MODEL,
      actualCost,
      `compression-${Date.now()}`,
      { input: actualInputTokens, output: actualOutputTokens }
    );

    // Calculate savings estimates for other models
    const estimatedSavings = await this.calculateSavingsEstimates(
      originalTokens,
      compressedTokens
    );

    // Generate auto-title
    const autoTitle = await this.generateTitle(compressedContext);
    const suggestedTags = await this.extractTags(compressedContext);

    // Store compression
    const { data: stored, error } = await this.supabase
      .from('context_compressions')
      .insert({
        user_id: userId,
        source_message_count: messages.length,
        source_token_count: originalTokens,
        compressed_content: compressedContext,
        compressed_token_count: compressedTokens,
        compression_ratio: compressedTokens / originalTokens,
        compression_cost: actualCost,
        model_used: COMPRESSION_MODEL,
        title: autoTitle,
        tags: suggestedTags,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to store compression:', error);
    }

    return {
      id: stored?.id ?? `temp-${Date.now()}`,
      compressedContext,
      originalMessages: messages.length,
      originalTokens,
      compressedTokens,
      compressionRatio: compressedTokens / originalTokens,
      compressionCost: actualCost,
      estimatedSavingsPerModel: estimatedSavings,
      autoTitle,
      suggestedTags,
    };
  }

  /**
   * Calculate how much using the compression saves vs full context
   */
  private async calculateSavingsEstimates(
    originalTokens: number,
    compressedTokens: number
  ): Promise<Record<string, number>> {
    const { data: models } = await this.supabase
      .from('ai_models')
      .select('id, input_price_per_million')
      .eq('is_active', true);

    if (!models) return {};

    const tokenDifference = originalTokens - compressedTokens;
    const savings: Record<string, number> = {};

    for (const model of models) {
      const pricePerToken = model.input_price_per_million / 1_000_000;
      savings[model.id] = tokenDifference * pricePerToken;
    }

    return savings;
  }

  /**
   * Generate a short title from compressed content
   */
  private async generateTitle(compressedContext: string): Promise<string> {
    // Extract from GOAL section if present
    const goalMatch = compressedContext.match(/## GOAL\n(.+?)(?:\n|$)/);
    if (goalMatch) {
      // Truncate to first 50 chars
      return goalMatch[1].slice(0, 50) + (goalMatch[1].length > 50 ? '...' : '');
    }
    return 'Untitled Context';
  }

  /**
   * Extract relevant tags from compressed content
   */
  private async extractTags(compressedContext: string): Promise<string[]> {
    const tags: string[] = [];
    
    // Look for common frameworks/languages
    const techPatterns = [
      /react/i, /vue/i, /angular/i, /node\.?js/i, /python/i,
      /typescript/i, /javascript/i, /rust/i, /go/i,
      /postgres/i, /redis/i, /mongodb/i, /supabase/i,
      /api/i, /database/i, /frontend/i, /backend/i,
    ];

    for (const pattern of techPatterns) {
      if (pattern.test(compressedContext)) {
        tags.push(pattern.source.replace(/\\\.|\?/g, '').toLowerCase());
      }
    }

    // Look for focus area indicators
    if (/code|function|class|bug|error/i.test(compressedContext)) tags.push('coding');
    if (/essay|write|paragraph/i.test(compressedContext)) tags.push('writing');
    if (/research|study|paper/i.test(compressedContext)) tags.push('research');
    if (/math|calcul|equation/i.test(compressedContext)) tags.push('math');

    return [...new Set(tags)].slice(0, 5); // Max 5 unique tags
  }

  private buildUserPrompt(messages: Message[], options: CompressOptions): string {
    let prompt = `Compress this ${messages.length}-message conversation into a portable context block.\n\n`;

    if (options.preserveCode !== false) {
      prompt += 'PRESERVE essential code snippets (minimal excerpts only).\n';
    } else {
      prompt += 'OMIT code blocks, describe their purpose instead.\n';
    }

    if (options.focusAreas?.length) {
      prompt += `FOCUS especially on: ${options.focusAreas.join(', ')}\n`;
    }

    if (options.customInstructions) {
      prompt += `ADDITIONAL INSTRUCTIONS: ${options.customInstructions}\n`;
    }

    prompt += '\n<conversation>\n';
    prompt += messages.map((m, i) => `[${i+1}] ${m.role}: ${m.content}`).join('\n\n');
    prompt += '\n</conversation>\n\nGenerate the MEMCORE compression block now.';

    return prompt;
  }
}
```

---

## 6. Frontend Integration

### 6.1 Compact Button Component

```tsx
// components/ai/CompactButton.tsx

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Copy, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface CompactButtonProps {
  messages: Message[];
  onCompressed?: (result: CompressionResult) => void;
}

export function CompactButton({ messages, onCompressed }: CompactButtonProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCompress = async () => {
    if (messages.length < 2) {
      toast({
        title: 'Not enough context',
        description: 'Need at least 2 messages to compress',
        variant: 'warning',
      });
      return;
    }

    setIsCompressing(true);
    
    try {
      const response = await fetch('/api/ai/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) throw new Error('Compression failed');

      const data = await response.json();
      setResult(data);
      onCompressed?.(data);

      toast({
        title: 'MEMCORE Compression Complete',
        description: `${data.originalTokens.toLocaleString()} → ${data.compressedTokens.toLocaleString()} tokens (${Math.round(data.compressionRatio * 100)}%)`,
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Compression Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    
    await navigator.clipboard.writeText(result.compressedContext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    toast({
      title: 'Context Copied',
      description: 'Paste into any AI chat to continue where you left off',
      variant: 'success',
    });
  };

  return (
    <div className="flex items-center gap-2">
      <motion.button
        onClick={handleCompress}
        disabled={isCompressing || messages.length < 2}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-violet-500/30 text-violet-300 hover:border-violet-400/50 hover:text-violet-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isCompressing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {isCompressing ? 'Compressing...' : 'Compact'}
        </span>
      </motion.button>

      <AnimatePresence>
        {result && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:border-emerald-400/50 transition-all"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {copied ? 'Copied!' : 'Copy'}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 6.2 Compression Preview Modal

```tsx
// components/ai/CompressionPreview.tsx

import { motion } from 'framer-motion';
import { X, ArrowRight, TrendingDown, Clock, Copy } from 'lucide-react';

interface CompressionPreviewProps {
  result: CompressionResult;
  onClose: () => void;
  onCopy: () => void;
}

export function CompressionPreview({ result, onClose, onCopy }: CompressionPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">MEMCORE Compression</h3>
              <p className="text-sm text-slate-400">{result.autoTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {result.originalMessages}
            </div>
            <div className="text-xs text-slate-400">Messages</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg text-slate-400">{result.originalTokens.toLocaleString()}</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
              <span className="text-lg font-bold text-emerald-400">{result.compressedTokens.toLocaleString()}</span>
            </div>
            <div className="text-xs text-slate-400">Tokens</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {Math.round((1 - result.compressionRatio) * 100)}%
            </div>
            <div className="text-xs text-slate-400">Reduced</div>
          </div>
        </div>

        {/* Content Preview */}
        <div className="p-4 max-h-64 overflow-y-auto">
          <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono bg-slate-800 p-4 rounded-lg">
            {result.compressedContext}
          </pre>
        </div>

        {/* Savings Breakdown */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/30">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Estimated Savings (vs. full context)</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(result.estimatedSavingsPerModel)
              .filter(([_, savings]) => savings > 0.001)
              .slice(0, 4)
              .map(([modelId, savings]) => (
                <span
                  key={modelId}
                  className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                >
                  {modelId}: ${savings.toFixed(4)}
                </span>
              ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            onClick={onCopy}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-violet-500 hover:bg-violet-400 text-white rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy to Clipboard
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

---

## 7. Use Case Deep Dives

### Scenario A: The Multi-Model Understanding Flow

**Context:** Student "Alex" is learning about quantum computing. They want to understand qubits deeply, then get a step-by-step explanation.

**Flow:**

1. **Phase 1: Deep Understanding (Gemini 3 Pro Preview)**
   - Alex opens Research Lab, selects Gemini 3 Pro Preview
   - Sends: "I want to understand how qubits work at a fundamental level. Don't explain yet — just help me grasp the core concepts."
   - 15-message deep dive exploring superposition, entanglement, decoherence
   - Gemini 3 Pro Preview helps Alex build mental models through Socratic questioning
   - Total tokens: ~18,000 | Cost: $0.45

2. **Phase 2: Compress**
   - Alex clicks "Compact" button
   - MEMCORE compresses to 420 tokens:
   ```
   [MEMCORE v1.0 | Compressed from 15 messages | Original: 18,234 tokens]
   
   ## GOAL
   Student building foundational understanding of quantum computing, specifically qubits.
   
   ## CURRENT STATE
   ✓ Understands superposition as "quantum coin in air" — both states until measured
   ✓ Grasps entanglement as "spooky action" — correlated states across distance
   ✓ Knows decoherence is enemy — environmental interference collapses states
   ✗ Hasn't connected to practical quantum gates yet
   
   ## KEY CONCEPTS INTERNALIZED
   1. Qubit = unit sphere (Bloch sphere representation)
   2. Measurement = probabilistic collapse to |0⟩ or |1⟩
   3. Quantum advantage = parallel computation via superposition
   4. Error correction crucial due to decoherence
   
   ## STUDENT LEARNING STYLE
   - Prefers visual analogies (coin, sphere, etc.)
   - Asks "why" before "how"
   - CS background, comfortable with linear algebra basics
   
   ## NEXT STEP
   Ready for step-by-step explanation of quantum gates (Hadamard, CNOT).
   ```
   - Compression cost: $0.002 (Flash model)

3. **Phase 3: Step-by-Step Explanation (Gemini 2.5 Pro)**
   - Alex opens new chat with Gemini 2.5 Pro
   - Pastes MEMCORE block
   - Sends: "Continue from here. Give me a step-by-step explanation of quantum gates, building on my understanding."
   - Gemini 2.5 Pro reads context, knows Alex's learning style, proceeds efficiently
   - 8 messages for complete gate explanation
   - Total tokens: ~6,000 | Cost: $0.15 (instead of ~$0.45 if re-explaining from scratch)

**Outcome:** Alex paid $0.45 + $0.002 + $0.15 = **$0.60** instead of estimated $0.90+ for full re-contextualization. More importantly, the explanation was **better** because Gemini 2.5 Pro knew Alex's mental models and learning style.

---

### Scenario B: The Project Handoff

**Context:** Student "Jamie" has been pair-programming with Claude Opus on a React component. They hit their Opus credit limit but need to finish today.

**Flow:**

1. Jamie has 28 messages with Opus about a custom hook for form validation
2. Opus limit reached: "$2.00 / $2.00 used — resets in 47h"
3. Jamie clicks "Compact":
   ```
   [MEMCORE v1.0 | Compressed from 28 messages | Original: 31,889 tokens]
   
   ## GOAL
   Build useFormValidation hook with real-time validation, debouncing, and async checks.
   
   ## CURRENT STATE
   ✓ Basic hook structure with useState for errors
   ✓ Sync validation working (required, minLength, email regex)
   ✓ Debounce implemented using useRef + setTimeout
   → Async validation (username availability) partially implemented
   ✗ Error message formatting not started
   
   ## CODE CONTEXT
   Hook signature: useFormValidation(schema: ValidationSchema, options?: Options)
   Schema format: { fieldName: { rules: Rule[], async?: AsyncValidator } }
   Current file: hooks/useFormValidation.ts (127 lines)
   
   ## DECISIONS MADE
   1. Use Zod for schema definition (not Yup — smaller bundle)
   2. Debounce only async validators, not sync
   3. Return { errors, isValidating, validate, resetErrors }
   4. Async validators run on blur, not on change
   
   ## CURRENT CODE STATE
   \`\`\`typescript
   const asyncValidators = useRef(new Map<string, AbortController>());
   // Need to implement: cancel previous, start new, update errors on complete
   \`\`\`
   
   ## NEXT STEP
   Complete async validation with proper abort handling for username check.
   ```

4. Jamie opens Gemini 2.5 Pro (has $4.50 remaining)
5. Pastes context, says: "Continue implementing the async validation"
6. Gemini picks up exactly where Opus left off, understands all decisions

**Outcome:** Zero context re-establishment. Jamie's project continues seamlessly across models.

---

### Scenario C: The Study Session Archive

**Context:** Student "Taylor" uses AI intensively during study sessions. They want to "bookmark" important conversations for later.

**Flow:**

1. Taylor has weekly study sessions with various AI models
2. After each productive session, they click "Compact" with custom title
3. Saved compressions build a personal library:
   - "Calculus Integration Techniques" (from Claude Sonnet)
   - "Spanish Subjunctive Mastery" (from Gemini 2.5 Pro)  
   - "Physics Projectile Motion" (from Gemini Flash)

4. During exam prep, Taylor opens "My Compressions" panel
5. Searches for "calculus", finds the relevant compression
6. Copies into Claude Opus for advanced problem-solving practice
7. Claude immediately understands Taylor's current level and gaps

**Outcome:** Compressions become **reusable learning checkpoints** — far more valuable than raw chat history.

---

## 8. Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| Very short conversation (< 5 messages) | Show warning: "Conversation too short for meaningful compression. Consider continuing before compressing." |
| Conversation is mostly code | Enable `preserveCode: true` by default, extract key snippets only |
| Multiple compression attempts | Each creates new record, user can choose which to keep |
| Compression model unavailable | Fallback to alternate cheap model (Gemini 2.5 Flash → Claude Haiku) |
| User tries to compress empty chat | Button disabled until 2+ messages exist |
| Compression exceeds target tokens | Accept up to 2x target, warn if significantly over |
| User pastes old compression (months old) | Show warning: "This context may be outdated. Model knowledge may have changed." |
