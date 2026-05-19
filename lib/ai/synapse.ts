// lib/ai/synapse.ts
// SYNAPSE Gateway - Mandatory Smart Router
// Docs: /docs/ai-system/03-synapse-gateway.md
// NOTE: SYNAPSE is MANDATORY and cannot be disabled by users (protects operator costs)

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ChronolockService } from './chronolock';

// ============================================================================
// Types
// ============================================================================

export interface ClassificationResult {
    score: number;              // 1-10 complexity score
    confidence: number;         // 0-1 confidence in classification
    signals: ClassificationSignal[];
    recommendedModel: string;
    reasoning: string;
}

export interface ClassificationSignal {
    name: string;
    weight: number;
    value: number;
    contribution: number;       // weight * value
}

export interface RoutingDecision {
    originalModel: string;
    targetModel: string;
    wasRerouted: boolean;
    classification: ClassificationResult;
    notification?: RoutingNotification;
    estimatedSavings?: number;
}

export interface RoutingNotification {
    type: 'toast' | 'inline' | 'badge';
    severity: 'info' | 'success' | 'warning';
    title: string;
    message: string;
    tip?: string;
    // NOTE: No actions - SYNAPSE is mandatory
}

export interface SystemRoutingConfig {
    autoRoutingThreshold: number;   // 1-10, only reroute if complexity below this
    educationalTipsEnabled: boolean;
}

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_CONFIG: SystemRoutingConfig = {
    autoRoutingThreshold: 4,        // Only reroute complexity 1-3
    educationalTipsEnabled: true,
};

// ============================================================================
// Model Cost Tiers (lower = cheaper)
// ============================================================================

const MODEL_COST_TIERS: Record<string, number> = {
    'gemini-2.0-flash': 1,
    'gemini-2.5-flash': 1,
    'claude-haiku-3.5': 2,
    'gemini-2.5-pro': 3,
    'gemini-3-pro-preview': 4,
    'claude-sonnet-4': 4,
    'claude-opus-4': 5,
};

const MODEL_DISPLAY_NAMES: Record<string, string> = {
    'gemini-2.5-flash': 'Gemini Flash',
    'gemini-2.0-flash': 'Gemini Flash',
    'gemini-2.5-pro': 'Gemini Pro',
    'gemini-3-pro-preview': 'Gemini 3 Pro',
    'claude-haiku-3.5': 'Claude Haiku',
    'claude-sonnet-4': 'Claude Sonnet',
    'claude-opus-4': 'Claude Opus',
};

// ============================================================================
// Classifier
// ============================================================================

export class SynapseClassifier {
    /**
     * Classify prompt complexity using weighted signals
     * Returns score 1-10 where:
     * 1-3 = Simple (factual, lookup, math)
     * 4-6 = Medium (explanation, summary, simple code)
     * 7-10 = Complex (reasoning, debugging, creative, multi-step)
     */
    classify(prompt: string, context?: { role: string; content: string }[]): ClassificationResult {
        const signals: ClassificationSignal[] = [];

        // ═══════════════════════════════════════════════════════════
        // SIGNAL 1: Lexical Complexity (token count, vocabulary)
        // ═══════════════════════════════════════════════════════════
        const tokenCount = this.estimateTokens(prompt);
        const lexicalScore = Math.min(10, Math.floor(tokenCount / 50));
        signals.push({
            name: 'lexical_length',
            weight: 0.15,
            value: lexicalScore,
            contribution: 0.15 * lexicalScore
        });

        // ═══════════════════════════════════════════════════════════
        // SIGNAL 2: Question Type Detection
        // ═══════════════════════════════════════════════════════════
        const questionType = this.detectQuestionType(prompt);
        const questionScores: Record<string, number> = {
            'factual': 2,           // "What year...", "Who is..."
            'definition': 2,        // "What is...", "Define..."
            'yes_no': 1,            // "Is X true?", "Can you..."
            'how_to': 5,            // "How do I...", "How can..."
            'why': 6,               // "Why does...", "Explain why..."
            'analysis': 7,          // "Analyze...", "Compare..."
            'creative': 8,          // "Write...", "Create...", "Design..."
            'debug': 8,             // "Fix...", "Why isn't...", "Error..."
            'multi_step': 9,        // Multiple questions, "First... then..."
            'open_ended': 7,        // No clear question structure
        };
        const questionScore = questionScores[questionType] ?? 5;
        signals.push({
            name: 'question_type',
            weight: 0.25,
            value: questionScore,
            contribution: 0.25 * questionScore
        });

        // ═══════════════════════════════════════════════════════════
        // SIGNAL 3: Code Presence & Complexity
        // ═══════════════════════════════════════════════════════════
        const codeAnalysis = this.analyzeCode(prompt);
        signals.push({
            name: 'code_complexity',
            weight: 0.20,
            value: codeAnalysis.score,
            contribution: 0.20 * codeAnalysis.score
        });

        // ═══════════════════════════════════════════════════════════
        // SIGNAL 4: Reasoning Indicators
        // ═══════════════════════════════════════════════════════════
        const reasoningIndicators = [
            /step.by.step/i,
            /think.through/i,
            /break.down/i,
            /analyze/i,
            /compare.and.contrast/i,
            /pros.and.cons/i,
            /implications/i,
            /trade.?offs/i,
            /edge.cases/i,
            /what.if/i,
            /consider/i,
        ];
        const reasoningMatches = reasoningIndicators.filter(r => r.test(prompt)).length;
        const reasoningScore = Math.min(10, reasoningMatches * 2 + 3);
        signals.push({
            name: 'reasoning_depth',
            weight: 0.20,
            value: reasoningMatches > 0 ? reasoningScore : 1,
            contribution: 0.20 * (reasoningMatches > 0 ? reasoningScore : 1)
        });

        // ═══════════════════════════════════════════════════════════
        // SIGNAL 5: Context Dependency
        // ═══════════════════════════════════════════════════════════
        const contextDependency = context?.length ?? 0;
        const contextScore = Math.min(10, Math.floor(contextDependency / 3) + 1);
        signals.push({
            name: 'context_depth',
            weight: 0.10,
            value: contextScore,
            contribution: 0.10 * contextScore
        });

        // ═══════════════════════════════════════════════════════════
        // SIGNAL 6: Domain Specificity (technical jargon)
        // ═══════════════════════════════════════════════════════════
        const domainScore = this.analyzeDomainSpecificity(prompt);
        signals.push({
            name: 'domain_specificity',
            weight: 0.10,
            value: domainScore,
            contribution: 0.10 * domainScore
        });

        // ═══════════════════════════════════════════════════════════
        // FINAL SCORE CALCULATION
        // ═══════════════════════════════════════════════════════════
        const rawScore = signals.reduce((sum, s) => sum + s.contribution, 0);
        const finalScore = Math.max(1, Math.min(10, Math.round(rawScore)));

        // Determine confidence based on signal agreement
        const signalVariance = this.calculateVariance(signals.map(s => s.value));
        const confidence = Math.max(0.3, 1 - (signalVariance / 20));

        // Get model recommendation
        const recommendedModel = this.getRecommendedModel(finalScore);

        return {
            score: finalScore,
            confidence,
            signals,
            recommendedModel,
            reasoning: this.generateReasoning(signals, finalScore),
        };
    }

    private detectQuestionType(prompt: string): string {
        const lower = prompt.toLowerCase();

        if (/^(what year|who is|who was|when did|where is|how many|how much)\b/i.test(lower))
            return 'factual';
        if (/^(what is|define|what does .+ mean)\b/i.test(lower))
            return 'definition';
        if (/^(is|are|can|could|would|should|does|do|did|will)\b/i.test(lower))
            return 'yes_no';
        if (/^(how do|how can|how to|show me how)\b/i.test(lower))
            return 'how_to';
        if (/^(why|explain why|what causes)\b/i.test(lower))
            return 'why';
        if (/^(analyze|compare|evaluate|assess|critique)\b/i.test(lower))
            return 'analysis';
        if (/^(write|create|design|generate|compose|draft)\b/i.test(lower))
            return 'creative';
        if (/(fix|debug|error|bug|not working|doesn't work|fails|broken)\b/i.test(lower))
            return 'debug';
        if (/\b(and then|next|after that|finally|first .+ then)\b/i.test(lower))
            return 'multi_step';

        return 'open_ended';
    }

    private analyzeCode(prompt: string): { score: number; hasCode: boolean; complexity: string } {
        const codeBlockMatch = prompt.match(/```[\s\S]*?```/g);

        if (!codeBlockMatch) {
            const hasInlineCode = /`[^`]+`/.test(prompt);
            return {
                score: hasInlineCode ? 4 : 1,
                hasCode: hasInlineCode,
                complexity: 'none'
            };
        }

        const codeContent = codeBlockMatch.join('\n');
        const lineCount = codeContent.split('\n').length;
        const hasComplexPatterns = [
            /class\s+\w+/,           // Class definition
            /async|await/,           // Async code
            /try\s*{|catch\s*{/,     // Error handling
            /import|require/,        // Module system
            /useState|useEffect/,    // React hooks (complex state)
            /SELECT|INSERT|UPDATE/i, // SQL
        ].some(p => p.test(codeContent));

        let score = Math.min(8, Math.floor(lineCount / 10) + 3);
        if (hasComplexPatterns) score = Math.min(10, score + 2);

        return {
            score,
            hasCode: true,
            complexity: lineCount > 50 ? 'high' : lineCount > 15 ? 'medium' : 'low'
        };
    }

    private analyzeDomainSpecificity(prompt: string): number {
        const technicalTerms = [
            /\b(algorithm|recursion|polymorphism|inheritance|encapsulation)\b/i,
            /\b(kubernetes|docker|nginx|redis|postgres|mongodb)\b/i,
            /\b(derivative|integral|eigenvalue|theorem|proof)\b/i,
            /\b(mitochondria|ATP|RNA|enzyme|catalyst)\b/i,
            /\b(TCP|UDP|HTTP|REST|GraphQL|websocket)\b/i,
            /\b(neural network|gradient descent|backpropagation|transformer)\b/i,
        ];

        const matches = technicalTerms.filter(t => t.test(prompt)).length;
        return Math.min(10, matches * 2 + 2);
    }

    private getRecommendedModel(score: number): string {
        if (score <= 3) return 'gemini-2.5-flash';
        if (score <= 5) return 'gemini-2.5-pro';
        if (score <= 7) return 'claude-sonnet-4';
        return 'claude-opus-4';
    }

    private generateReasoning(signals: ClassificationSignal[], score: number): string {
        const topSignals = signals
            .sort((a, b) => b.contribution - a.contribution)
            .slice(0, 2)
            .map(s => s.name.replace(/_/g, ' '));

        if (score <= 3) {
            return `Simple query detected. Primary factors: ${topSignals.join(', ')}.`;
        }
        if (score <= 6) {
            return `Moderate complexity. Key factors: ${topSignals.join(', ')}.`;
        }
        return `Complex query requiring deeper reasoning. Factors: ${topSignals.join(', ')}.`;
    }

    private estimateTokens(text: string): number {
        // Rough estimation: ~4 chars per token for English
        return Math.ceil(text.length / 4);
    }

    private calculateVariance(values: number[]): number {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    }
}

// ============================================================================
// Router
// ============================================================================

export class SynapseRouter {
    private classifier: SynapseClassifier;
    private chronolock: ChronolockService;
    private config: SystemRoutingConfig;

    constructor(config?: Partial<SystemRoutingConfig>) {
        this.classifier = new SynapseClassifier();
        this.chronolock = new ChronolockService();
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Determine routing for a request
     * NOTE: SYNAPSE is MANDATORY - no user opt-out
     */
    async route(
        userId: string,
        prompt: string,
        requestedModel: string,
        context?: { role: string; content: string }[]
    ): Promise<RoutingDecision> {
        // Classify the prompt
        const classification = this.classifier.classify(prompt, context);

        // Only consider rerouting if complexity is below threshold
        if (classification.score >= this.config.autoRoutingThreshold) {
            return this.noReroute(requestedModel, classification, 'Complexity above threshold');
        }

        // Only consider rerouting if classification is confident
        if (classification.confidence < 0.6) {
            return this.noReroute(requestedModel, classification, 'Classification confidence too low');
        }

        // Get the recommended cheaper model
        const targetModel = classification.recommendedModel;

        // Don't reroute to a more expensive model
        if (this.isMoreExpensive(targetModel, requestedModel)) {
            return this.noReroute(requestedModel, classification, 'Recommended model not cheaper');
        }

        // Don't reroute if same model
        if (targetModel === requestedModel) {
            return this.noReroute(requestedModel, classification, 'Already optimal model');
        }

        // Check if user has credits for target model
        try {
            const targetStatus = await this.chronolock.getCycleStatus(userId, targetModel);
            if (targetStatus.isBlocked) {
                return this.noReroute(requestedModel, classification, 'Target model credits exhausted');
            }
        } catch {
            // If we can't check, don't reroute
            return this.noReroute(requestedModel, classification, 'Could not verify target model credits');
        }

        // Calculate savings
        const estimatedSavings = this.calculateSavings(prompt, requestedModel, targetModel);

        // Build notification
        const notification = this.buildNotification(
            classification,
            requestedModel,
            targetModel,
            estimatedSavings
        );

        return {
            originalModel: requestedModel,
            targetModel,
            wasRerouted: true,
            classification,
            notification,
            estimatedSavings,
        };
    }

    private noReroute(
        model: string,
        classification: ClassificationResult,
        reason: string
    ): RoutingDecision {
        return {
            originalModel: model,
            targetModel: model,
            wasRerouted: false,
            classification: {
                ...classification,
                reasoning: reason,
            },
        };
    }

    private buildNotification(
        classification: ClassificationResult,
        originalModel: string,
        targetModel: string,
        savings: number
    ): RoutingNotification {
        const complexityLabel = classification.score <= 3 ? 'LOW' : 'MEDIUM';
        const targetName = MODEL_DISPLAY_NAMES[targetModel] || targetModel;

        const notification: RoutingNotification = {
            type: 'toast',
            severity: 'success',
            title: 'SYNAPSE Optimization',
            message: `Query complexity: ${complexityLabel}. Routed to ${targetName} (saved $${savings.toFixed(4)})`,
            // NOTE: No actions - SYNAPSE is mandatory for cost protection
        };

        if (this.config.educationalTipsEnabled) {
            notification.tip = this.getEducationalTip(classification.score, originalModel);
        }

        return notification;
    }

    private getEducationalTip(complexity: number, requestedModel: string): string {
        const modelName = MODEL_DISPLAY_NAMES[requestedModel] || requestedModel;
        if (complexity <= 2) {
            return `💡 Tip: Quick lookups and math work great with Flash. Save ${modelName} for complex reasoning.`;
        }
        if (complexity <= 4) {
            return `💡 Tip: Use advanced models when you need step-by-step analysis or debugging.`;
        }
        return `💡 Tip: Consider the task complexity when choosing a model.`;
    }

    private isMoreExpensive(modelA: string, modelB: string): boolean {
        return (MODEL_COST_TIERS[modelA] ?? 3) > (MODEL_COST_TIERS[modelB] ?? 3);
    }

    private calculateSavings(prompt: string, originalModel: string, targetModel: string): number {
        // Rough token estimate
        const tokens = Math.ceil(prompt.length / 4);

        // Approximate prices per 1M tokens
        const prices: Record<string, { input: number; output: number }> = {
            'gemini-2.5-flash': { input: 0.075, output: 0.30 },
            'gemini-2.5-pro': { input: 1.25, output: 10.00 },
            'claude-haiku-3.5': { input: 0.80, output: 4.00 },
            'claude-sonnet-4': { input: 3.00, output: 15.00 },
            'claude-opus-4': { input: 15.00, output: 75.00 },
        };

        const originalPrice = prices[originalModel] ?? { input: 1, output: 5 };
        const targetPrice = prices[targetModel] ?? { input: 0.1, output: 0.4 };

        // Estimate: input tokens + 2x output (typical response is longer than prompt)
        const estimatedOutputTokens = tokens * 2;

        const originalCost =
            ((tokens / 1_000_000) * originalPrice.input) +
            ((estimatedOutputTokens / 1_000_000) * originalPrice.output);

        const targetCost =
            ((tokens / 1_000_000) * targetPrice.input) +
            ((estimatedOutputTokens / 1_000_000) * targetPrice.output);

        return Math.max(0, originalCost - targetCost);
    }
}

// Export singleton instances
export const synapseClassifier = new SynapseClassifier();
export const synapseRouter = new SynapseRouter();
