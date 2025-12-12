/**
 * AdminReportsPanel - Admin view for managing bug reports and suggestions
 * Two tabs: Bugs and Suggestions
 * Features: List view, filters, detail view with context dropdown, reply capability
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bug, Lightbulb, MessageSquare, Send, Clock, CheckCircle,
    HelpCircle, XCircle, Loader2, ChevronDown, ChevronRight,
    User, Search, Filter, StickyNote, Paperclip, Eye, EyeOff, Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOrbitStore } from '@/store/useOrbitStore';
import { toast } from '@/lib/toast';
import { ConfirmModal } from '@/components/Shared/ConfirmModal';
import { Report, ReportThread, ReportStatus, ReportType } from '@/types';

// Status badge colors and labels
const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; icon: React.ElementType }> = {
    new: { label: 'New', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: Clock },
    in_progress: { label: 'In Progress', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Loader2 },
    need_info: { label: 'Need Info', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: HelpCircle },
    resolved: { label: 'Resolved', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
    closed: { label: 'Closed', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: XCircle }
};

const STATUS_OPTIONS: ReportStatus[] = ['new', 'in_progress', 'need_info', 'resolved', 'closed'];

export const AdminReportsPanel: React.FC = () => {
    const { currentUser } = useOrbitStore();

    const [activeTab, setActiveTab] = useState<ReportType>('bug');
    const [reports, setReports] = useState<Report[]>([]);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [threads, setThreads] = useState<ReportThread[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingThreads, setIsLoadingThreads] = useState(false);

    // Detail view state
    const [showContext, setShowContext] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [internalNotes, setInternalNotes] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; report: Report | null }>({
        isOpen: false,
        report: null
    });

    // Filters
    const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Custom dropdown states
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
    const [isStatusChangeOpen, setIsStatusChangeOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const statusFilterRef = useRef<HTMLDivElement>(null);
    const statusChangeRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (statusFilterRef.current && !statusFilterRef.current.contains(e.target as Node)) {
                setIsStatusFilterOpen(false);
            }
            if (statusChangeRef.current && !statusChangeRef.current.contains(e.target as Node)) {
                setIsStatusChangeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch reports
    useEffect(() => {
        fetchReports();

        // Realtime subscription
        const channel = supabase
            .channel('admin-reports')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reports' },
                () => fetchReports()
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'report_threads' },
                (payload) => {
                    if (selectedReport && payload.new.report_id === selectedReport.id) {
                        fetchThreads(selectedReport.id);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeTab]);

    useEffect(() => {
        if (selectedReport) {
            setInternalNotes(selectedReport.internal_notes || '');
            fetchThreads(selectedReport.id);
        }
    }, [selectedReport?.id]);

    // Track previous thread count to only scroll on NEW messages, not initial load
    const prevThreadCountRef = useRef(0);
    useEffect(() => {
        // Only scroll if thread count increased (new message added)
        if (threads.length > prevThreadCountRef.current && prevThreadCountRef.current > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevThreadCountRef.current = threads.length;
    }, [threads.length]);

    const fetchReports = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('reports')
                .select(`
          *,
          reporter:profiles!reporter_id(username, avatar_url)
        `)
                .eq('report_type', activeTab)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedReports: Report[] = (data || []).map(r => ({
                ...r,
                reporter_username: r.reporter?.username,
                reporter_avatar: r.reporter?.avatar_url
            }));

            setReports(mappedReports);
        } catch (error: any) {
            console.error('Failed to fetch reports:', error);
            toast.error('Failed to load reports');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchThreads = async (reportId: string) => {
        setIsLoadingThreads(true);
        try {
            const { data, error } = await supabase
                .from('report_threads')
                .select(`
          *,
          sender:profiles!sender_id(username, avatar_url, is_admin)
        `)
                .eq('report_id', reportId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            setThreads((data || []).map(t => ({
                ...t,
                sender_username: t.sender?.username,
                sender_avatar: t.sender?.avatar_url,
                sender_is_admin: t.sender?.is_admin
            })));
        } catch (error: any) {
            console.error('Failed to fetch threads:', error);
        } finally {
            setIsLoadingThreads(false);
        }
    };

    const handleStatusChange = async (status: ReportStatus) => {
        if (!selectedReport) return;

        try {
            const updates: any = {
                status,
                updated_at: new Date().toISOString()
            };

            if (status === 'resolved') {
                updates.resolved_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from('reports')
                .update(updates)
                .eq('id', selectedReport.id);

            if (error) throw error;

            setSelectedReport({ ...selectedReport, status });
            toast.success(`Status updated to ${STATUS_CONFIG[status].label}`);
            fetchReports();
        } catch (error: any) {
            console.error('Failed to update status:', error);
            toast.error('Failed to update status');
        }
    };

    const handleSaveNotes = async () => {
        if (!selectedReport) return;

        setIsSavingNotes(true);
        try {
            const { error } = await supabase
                .from('reports')
                .update({ internal_notes: internalNotes })
                .eq('id', selectedReport.id);

            if (error) throw error;

            toast.success('Notes saved');
            setSelectedReport({ ...selectedReport, internal_notes: internalNotes });
        } catch (error: any) {
            console.error('Failed to save notes:', error);
            toast.error('Failed to save notes');
        } finally {
            setIsSavingNotes(false);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedReport || !currentUser) return;

        setIsSending(true);
        try {
            const { error } = await supabase
                .from('report_threads')
                .insert({
                    report_id: selectedReport.id,
                    sender_id: currentUser.id,
                    is_admin_reply: true,
                    content: replyText.trim()
                });

            if (error) throw error;

            setReplyText('');
            fetchThreads(selectedReport.id);
            toast.success('Reply sent');
        } catch (error: any) {
            console.error('Failed to send reply:', error);
            toast.error('Failed to send reply');
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteReport = async () => {
        const report = deleteConfirm.report;
        if (!report) return;

        setDeleteConfirm({ isOpen: false, report: null });
        setIsDeleting(true);

        try {
            // Delete threads first (foreign key constraint)
            await supabase
                .from('report_threads')
                .delete()
                .eq('report_id', report.id);

            // Delete the report
            const { error } = await supabase
                .from('reports')
                .delete()
                .eq('id', report.id);

            if (error) throw error;

            toast.success('Report deleted');
            setSelectedReport(null);
            fetchReports();
        } catch (error: any) {
            console.error('Failed to delete report:', error);
            toast.error('Failed to delete report');
        } finally {
            setIsDeleting(false);
        }
    };

    // Filter reports
    const filteredReports = reports.filter(r => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                r.user_text.toLowerCase().includes(q) ||
                r.reporter_username?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const formatTimestamp = (ts: string) => {
        const date = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    const bugCount = reports.filter(r => r.report_type === 'bug').length;
    const suggestionCount = reports.filter(r => r.report_type === 'suggestion').length;

    return (
        <>
            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                title="Delete Report"
                message={`Are you sure you want to permanently delete this ${deleteConfirm.report?.report_type || 'report'}? This will also delete all associated messages. This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                onConfirm={handleDeleteReport}
                onCancel={() => setDeleteConfirm({ isOpen: false, report: null })}
            />
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Orbitron, monospace' }}>
                        🛠️ SUPPORT REPORTS
                    </h2>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800">
                    <button
                        onClick={() => { setActiveTab('bug'); setSelectedReport(null); }}
                        className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 font-bold text-sm transition-all ${activeTab === 'bug'
                            ? 'bg-red-500/10 text-red-400 border-b-2 border-red-500'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Bug className="w-4 h-4" />
                        Bugs ({bugCount})
                    </button>
                    <button
                        onClick={() => { setActiveTab('suggestion'); setSelectedReport(null); }}
                        className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 font-bold text-sm transition-all ${activeTab === 'suggestion'
                            ? 'bg-amber-500/10 text-amber-400 border-b-2 border-amber-500'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Lightbulb className="w-4 h-4" />
                        Suggestions ({suggestionCount})
                    </button>
                </div>

                {/* Filters */}
                <div className="p-3 border-b border-slate-800 flex flex-wrap gap-3">
                    <div className="relative" ref={statusFilterRef}>
                        <button
                            onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                            className="flex items-center gap-2 bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-300 transition-colors"
                        >
                            <Filter className="w-4 h-4 text-slate-500" />
                            <span>{statusFilter === 'all' ? 'All Status' : STATUS_CONFIG[statusFilter].label}</span>
                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isStatusFilterOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {isStatusFilterOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-full left-0 mt-1 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden"
                                >
                                    <button
                                        onClick={() => { setStatusFilter('all'); setIsStatusFilterOpen(false); }}
                                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${statusFilter === 'all' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700'}`}
                                    >
                                        All Status
                                    </button>
                                    {STATUS_OPTIONS.map(s => {
                                        const config = STATUS_CONFIG[s];
                                        const Icon = config.icon;
                                        return (
                                            <button
                                                key={s}
                                                onClick={() => { setStatusFilter(s); setIsStatusFilterOpen(false); }}
                                                className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${statusFilter === s ? `${config.color}` : 'text-slate-300 hover:bg-slate-700'}`}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                {config.label}
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by text or username..."
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex h-[500px]">
                    {/* Reports List */}
                    <div className="w-80 border-r border-slate-800 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                            </div>
                        ) : filteredReports.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No {activeTab}s found</p>
                            </div>
                        ) : (
                            filteredReports.map(report => (
                                <button
                                    key={report.id}
                                    onClick={() => setSelectedReport(report)}
                                    className={`w-full p-3 text-left border-b border-slate-800/50 transition-colors ${selectedReport?.id === report.id ? 'bg-slate-800/70' : 'hover:bg-slate-800/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300">
                                            {report.reporter_username?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <span className="text-sm text-slate-300 font-medium truncate">
                                            {report.reporter_username || 'Unknown'}
                                        </span>
                                        <span className="text-xs text-slate-600 ml-auto">
                                            {formatTimestamp(report.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 truncate mb-1.5">
                                        {report.user_text.slice(0, 60)}{report.user_text.length > 60 ? '...' : ''}
                                    </p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CONFIG[report.status].color}`}>
                                        {STATUS_CONFIG[report.status].label}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Detail View */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {selectedReport ? (
                            <>
                                {/* Report Header */}
                                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold">
                                                {selectedReport.reporter_username?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white">{selectedReport.reporter_username || 'Unknown'}</p>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(selectedReport.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Delete Button */}
                                            <button
                                                onClick={() => setDeleteConfirm({ isOpen: true, report: selectedReport })}
                                                disabled={isDeleting}
                                                className="px-3 py-1.5 rounded-lg text-sm font-bold border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                {isDeleting ? '...' : 'Delete'}
                                            </button>
                                            <div className="relative" ref={statusChangeRef}>
                                                <button
                                                    onClick={() => setIsStatusChangeOpen(!isStatusChangeOpen)}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border flex items-center gap-2 transition-colors ${STATUS_CONFIG[selectedReport.status].color}`}
                                                >
                                                    {(() => { const Icon = STATUS_CONFIG[selectedReport.status].icon; return <Icon className="w-4 h-4" />; })()}
                                                    {STATUS_CONFIG[selectedReport.status].label}
                                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isStatusChangeOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                <AnimatePresence>
                                                    {isStatusChangeOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                                            transition={{ duration: 0.15 }}
                                                            className="absolute top-full right-0 mt-1 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden"
                                                        >
                                                            {STATUS_OPTIONS.map(s => {
                                                                const config = STATUS_CONFIG[s];
                                                                const Icon = config.icon;
                                                                return (
                                                                    <button
                                                                        key={s}
                                                                        onClick={() => { handleStatusChange(s); setIsStatusChangeOpen(false); }}
                                                                        className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${selectedReport.status === s ? `${config.color}` : 'text-slate-300 hover:bg-slate-700'}`}
                                                                    >
                                                                        <Icon className="w-4 h-4" />
                                                                        {config.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Scrollable Content */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {/* User Message */}
                                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                        <p className="text-sm font-bold text-slate-300 mb-2">Report:</p>
                                        <p className="text-slate-400 text-sm whitespace-pre-wrap">{selectedReport.user_text}</p>
                                        {selectedReport.attachment_url && (
                                            <div className="mt-3">
                                                <a href={selectedReport.attachment_url} target="_blank" rel="noopener noreferrer">
                                                    <img
                                                        src={selectedReport.attachment_url}
                                                        alt="Attachment"
                                                        className="max-h-48 rounded-lg border border-slate-700 hover:border-cyan-500 transition-colors"
                                                    />
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* Context (Collapsible) */}
                                    <div className="border border-slate-700 rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => setShowContext(!showContext)}
                                            className="w-full px-4 py-3 flex items-center justify-between bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                                        >
                                            <span className="text-sm font-bold text-slate-400 flex items-center gap-2">
                                                {showContext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                Context Data
                                            </span>
                                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showContext ? 'rotate-180' : ''}`} />
                                        </button>
                                        <AnimatePresence>
                                            {showContext && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="p-4 bg-slate-900/50 text-xs font-mono space-y-1">
                                                        {selectedReport.context && Object.entries(selectedReport.context).map(([key, value]) => (
                                                            <div key={key} className="flex">
                                                                <span className="text-cyan-400 w-28 flex-shrink-0">{key}:</span>
                                                                <span className="text-slate-400 break-all">
                                                                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Internal Notes */}
                                    <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <StickyNote className="w-4 h-4 text-amber-400" />
                                            <span className="text-sm font-bold text-amber-400">Internal Notes (Admin Only)</span>
                                        </div>
                                        <textarea
                                            value={internalNotes}
                                            onChange={(e) => setInternalNotes(e.target.value)}
                                            placeholder="Add private notes..."
                                            rows={2}
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                                        />
                                        <button
                                            onClick={handleSaveNotes}
                                            disabled={isSavingNotes || internalNotes === (selectedReport.internal_notes || '')}
                                            className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isSavingNotes || internalNotes === (selectedReport.internal_notes || '')
                                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                                }`}
                                        >
                                            {isSavingNotes ? 'Saving...' : 'Save Notes'}
                                        </button>
                                    </div>

                                    {/* Thread */}
                                    <div>
                                        <p className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4" />
                                            Conversation
                                        </p>
                                        {isLoadingThreads ? (
                                            <div className="flex justify-center py-4">
                                                <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                                            </div>
                                        ) : threads.length === 0 ? (
                                            <p className="text-slate-500 text-sm text-center py-4">No replies yet</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {threads.map(thread => (
                                                    <div key={thread.id} className="flex gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${thread.is_admin_reply
                                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                                            : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                                                            }`}>
                                                            {thread.sender_username?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`text-xs font-bold ${thread.is_admin_reply ? 'text-amber-400' : 'text-cyan-400'}`}>
                                                                    {thread.is_admin_reply ? 'Support' : thread.sender_username || 'User'}
                                                                </span>
                                                                <span className="text-xs text-slate-600">{formatTimestamp(thread.created_at)}</span>
                                                            </div>
                                                            <div className={`rounded-lg p-3 text-sm ${thread.is_admin_reply
                                                                ? 'bg-amber-500/10 border border-amber-500/20 text-slate-300'
                                                                : 'bg-slate-800/50 border border-slate-700 text-slate-400'
                                                                }`}>
                                                                {thread.content}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </div>

                                {/* Reply Input */}
                                <div className="p-4 border-t border-slate-800">
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                                            placeholder="Reply to user..."
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                        />
                                        <button
                                            onClick={handleSendReply}
                                            disabled={!replyText.trim() || isSending}
                                            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${!replyText.trim() || isSending
                                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
                                                }`}
                                        >
                                            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-500">
                                <div className="text-center">
                                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                    <p>Select a report to view details</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};


