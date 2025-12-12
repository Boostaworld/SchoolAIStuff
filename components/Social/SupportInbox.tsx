/**
 * SupportInbox - User-facing view for their bug reports and suggestions
 * Shows report list on left, conversation thread on right
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bug, Lightbulb, MessageSquare, Send, Clock, CheckCircle,
    HelpCircle, XCircle, Loader2, ChevronRight, Paperclip
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOrbitStore } from '@/store/useOrbitStore';
import { toast } from '@/lib/toast';
import { Report, ReportThread, ReportStatus } from '@/types';

// Status badge colors and labels
const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; icon: React.ElementType }> = {
    new: { label: 'New', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: Clock },
    in_progress: { label: 'In Progress', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Loader2 },
    need_info: { label: 'Need Info', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: HelpCircle },
    resolved: { label: 'Resolved', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
    closed: { label: 'Closed', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: XCircle }
};

export const SupportInbox: React.FC = () => {
    const { currentUser } = useOrbitStore();

    const [reports, setReports] = useState<Report[]>([]);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [threads, setThreads] = useState<ReportThread[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingThreads, setIsLoadingThreads] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch user's reports
    useEffect(() => {
        if (!currentUser) return;

        fetchReports();

        // Realtime subscription for new reports and threads
        const reportsChannel = supabase
            .channel('support-reports')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'reports',
                    filter: `reporter_id=eq.${currentUser.id}`
                },
                () => fetchReports()
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'report_threads'
                },
                (payload) => {
                    // If this thread belongs to the selected report, refresh threads
                    if (selectedReport && payload.new.report_id === selectedReport.id) {
                        fetchThreads(selectedReport.id);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(reportsChannel);
        };
    }, [currentUser]);

    // Fetch threads when report is selected
    useEffect(() => {
        if (selectedReport) {
            fetchThreads(selectedReport.id);
        }
    }, [selectedReport?.id]);

    // Scroll to bottom when new threads arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [threads]);

    const fetchReports = async () => {
        if (!currentUser) return;

        try {
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .eq('reporter_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReports(data || []);

            // If we had a selected report, update it with fresh data
            if (selectedReport) {
                const updated = data?.find(r => r.id === selectedReport.id);
                if (updated) setSelectedReport(updated);
            }
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

            // Map the joined data
            const mappedThreads: ReportThread[] = (data || []).map(t => ({
                ...t,
                sender_username: t.sender?.username,
                sender_avatar: t.sender?.avatar_url,
                sender_is_admin: t.sender?.is_admin
            }));

            setThreads(mappedThreads);
        } catch (error: any) {
            console.error('Failed to fetch threads:', error);
        } finally {
            setIsLoadingThreads(false);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedReport || !currentUser || isSending) return;

        setIsSending(true);
        try {
            const { error } = await supabase
                .from('report_threads')
                .insert({
                    report_id: selectedReport.id,
                    sender_id: currentUser.id,
                    is_admin_reply: false,
                    content: replyText.trim()
                });

            if (error) throw error;

            setReplyText('');
            fetchThreads(selectedReport.id);
        } catch (error: any) {
            console.error('Failed to send reply:', error);
            toast.error('Failed to send reply');
        } finally {
            setIsSending(false);
        }
    };

    const formatTimestamp = (ts: string) => {
        const date = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-950">
            {/* Header */}
            <div className="p-6 border-b border-slate-800">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Orbitron, monospace' }}>
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    SUPPORT INBOX
                </h1>
                <p className="text-slate-500 mt-1 text-sm">Your bug reports and suggestions</p>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Reports List (Left) */}
                <div className="w-80 border-r border-slate-800 flex flex-col">
                    <div className="p-3 border-b border-slate-800">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                            {reports.length} Report{reports.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {reports.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                <p>No reports yet</p>
                                <p className="text-xs mt-1">Click the bug button to submit one!</p>
                            </div>
                        ) : (
                            reports.map(report => (
                                <motion.button
                                    key={report.id}
                                    onClick={() => setSelectedReport(report)}
                                    className={`w-full p-4 text-left border-b border-slate-800/50 transition-colors ${selectedReport?.id === report.id
                                            ? 'bg-slate-800/70'
                                            : 'hover:bg-slate-800/30'
                                        }`}
                                    whileHover={{ x: 2 }}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Type icon */}
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${report.report_type === 'bug'
                                                ? 'bg-red-500/20 text-red-400'
                                                : 'bg-amber-500/20 text-amber-400'
                                            }`}>
                                            {report.report_type === 'bug' ? <Bug className="w-4 h-4" /> : <Lightbulb className="w-4 h-4" />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            {/* Text preview */}
                                            <p className="text-sm text-slate-300 truncate">
                                                {report.user_text.slice(0, 50)}{report.user_text.length > 50 ? '...' : ''}
                                            </p>

                                            {/* Status & time */}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CONFIG[report.status].color}`}>
                                                    {STATUS_CONFIG[report.status].label}
                                                </span>
                                                <span className="text-xs text-slate-600">
                                                    {formatTimestamp(report.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform ${selectedReport?.id === report.id ? 'rotate-90' : ''
                                            }`} />
                                    </div>
                                </motion.button>
                            ))
                        )}
                    </div>
                </div>

                {/* Conversation (Right) */}
                <div className="flex-1 flex flex-col">
                    {selectedReport ? (
                        <>
                            {/* Report Header */}
                            <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedReport.report_type === 'bug'
                                            ? 'bg-red-500/20 text-red-400'
                                            : 'bg-amber-500/20 text-amber-400'
                                        }`}>
                                        {selectedReport.report_type === 'bug' ? <Bug className="w-5 h-5" /> : <Lightbulb className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white capitalize">{selectedReport.report_type} Report</p>
                                        <p className="text-xs text-slate-500">
                                            ID: #{selectedReport.id.slice(0, 8)} • {new Date(selectedReport.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="ml-auto">
                                        <span className={`text-xs px-3 py-1 rounded-full border ${STATUS_CONFIG[selectedReport.status].color}`}>
                                            {STATUS_CONFIG[selectedReport.status].label}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Original report message */}
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                        {currentUser?.username?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-bold text-cyan-400">You</span>
                                            <span className="text-xs text-slate-600">{new Date(selectedReport.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                                            <p className="text-slate-300 text-sm whitespace-pre-wrap">{selectedReport.user_text}</p>
                                            {selectedReport.attachment_url && (
                                                <div className="mt-2">
                                                    <img
                                                        src={selectedReport.attachment_url}
                                                        alt="Attachment"
                                                        className="max-h-40 rounded-lg border border-slate-700"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Thread messages */}
                                {isLoadingThreads ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                                    </div>
                                ) : (
                                    threads.map(thread => (
                                        <div key={thread.id} className="flex gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${thread.is_admin_reply
                                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                                    : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                                                }`}>
                                                {thread.sender_username?.[0]?.toUpperCase() || (thread.is_admin_reply ? 'S' : 'U')}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-sm font-bold ${thread.is_admin_reply ? 'text-amber-400' : 'text-cyan-400'}`}>
                                                        {thread.is_admin_reply ? 'Support' : 'You'}
                                                    </span>
                                                    <span className="text-xs text-slate-600">{new Date(thread.created_at).toLocaleString()}</span>
                                                </div>
                                                <div className={`rounded-xl p-3 ${thread.is_admin_reply
                                                        ? 'bg-amber-500/10 border border-amber-500/20'
                                                        : 'bg-slate-800/50 border border-slate-700'
                                                    }`}>
                                                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{thread.content}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Reply Input */}
                            {selectedReport.status !== 'closed' && (
                                <div className="p-4 border-t border-slate-800">
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                                            placeholder="Type a reply..."
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                        />
                                        <button
                                            onClick={handleSendReply}
                                            disabled={!replyText.trim() || isSending}
                                            className={`px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${!replyText.trim() || isSending
                                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
                                                }`}
                                        >
                                            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-500">
                            <div className="text-center">
                                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Select a report to view the conversation</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
