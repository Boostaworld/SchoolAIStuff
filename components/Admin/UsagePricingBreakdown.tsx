"use client";

import { motion } from "framer-motion";
import { DollarSign, Zap, Image, MessageSquare, Search, Brain } from "lucide-react";

interface PricingBreakdownProps {
  stats: {
    chat_messages: number;
    images_generated: number;
    research_queries: number;
    total_cost_usd: number;
  } | null;
  activities?: Array<{
    activity_type: string;
    model: string;
    estimated_tokens: number;
    estimated_cost_usd: number;
  }>;
}

interface ModelBreakdown {
  model: string;
  count: number;
  totalTokens: number;
  totalCost: number;
  activityType: string;
}

export function UsagePricingBreakdown({ stats, activities = [] }: PricingBreakdownProps) {
  if (!stats || !activities.length) {
    return (
      <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg">
        <p className="text-xs text-slate-500 font-mono text-center">No usage data yet</p>
      </div>
    );
  }

  // Group activities by model
  const modelBreakdowns = activities.reduce((acc, activity) => {
    const key = `${activity.model}-${activity.activity_type}`;

    if (!acc[key]) {
      acc[key] = {
        model: activity.model,
        count: 0,
        totalTokens: 0,
        totalCost: 0,
        activityType: activity.activity_type,
      };
    }

    acc[key].count++;
    acc[key].totalTokens += activity.estimated_tokens || 0;
    acc[key].totalCost += activity.estimated_cost_usd || 0;

    return acc;
  }, {} as Record<string, ModelBreakdown>);

  const breakdowns = Object.values(modelBreakdowns).sort((a, b) => b.totalCost - a.totalCost);

  // Calculate averages
  const avgCostPerInteraction = stats.total_cost_usd / (stats.chat_messages + stats.images_generated + stats.research_queries) || 0;
  const totalInteractions = stats.chat_messages + stats.images_generated + stats.research_queries;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'chat_message': return <MessageSquare className="w-3 h-3" />;
      case 'image_generation': return <Image className="w-3 h-3" />;
      case 'research_query': return <Search className="w-3 h-3" />;
      default: return <Brain className="w-3 h-3" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'chat_message': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'image_generation': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'research_query': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-3 h-3 text-green-400" />
            <span className="text-[9px] text-slate-500 font-mono uppercase">Total Cost</span>
          </div>
          <div className="text-lg font-black text-green-400 font-mono">
            ${stats.total_cost_usd.toFixed(4)}
          </div>
        </div>

        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span className="text-[9px] text-slate-500 font-mono uppercase">Avg/Action</span>
          </div>
          <div className="text-lg font-black text-cyan-400 font-mono">
            ${avgCostPerInteraction.toFixed(5)}
          </div>
        </div>

        <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-3 h-3 text-purple-400" />
            <span className="text-[9px] text-slate-500 font-mono uppercase">Actions</span>
          </div>
          <div className="text-lg font-black text-purple-400 font-mono">
            {totalInteractions}
          </div>
        </div>
      </div>

      {/* Model Breakdown */}
      <div className="space-y-2">
        <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">Model Usage</h4>
        <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
          {breakdowns.map((breakdown, idx) => (
            <motion.div
              key={`${breakdown.model}-${breakdown.activityType}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-2 border rounded ${getActivityColor(breakdown.activityType)}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {getActivityIcon(breakdown.activityType)}
                  <span className="text-xs font-mono font-semibold">
                    {breakdown.model}
                  </span>
                </div>
                <span className="text-xs font-black font-mono">
                  ${breakdown.totalCost.toFixed(4)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>{breakdown.count}x uses</span>
                {breakdown.totalTokens > 0 && (
                  <span>{breakdown.totalTokens.toLocaleString()} tokens</span>
                )}
              </div>

              {/* Cost per action for this model */}
              <div className="mt-1 pt-1 border-t border-current/20">
                <span className="text-[9px] font-mono text-slate-600">
                  ${(breakdown.totalCost / breakdown.count).toFixed(5)}/action
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pricing Reference */}
      <div className="p-2 bg-slate-800/50 border border-slate-700/50 rounded text-[9px] font-mono text-slate-500">
        <div className="flex items-center gap-1 mb-1">
          <DollarSign className="w-2 h-2" />
          <span className="uppercase font-semibold">Pricing Reference</span>
        </div>
        <div className="space-y-0.5 pl-3">
          <div>Flash: $0.075/1M in • $0.30/1M out</div>
          <div>Pro: $1.25/1M in • $5.00/1M out</div>
          <div>Imagen-3: $0.04/img • Fast: $0.02/img</div>
        </div>
      </div>
    </motion.div>
  );
}
