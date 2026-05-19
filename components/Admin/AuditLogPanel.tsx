import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  Shield,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  Key,
  Award,
  Clock,
  Filter,
  Search,
  ChevronDown,
  AlertCircle
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  admin_id: string;
  target_user_id: string | null;
  action: string;
  details: any;
  created_at: string;
  admin_username?: string;
  admin_avatar?: string;
  target_username?: string;
}

interface AuditLogPanelProps {}

const ACTION_CONFIG: Record<string, {
  icon: any;
  color: string;
  label: string;
  bgColor: string;
}> = {
  'update_user': {
    icon: Edit,
    color: 'blue',
    label: 'User Updated',
    bgColor: 'bg-blue-500/10'
  },
  'delete_user': {
    icon: Trash2,
    color: 'red',
    label: 'User Deleted',
    bgColor: 'bg-red-500/10'
  },
  'grant_permission': {
    icon: Key,
    color: 'purple',
    label: 'Permission Granted',
    bgColor: 'bg-purple-500/10'
  },
  'revoke_permission': {
    icon: UserMinus,
    color: 'amber',
    label: 'Permission Revoked',
    bgColor: 'bg-amber-500/10'
  },
  'modify_points': {
    icon: Award,
    color: 'green',
    label: 'Points Modified',
    bgColor: 'bg-green-500/10'
  },
  'default': {
    icon: Shield,
    color: 'slate',
    label: 'Action',
    bgColor: 'bg-slate-500/10'
  }
};

export function AuditLogPanel({}: AuditLogPanelProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs();

    // Real-time subscription
    const subscription = supabase
      .channel('audit_logs_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_audit_logs' },
        () => {
          fetchAuditLogs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      // Fetch audit logs with joined user data
      const { data: logsData, error } = await supabase
        .from('admin_audit_logs')
        .select(`
          *,
          admin:admin_id(username, avatar_url),
          target:target_user_id(username)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const enrichedLogs = logsData?.map(log => ({
        ...log,
        admin_username: log.admin?.username || 'Unknown Admin',
        admin_avatar: log.admin?.avatar_url,
        target_username: log.target?.username || 'Unknown User'
      })) || [];

      setLogs(enrichedLogs);
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesSearch =
      log.admin_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesAction && matchesSearch;
  });

  const uniqueActions = ['all', ...Array.from(new Set(logs.map(l => l.action)))];

  const getActionConfig = (action: string) => {
    return ACTION_CONFIG[action] || ACTION_CONFIG['default'];
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const renderDetailsDiff = (details: any) => {
    if (!details) return null;

    const { updates, previous } = details;
    if (!updates && !previous) return null;

    return (
      <div className="mt-3 space-y-2">
        {updates && Object.entries(updates).map(([key, value]) => {
          const oldValue = previous?.[key];
          return (
            <div key={key} className="flex items-start gap-3 text-xs font-mono">
              <div className="w-32 text-slate-500 uppercase tracking-wider flex-shrink-0">
                {key.replace(/_/g, ' ')}
              </div>
              <div className="flex-1 flex items-center gap-2">
                {oldValue !== undefined && (
                  <>
                    <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded border border-red-500/30 line-through">
                      {JSON.stringify(oldValue)}
                    </span>
                    <span className="text-slate-600">→</span>
                  </>
                )}
                <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded border border-green-500/30">
                  {JSON.stringify(value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Shield className="w-12 h-12 text-amber-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-amber-400" />
          <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-400" style={{ fontFamily: 'Orbitron, monospace' }}>
            AUDIT LOG
          </h3>
        </div>
        <p className="text-sm text-slate-400 font-mono">
          Complete history of administrative actions • {logs.length} total entries
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by admin, user, or action..."
            className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-amber-500/30 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 font-mono"
          />
        </div>

        {/* Action Filter */}
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-amber-500/30 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 font-mono appearance-none cursor-pointer"
          >
            {uniqueActions.map(action => (
              <option key={action} value={action}>
                {action === 'all' ? 'All Actions' : action.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500/50 via-red-500/30 to-transparent" />

        {/* Log entries */}
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 font-mono">No audit logs found</p>
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              const config = getActionConfig(log.action);
              const Icon = config.icon;
              const isExpanded = expandedLog === log.id;

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="relative pl-20"
                >
                  {/* Timeline dot */}
                  <div className={`absolute left-6 top-6 w-5 h-5 rounded-full bg-${config.color}-500/20 border-2 border-${config.color}-500 flex items-center justify-center shadow-[0_0_10px_rgba(251,191,36,0.3)]`}>
                    <div className={`w-2 h-2 rounded-full bg-${config.color}-400 animate-pulse`} />
                  </div>

                  {/* Log card */}
                  <div
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    className={`${config.bgColor} border border-${config.color}-500/30 hover:border-${config.color}-500/50 rounded-xl p-4 transition-all cursor-pointer group`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Action icon */}
                        <div className={`w-10 h-10 rounded-lg bg-${config.color}-500/20 border border-${config.color}-500/40 flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 text-${config.color}-400`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold bg-${config.color}-500/20 text-${config.color}-400 border border-${config.color}-500/30 uppercase tracking-wider`}>
                              {config.label}
                            </span>
                            <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(log.created_at)}
                            </span>
                          </div>

                          <div className="text-sm text-slate-300 font-mono">
                            <span className="text-amber-400 font-bold">{log.admin_username}</span>
                            {' '}performed{' '}
                            <span className={`text-${config.color}-400 font-bold`}>{log.action.replace(/_/g, ' ')}</span>
                            {log.target_username && (
                              <>
                                {' '}on{' '}
                                <span className="text-cyan-400 font-bold">{log.target_username}</span>
                              </>
                            )}
                          </div>

                          {/* Details (expanded) */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                {renderDetailsDiff(log.details)}

                                <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-500 font-mono">
                                  <div className="flex items-center gap-4">
                                    <span>ID: {log.id.slice(0, 8)}</span>
                                    <span>•</span>
                                    <span>{new Date(log.created_at).toLocaleString()}</span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Expand indicator */}
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className={`w-5 h-5 text-${config.color}-400 opacity-50 group-hover:opacity-100 transition-opacity`} />
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Stats footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(
          logs.reduce((acc, log) => {
            acc[log.action] = (acc[log.action] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ).slice(0, 4).map(([action, count]) => {
          const config = getActionConfig(action);
          return (
            <div
              key={action}
              className={`p-3 ${config.bgColor} border border-${config.color}-500/30 rounded-lg`}
            >
              <div className={`text-2xl font-black text-${config.color}-400 font-mono`}>
                {count}
              </div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-mono">
                {action.replace(/_/g, ' ')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
