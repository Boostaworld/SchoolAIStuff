// lib/ai/index.ts
// Barrel export for all AI Access System services

// Core Services
export { ChronolockService, chronolockService } from './chronolock';
export type { ModelCycle, CycleStatus, DeductionResult } from './chronolock';

export { SynapseClassifier, SynapseRouter, synapseClassifier, synapseRouter } from './synapse';
export type { ClassificationResult, RoutingDecision, RoutingNotification, SystemRoutingConfig } from './synapse';

export { PeriodCheckinService, periodCheckinService, DEFAULT_PERIOD_SCHEDULE } from './periodCheckin';
export type { PeriodConfig, CheckinResult, DailyProgress } from './periodCheckin';

export { CreditForgeService, creditForgeService } from './creditForge';
export type { BuybackRate, BuybackTransaction, BuybackResult, BuybackQuote } from './creditForge';

export { NeuralyncService, neuralyncService } from './neuralync';
export type { UnlockStatus, UnlockRequirement, UserActivityStats } from './neuralync';
