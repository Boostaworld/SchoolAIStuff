# SYNAPSE Gateway — Transparent Smart Router
## Deep Technical Specification

> **Module:** Cost Optimization & UX Education  
> **Priority:** High — Automatic Cost Savings  
> **Dependencies:** CHRONOLOCK Protocol, AI Model Registry

---

## 1. Executive Summary

SYNAPSE Gateway is an **intelligent routing layer** that:
1. **Analyzes prompt complexity** before routing to any model
2. **Automatically downgrades** simple queries to cheaper models
3. **ALWAYS notifies users** when rerouting occurs (educational, not hidden)
4. **Teaches model selection** through consistent feedback

This is NOT just cost optimization — it's a **training system** that helps students learn when to use which model.

---

## 2. The Philosophy: Transparent Intelligence

### 2.1 Why Transparency Matters

Hidden smart routing creates problems:
- Users don't learn proper model selection
- Users blame the "wrong" model for bad responses
- Trust erodes when users discover hidden routing
- No opportunity for user feedback/disagreement

SYNAPSE is **proudly visible**. Every reroute is explained. Users see the cost savings. They learn.

> [!CAUTION]
> **SYNAPSE is MANDATORY and cannot be disabled by users.** This is a cost-protection measure — the platform operator pays for API usage, not the students. Allowing students to disable routing would let them waste expensive credits on trivial queries.

### 2.2 The Educational Toast Pattern

When SYNAPSE reroutes a query, users see:

```
╔════════════════════════════════════════════════════════════╗
║  SYNAPSE Optimization                                       ║
╠════════════════════════════════════════════════════════════╣
║  Query complexity: LOW                                      ║
║  Routed to: Gemini Flash (instead of Claude Opus)          ║
║  Saved: $0.0023                                             ║
║                                                             ║
║  💡 Tip: Use [Deep Think] mode for complex reasoning tasks ║
╚════════════════════════════════════════════════════════════╝
```

> **Note:** There is no "disable" option. SYNAPSE is always active to protect costs.

---

## 3. Classification Engine

### 3.1 Complexity Scoring Algorithm

```typescript
// services/synapse-classifier.ts

export interface ClassificationResult {
  score: number;              // 1-10 complexity score
  confidence: number;         // 0-1 confidence in classification
  signals: ClassificationSignal[];
  recommendedModel: string;
  reasoning: string;
}

interface ClassificationSignal {
  name: string;
  weight: number;
  value: number;
  contribution: number;       // weight * value
}

export class SynapseClassifier {
  
  /**
   * Classify prompt complexity using weighted signals
   * Returns score 1-10 where:
   * 1-3 = Simple (factual, lookup, math)
   * 4-6 = Medium (explanation, summary, simple code)
   * 7-10 = Complex (reasoning, debugging, creative, multi-step)
   */
  classify(prompt: string, context?: Message[]): ClassificationResult {
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
      value: reasoningScore,
      contribution: 0.20 * reasoningScore
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
```

---

## 4. Routing Service

### 4.1 Main Router Implementation

```typescript
// services/synapse-router.ts

import { SynapseClassifier, ClassificationResult } from './synapse-classifier';
import { ChronolockService } from './chronolock';

export interface RoutingDecision {
  originalModel: string;
  targetModel: string;
  wasRerouted: boolean;
  classification: ClassificationResult;
  notification?: RoutingNotification;
  userCanOverride: boolean;
  estimatedSavings?: number;
}

export interface RoutingNotification {
  type: 'toast' | 'inline' | 'badge';
  severity: 'info' | 'success' | 'warning';
  title: string;
  message: string;
  tip?: string;
  actions?: { label: string; action: string }[];
}

// NOTE: No user preferences for enabling/disabling routing
// SYNAPSE is MANDATORY to protect operator costs
export interface SystemRoutingConfig {
  autoRoutingThreshold: number;   // 1-10, only reroute if complexity below this
  educationalTipsEnabled: boolean;
  // neverRerouteModels removed — all models subject to routing
  // sessionOverrides removed — no user opt-out allowed
}

export class SynapseRouter {
  private classifier: SynapseClassifier;
  private chronolock: ChronolockService;

  constructor() {
    this.classifier = new SynapseClassifier();
    this.chronolock = new ChronolockService();
  }

  /**
   * Determine routing for a request
   */
  async route(
    userId: string,
    prompt: string,
    requestedModel: string,
    context: Message[],
    config: SystemRoutingConfig  // System config, NOT user preferences
  ): Promise<RoutingDecision> {
    // SYNAPSE is MANDATORY — no user opt-out checks
    // This protects the operator's API costs

    // Classify the prompt
    const classification = this.classifier.classify(prompt, context);

    // Only consider rerouting if complexity is below system threshold
    if (classification.score >= config.autoRoutingThreshold) {
      return this.noReroute(requestedModel, 'Complexity above threshold');
    }

    // Only consider rerouting if classification is confident
    if (classification.confidence < 0.6) {
      return this.noReroute(requestedModel, 'Classification confidence too low');
    }

    // Get the recommended cheaper model
    const targetModel = classification.recommendedModel;

    // Don't reroute to a more expensive model
    if (this.isMoreExpensive(targetModel, requestedModel)) {
      return this.noReroute(requestedModel, 'Recommended model not cheaper');
    }

    // Don't reroute if same model
    if (targetModel === requestedModel) {
      return this.noReroute(requestedModel, 'Already optimal model');
    }

    // Check if user has credits for target model
    const targetStatus = await this.chronolock.getCycleStatus(userId, targetModel);
    if (targetStatus.isBlocked) {
      return this.noReroute(requestedModel, 'Target model credits exhausted');
    }

    // Calculate savings
    const estimatedSavings = await this.calculateSavings(
      prompt,
      requestedModel,
      targetModel
    );

    // Build notification
    const notification = this.buildNotification(
      classification,
      requestedModel,
      targetModel,
      estimatedSavings,
      config.educationalTipsEnabled
    );

    return {
      originalModel: requestedModel,
      targetModel,
      wasRerouted: true,
      classification,
      notification,
      userCanOverride: true,
      estimatedSavings,
    };
  }

  private noReroute(model: string, reason: string): RoutingDecision {
    return {
      originalModel: model,
      targetModel: model,
      wasRerouted: false,
      classification: {
        score: 5,
        confidence: 0,
        signals: [],
        recommendedModel: model,
        reasoning: reason,
      },
      userCanOverride: false,
    };
  }

  private buildNotification(
    classification: ClassificationResult,
    originalModel: string,
    targetModel: string,
    savings: number,
    includeTips: boolean
  ): RoutingNotification {
    const complexityLabel = classification.score <= 3 ? 'LOW' : 'MEDIUM';
    
    const notification: RoutingNotification = {
      type: 'toast',
      severity: 'success',
      title: 'SYNAPSE Optimization',
      message: `Query complexity: ${complexityLabel}. Routed to ${this.getModelDisplayName(targetModel)} (saved $${savings.toFixed(4)})`,
      // NO disable option — SYNAPSE is mandatory for cost protection
      actions: [],  // No user override actions
    };

    if (includeTips) {
      notification.tip = this.getEducationalTip(classification.score, originalModel);
    }

    return notification;
  }

  private getEducationalTip(complexity: number, requestedModel: string): string {
    if (complexity <= 2) {
      return `💡 Tip: Quick lookups and math work great with Flash. Save ${requestedModel} for complex reasoning.`;
    }
    if (complexity <= 4) {
      return `💡 Tip: Use [Deep Think] mode when you need step-by-step analysis or debugging.`;
    }
    return `💡 Tip: Consider using the [Model Picker] to choose the best fit for your query type.`;
  }

  private getModelDisplayName(modelId: string): string {
    const names: Record<string, string> = {
      'gemini-2.5-flash': 'Gemini Flash',
      'gemini-2.5-pro': 'Gemini Pro',
      'gemini-3-pro-preview': 'Gemini 3 Pro',
      'claude-haiku-3.5': 'Claude Haiku',
      'claude-sonnet-4': 'Claude Sonnet',
      'claude-opus-4': 'Claude Opus',
    };
    return names[modelId] ?? modelId;
  }

  private isMoreExpensive(modelA: string, modelB: string): boolean {
    // Relative cost tiers (lower = cheaper)
    const tiers: Record<string, number> = {
      'gemini-2.5-flash': 1,
      'gemini-2.0-flash': 1,
      'claude-haiku-3.5': 2,
      'gemini-2.5-pro': 3,
      'gemini-3-pro-preview': 4,
      'claude-sonnet-4': 4,
      'claude-opus-4': 5,
    };
    return (tiers[modelA] ?? 3) > (tiers[modelB] ?? 3);
  }

  private async calculateSavings(
    prompt: string,
    originalModel: string,
    targetModel: string
  ): Promise<number> {
    // Rough token estimate
    const tokens = Math.ceil(prompt.length / 4);
    
    // Get model prices (simplified — would fetch from DB in production)
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
```

---

## 5. Frontend Integration

### 5.1 Routing Toast Component

```tsx
// components/ai/SynapseToast.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ChevronDown, X, Lightbulb } from 'lucide-react';
import { useState } from 'react';

interface SynapseToastProps {
  notification: RoutingNotification;
  onDismiss: () => void;
  onAction: (action: string) => void;
}

export function SynapseToast({ notification, onDismiss, onAction }: SynapseToastProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-4 right-4 z-50 w-96"
    >
      <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl shadow-cyan-500/10">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="font-semibold text-white">{notification.title}</span>
          </div>
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3">
          <p className="text-sm text-slate-300">{notification.message}</p>
          
          {notification.tip && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-3 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20"
            >
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                <p className="text-xs text-violet-200">{notification.tip}</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Actions */}
        {notification.actions && notification.actions.length > 0 && (
          <div className="flex justify-end gap-2 p-3 border-t border-slate-700/50 bg-slate-800/30">
            {notification.actions.map((action) => (
              <button
                key={action.action}
                onClick={() => onAction(action.action)}
                className={`
                  px-3 py-1.5 text-xs rounded-lg transition-colors
                  ${action.action === 'override' 
                    ? 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

### 5.2 Routing Indicator Badge

```tsx
// components/ai/RoutingBadge.tsx

import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';

interface RoutingBadgeProps {
  originalModel: string;
  targetModel: string;
  savings: number;
}

export function RoutingBadge({ originalModel, targetModel, savings }: RoutingBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs"
    >
      <Zap className="w-3 h-3 text-cyan-400" />
      <span className="text-slate-400 line-through">{originalModel}</span>
      <ArrowRight className="w-3 h-3 text-cyan-400" />
      <span className="text-cyan-300 font-medium">{targetModel}</span>
      <span className="text-emerald-400">-${savings.toFixed(4)}</span>
    </motion.div>
  );
}
```

---

## 6. Use Cases

### Scenario A: Obvious Downgrade

**Context:** Student selects Claude Opus and asks "What is 2+2?"

**Flow:**
1. Prompt classified: score = 1 (factual, trivial math)
2. Confidence: 0.95 (very obvious)
3. Recommended: Gemini Flash
4. Toast displayed:
   - "Query complexity: LOW"
   - "Routed to Gemini Flash (saved $0.0018)"
   - Tip: "Quick lookups work great with Flash!"
5. Response generated by Flash
6. Badge shows: "~~Opus~~ → Flash -$0.002"

**Outcome:** Student learns that simple queries don't need expensive models.

---

### Scenario B: Edge Case — User Override

**Context:** Student asks Claude Opus "What is machine learning?" but actually wants a DEEP philosophical discussion.

**Flow:**
1. Prompt classified: score = 2 (appears to be a definition)
2. System suggests routing to Flash
3. Toast displayed with "Use original model" button
4. Student clicks override
5. Request goes to Opus
6. Student gets the deep, nuanced response they wanted

**Outcome:** System respects user agency while still providing the educational notification.

---

### Scenario C: Repeated Simple Queries — Escalated Education

**Context:** Same student sends 5 simple queries to Opus in one session.

**Flow:**
1. First query: Standard toast
2. Second query: Standard toast
3. Third query: Toast with stronger tip
4. Fourth+ queries: Modal appears:

```
╔══════════════════════════════════════════════════════════════╗
║  🎓 Model Selection Insight                                  ║
╠══════════════════════════════════════════════════════════════╣
║  You've used Opus for 5 simple queries this session.         ║
║  These queries work equally well on Flash at 1/200th         ║
║  the cost.                                                   ║
║                                                              ║
║  💡 Consider using Flash for:                                ║
║  • Quick lookups and facts                                   ║
║  • Math calculations                                         ║
║  • Simple translations                                       ║
║  • Yes/no questions                                          ║
║                                                              ║
║  [Got it] [Learn more about model selection]                 ║
╚══════════════════════════════════════════════════════════════╝
```

**Outcome:** Progressive education prevents nagging while still teaching proper model selection.

---

## 7. Configuration & Admin Controls

### 7.1 System-Wide Settings

```typescript
// config/synapse.ts

export const SYNAPSE_CONFIG = {
  // Global enable/disable
  enabled: true,
  
  // System settings (NOT user-configurable — SYNAPSE is mandatory)
  systemConfig: {
    autoRoutingThreshold: 4,        // Only reroute complexity 1-3
    educationalTipsEnabled: true,
    // NOTE: No user opt-out settings — routing protects operator costs
  },
  
  // Classification tuning
  classification: {
    minConfidenceForReroute: 0.6,
    allowReroutesForCodeBlocks: false,  // Never reroute if code present
    maxComplexityForReroute: 4,
  },
  
  // Educational escalation
  education: {
    simpleQueryCountForModal: 5,    // Show modal after N simple queries
    modalCooldownMinutes: 60,       // Don't show modal again for 1 hour
  },
  
  // Analytics
  tracking: {
    logAllClassifications: true,
    logRerouteDecisions: true,
    trackUserOverrides: true,
  },
};
```

### 7.2 Admin Override Capability

Admins can:
- Disable SYNAPSE globally for specific users (e.g., during exams)
- Adjust classification thresholds per school
- View rerouting analytics (% accepted, % overridden)
- Create custom routing rules for specific query patterns
