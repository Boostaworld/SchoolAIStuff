import { supabase } from '@/lib/supabase';

interface LogActivityParams {
  userId: string;
  activityType: 'chat_message' | 'image_generation' | 'research_query' | 'vision_session' | 'prompt_improve' | 'image_edit';
  model: string;
  estimatedTokens?: number;
  estimatedCostUsd?: number;
  userInput?: string;
  aiResponse?: string;
  imagePrompt?: string;
  imageUrl?: string;
  imageModel?: string;
  sessionId?: string;
  parentActivityId?: string;
  feature?: 'vision_lab' | 'research_lab' | 'synthesis_lab' | 'dm_assistant' | 'command_deck' | 'image_editor';
  ipAddress?: string;
  userAgent?: string;
}

// ====================================
// BATCHING SYSTEM TO PREVENT DB FLOODING
// ====================================

class ActivityLogBatcher {
  private queue: any[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10; // Insert max 10 at once
  private readonly FLUSH_INTERVAL = 5000; // Flush every 5 seconds
  private readonly MAX_QUEUE_SIZE = 100; // Prevent memory bloat

  /**
   * Add activity to batch queue (doesn't insert immediately)
   */
  enqueue(activity: any) {
    // Prevent queue from growing too large
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      console.warn('⚠️ Activity log queue full, forcing flush');
      this.flush();
    }

    this.queue.push(activity);

    // Auto-flush when batch is full
    if (this.queue.length >= this.BATCH_SIZE) {
      this.flush();
    } else {
      // Schedule flush if not already scheduled
      this.scheduleFlush();
    }
  }

  /**
   * Schedule a flush to happen soon (debounced)
   */
  private scheduleFlush() {
    if (this.flushTimer) return; // Already scheduled

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Immediately flush all queued activities to database
   */
  async flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    try {
      const { error } = await supabase.from('ai_activity_logs').insert(batch);

      if (error) {
        console.error('❌ Failed to flush activity logs:', error);
        // On error, don't retry - just drop the batch to prevent infinite loop
      } else {
        console.log(`✅ Flushed ${batch.length} activity logs to database`);
      }
    } catch (error) {
      console.error('❌ Activity log flush error:', error);
    }
  }

  /**
   * Get current queue size (for monitoring)
   */
  getQueueSize(): number {
    return this.queue.length;
  }
}

// Global singleton batcher
const batcher = new ActivityLogBatcher();

// Flush on page unload to prevent data loss
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    batcher.flush();
  });
}

/**
 * Logs ALL AI activity for credit tracking and abuse monitoring
 * Uses batching to prevent database flooding
 * Call this EVERY time a user interacts with AI
 */
export async function logAIActivity(params: LogActivityParams): Promise<void> {
  try {
    const {
      userId,
      activityType,
      model,
      estimatedTokens,
      estimatedCostUsd,
      userInput,
      aiResponse,
      imagePrompt,
      imageUrl,
      imageModel,
      sessionId,
      parentActivityId,
      feature,
      ipAddress,
      userAgent,
    } = params;

    // Truncate long responses to prevent database bloat
    const truncatedInput = userInput ? userInput.substring(0, 10000) : null;
    const truncatedResponse = aiResponse ? aiResponse.substring(0, 10000) : null;

    const activity = {
      user_id: userId,
      activity_type: activityType,
      model,
      estimated_tokens: estimatedTokens,
      estimated_cost_usd: estimatedCostUsd,
      user_input: truncatedInput,
      ai_response: truncatedResponse,
      image_prompt: imagePrompt,
      image_url: imageUrl,
      image_model: imageModel,
      session_id: sessionId,
      parent_activity_id: parentActivityId,
      feature,
      ip_address: ipAddress || null,
      user_agent: userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
    };

    // Add to batch queue instead of inserting immediately
    batcher.enqueue(activity);

  } catch (error) {
    console.error('❌ Activity logging error:', error);
    // Silently fail - logging is important but not critical
  }
}

/**
 * Force flush all queued logs immediately (useful before critical operations)
 */
export async function flushActivityLogs(): Promise<void> {
  await batcher.flush();
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost based on model and tokens
 * Prices as of Dec 2024 - update as needed
 */
export function estimateCost(model: string, inputTokens: number, outputTokens: number = 0): number {
  const pricing: Record<string, { input: number; output: number }> = {
    // Gemini 2.0 Flash (free tier / experimental)
    'flash': { input: 0, output: 0 },
    'gemini-2.0-flash-exp': { input: 0, output: 0 },

    // Gemini 2.5 Flash
    'gemini-2.5-flash': { input: 0.075 / 1_000_000, output: 0.30 / 1_000_000 },

    // Gemini 2.5 Pro
    'gemini-2.5-pro': { input: 1.25 / 1_000_000, output: 5.00 / 1_000_000 },
    'pro': { input: 1.25 / 1_000_000, output: 5.00 / 1_000_000 },

    // Imagen 3
    'imagen-3': { input: 0.04, output: 0 }, // per image
    'imagen-3-fast': { input: 0.02, output: 0 }, // per image

    // Default fallback
    'default': { input: 0.5 / 1_000_000, output: 1.5 / 1_000_000 },
  };

  const modelPricing = pricing[model] || pricing['default'];

  // For image models, inputTokens represents number of images
  if (model.startsWith('imagen')) {
    return inputTokens * modelPricing.input;
  }

  return (inputTokens * modelPricing.input) + (outputTokens * modelPricing.output);
}

/**
 * Helper: Log a chat message
 */
export async function logChatMessage(
  userId: string,
  userMessage: string,
  aiResponse: string,
  model: string,
  feature: LogActivityParams['feature'],
  sessionId?: string
): Promise<void> {
  const inputTokens = estimateTokens(userMessage);
  const outputTokens = estimateTokens(aiResponse);
  const cost = estimateCost(model, inputTokens, outputTokens);

  await logAIActivity({
    userId,
    activityType: 'chat_message',
    model,
    estimatedTokens: inputTokens + outputTokens,
    estimatedCostUsd: cost,
    userInput: userMessage,
    aiResponse,
    feature,
    sessionId,
  });
}

/**
 * Helper: Log image generation
 */
export async function logImageGeneration(
  userId: string,
  prompt: string,
  imageUrl: string,
  model: string,
  feature: LogActivityParams['feature']
): Promise<void> {
  const cost = estimateCost(model, 1); // 1 image

  await logAIActivity({
    userId,
    activityType: 'image_generation',
    model,
    estimatedTokens: 0, // Images don't use tokens
    estimatedCostUsd: cost,
    imagePrompt: prompt,
    imageUrl,
    imageModel: model,
    feature,
  });
}

/**
 * Helper: Log research query
 */
export async function logResearchQuery(
  userId: string,
  query: string,
  response: string,
  model: string,
  sessionId?: string
): Promise<void> {
  const inputTokens = estimateTokens(query);
  const outputTokens = estimateTokens(response);
  const cost = estimateCost(model, inputTokens, outputTokens);

  await logAIActivity({
    userId,
    activityType: 'research_query',
    model,
    estimatedTokens: inputTokens + outputTokens,
    estimatedCostUsd: cost,
    userInput: query,
    aiResponse: response,
    feature: 'research_lab',
    sessionId,
  });
}
