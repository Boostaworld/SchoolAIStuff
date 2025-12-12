/**
 * ReportModal - Bug/Suggestion Submission Modal
 * Frictionless flow: type selection → text → optional screenshot → submit
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bug, Lightbulb, Paperclip, Send, CheckCircle, Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import { useOrbitStore } from '@/store/useOrbitStore';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { ReportType, ReportContext } from '@/types';
import {
    captureReportContext,
    canSubmitReport,
    recordReportSubmission,
    isDuplicateReport,
    recordReportForDuplicateCheck
} from '@/lib/utils/reportContext';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ModalState = 'form' | 'submitting' | 'success' | 'error';

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose }) => {
    const { currentUser } = useOrbitStore();

    // Form state
    const [reportType, setReportType] = useState<ReportType | null>(null);
    const [userText, setUserText] = useState('');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);

    // Modal state
    const [modalState, setModalState] = useState<ModalState>('form');
    const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [context, setContext] = useState<ReportContext | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const MAX_TEXT_LENGTH = 1000;
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    // Capture context when modal opens
    useEffect(() => {
        if (isOpen && currentUser) {
            setContext(captureReportContext(currentUser.id, currentUser.username));
        }
    }, [isOpen, currentUser]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setReportType(null);
                setUserText('');
                setAttachmentFile(null);
                setAttachmentPreview(null);
                setModalState('form');
                setSubmittedReportId(null);
                setErrorMessage('');
                setContext(null);
            }, 300); // After close animation
        }
    }, [isOpen]);

    // Focus textarea when type is selected
    useEffect(() => {
        if (reportType && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [reportType]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            toast.error('File too large. Maximum size is 5MB.');
            return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            toast.error('Only image files are allowed.');
            return;
        }

        setAttachmentFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setAttachmentPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const removeAttachment = () => {
        setAttachmentFile(null);
        setAttachmentPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async () => {
        if (!reportType || !userText.trim() || !currentUser || !context) return;

        // Rate limiting check
        if (!canSubmitReport()) {
            toast.error('Please wait before submitting another report.');
            return;
        }

        // Duplicate check
        if (isDuplicateReport(context.route, userText)) {
            toast.warning('You recently submitted a similar report. Are you sure?');
            // Allow anyway (just warning)
        }

        // Check online status
        if (!navigator.onLine) {
            toast.error('You appear to be offline. Please try again later.');
            return;
        }

        setModalState('submitting');

        try {
            let attachmentUrl: string | undefined;
            let attachmentType: string | undefined;

            // Upload attachment if present
            if (attachmentFile) {
                const fileExt = attachmentFile.name.split('.').pop();
                const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('dm_attachments')
                    .upload(fileName, attachmentFile);

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    // Continue without attachment
                    toast.warning('Could not upload screenshot. Submitting without it.');
                } else {
                    const { data: urlData } = supabase.storage
                        .from('dm_attachments')
                        .getPublicUrl(fileName);

                    attachmentUrl = urlData.publicUrl;
                    attachmentType = attachmentFile.type;
                }
            }

            // Insert report
            const { data, error } = await supabase
                .from('reports')
                .insert({
                    reporter_id: currentUser.id,
                    report_type: reportType,
                    user_text: userText.trim(),
                    attachment_url: attachmentUrl,
                    attachment_type: attachmentType,
                    context: context
                })
                .select('id')
                .single();

            if (error) throw error;

            // Record for rate limiting and duplicate detection
            recordReportSubmission();
            recordReportForDuplicateCheck(context.route, userText);

            setSubmittedReportId(data.id);
            setModalState('success');

        } catch (error: any) {
            console.error('Submit error:', error);
            setErrorMessage(error.message || 'Failed to submit report. Please try again.');
            setModalState('error');
        }
    };

    const handleViewInbox = () => {
        onClose();
        // Navigate to support inbox
        window.location.hash = 'support';
    };

    const isSubmitDisabled = !reportType || !userText.trim() || modalState === 'submitting';

    const getQuestionText = () => {
        if (reportType === 'bug') return 'What happened and what did you expect?';
        if (reportType === 'suggestion') return 'What would you like to see?';
        return 'Select a report type above';
    };

    const getPlaceholder = () => {
        if (reportType === 'bug') return 'I clicked X and expected Y, but Z happened...';
        if (reportType === 'suggestion') return 'It would be great if the app could...';
        return '';
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[99999] overflow-y-auto"
                >
                    {/* Backdrop with strong blur */}
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose} />

                    {/* Scrollable Container for Safe Centering */}
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-0 text-left shadow-2xl backdrop-blur-xl ring-1 ring-white/10"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-white" style={{ fontFamily: 'Orbitron, monospace' }}>
                                    {modalState === 'success' ? (
                                        <>
                                            <CheckCircle className="h-5 w-5 text-green-400" />
                                            <span className="text-green-400">REPORT SENT</span>
                                        </>
                                    ) : modalState === 'error' ? (
                                        <>
                                            <AlertCircle className="h-5 w-5 text-red-400" />
                                            <span className="text-red-400">ERROR</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-xl">📢</span>
                                            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">REPORT ISSUE</span>
                                        </>
                                    )}
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Content - Form State */}
                            {modalState === 'form' && (
                                <div className="space-y-5 p-5">
                                    {/* Type Selection */}
                                    <div>
                                        <p className="mb-3 text-sm font-medium text-slate-400">What type of issue?</p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setReportType('bug')}
                                                className={`group flex-1 rounded-xl border-2 p-4 transition-all ${reportType === 'bug'
                                                    ? 'border-red-500/50 bg-red-500/10 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                                                    : 'border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-red-500/30 hover:bg-red-500/5'
                                                    }`}
                                            >
                                                <div className="mb-2 flex justify-center">
                                                    <div className={`rounded-full p-2 transition-colors ${reportType === 'bug' ? 'bg-red-500/20' : 'bg-slate-800 group-hover:bg-red-500/10'}`}>
                                                        <Bug className="h-6 w-6" />
                                                    </div>
                                                </div>
                                                <span className="font-bold">Bug Report</span>
                                            </button>
                                            <button
                                                onClick={() => setReportType('suggestion')}
                                                className={`group flex-1 rounded-xl border-2 p-4 transition-all ${reportType === 'suggestion'
                                                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                                    : 'border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-amber-500/30 hover:bg-amber-500/5'
                                                    }`}
                                            >
                                                <div className="mb-2 flex justify-center">
                                                    <div className={`rounded-full p-2 transition-colors ${reportType === 'suggestion' ? 'bg-amber-500/20' : 'bg-slate-800 group-hover:bg-amber-500/10'}`}>
                                                        <Lightbulb className="h-6 w-6" />
                                                    </div>
                                                </div>
                                                <span className="font-bold">Suggestion</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Text Input */}
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={reportType || 'none'}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <p className="mb-2 text-sm font-medium text-slate-400">{getQuestionText()}</p>
                                            <div className="relative">
                                                <textarea
                                                    ref={textareaRef}
                                                    value={userText}
                                                    onChange={(e) => setUserText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
                                                    placeholder={getPlaceholder()}
                                                    disabled={!reportType}
                                                    rows={5}
                                                    className="w-full resize-none rounded-xl border border-slate-700/50 bg-slate-950/50 px-4 py-3 text-white placeholder-slate-600 focus:border-cyan-500/50 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                                <div className="absolute bottom-3 right-3 text-xs text-slate-600">
                                                    {userText.length}/{MAX_TEXT_LENGTH}
                                                </div>
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>

                                    {/* Attachment */}
                                    <div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />

                                        {!attachmentPreview ? (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={!reportType}
                                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700/50 bg-slate-800/20 py-3 text-sm text-slate-400 transition-all hover:border-slate-600 hover:bg-slate-800/40 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Paperclip className="h-4 w-4" />
                                                Attach Screenshot (optional)
                                            </button>
                                        ) : (
                                            <div className="relative flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
                                                <img
                                                    src={attachmentPreview}
                                                    alt="Preview"
                                                    className="h-16 w-16 rounded-lg border border-slate-700 object-cover"
                                                />
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="truncate text-sm text-slate-300">{attachmentFile?.name}</p>
                                                    <p className="text-xs text-slate-500">{(attachmentFile?.size || 0) / 1024 / 1024 < 1 ? `${((attachmentFile?.size || 0) / 1024).toFixed(0)} KB` : `${((attachmentFile?.size || 0) / 1024 / 1024).toFixed(2)} MB`}</p>
                                                </div>
                                                <button
                                                    onClick={removeAttachment}
                                                    className="rounded-lg p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                                                >
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Context notice */}
                                    <div className="flex items-center gap-2 rounded-lg bg-blue-500/5 px-3 py-2 text-xs text-blue-400/80">
                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                                        Context info (URL, browser, logs) will be automatically attached.
                                    </div>
                                </div>
                            )}

                            {/* Content - Submitting State */}
                            {modalState === 'submitting' && (
                                <div className="py-12 text-center">
                                    <div className="relative mx-auto mb-4 h-16 w-16">
                                        <div className="absolute inset-0 animate-ping rounded-full bg-cyan-500/20"></div>
                                        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-slate-800 border border-slate-700">
                                            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                                        </div>
                                    </div>
                                    <h3 className="mb-1 text-lg font-bold text-white">Sending Report...</h3>
                                    <p className="text-sm text-slate-400">Capturing diagnostics and uploading data.</p>
                                </div>
                            )}

                            {/* Content - Success State */}
                            {modalState === 'success' && (
                                <div className="space-y-4 p-5">
                                    <div className="text-center">
                                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-500/30">
                                            <CheckCircle className="h-8 w-8 text-green-400" />
                                        </div>
                                        <h3 className="mb-1 text-xl font-bold text-white">Report Received!</h3>
                                        <p className="text-sm text-slate-400">
                                            Thank you for helping us improve.
                                            {submittedReportId && <span className="mt-1 block font-mono text-xs opacity-50">Ref: #{submittedReportId.slice(0, 8)}</span>}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-slate-700/50 bg-slate-950/30 p-4">
                                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                            <MessageSquare className="h-3 w-3" />
                                            <span>Your Message</span>
                                        </div>
                                        <p className="text-sm text-slate-300">{userText}</p>
                                    </div>
                                </div>
                            )}

                            {/* Content - Error State */}
                            {modalState === 'error' && (
                                <div className="py-8 text-center px-4">
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30">
                                        <AlertCircle className="h-8 w-8 text-red-400" />
                                    </div>
                                    <h3 className="mb-2 text-lg font-bold text-white">Submission Failed</h3>
                                    <p className="mb-6 text-sm text-red-300/80 bg-red-500/5 p-3 rounded-lg border border-red-500/10 max-w-sm mx-auto">{errorMessage}</p>
                                    <button
                                        onClick={handleSubmit}
                                        className="rounded-xl bg-red-500 px-6 py-2 font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-400"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="flex gap-3 border-t border-white/5 bg-slate-950/30 p-4 backdrop-blur-md">
                                {modalState === 'form' && (
                                    <>
                                        <button
                                            onClick={onClose}
                                            className="flex-1 rounded-xl border border-white/5 bg-white/5 py-3 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isSubmitDisabled}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-lg transition-all ${isSubmitDisabled
                                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-cyan-500/20 hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-500/40 hover:-translate-y-0.5'
                                                }`}
                                        >
                                            <Send className="h-4 w-4" />
                                            Submit Report
                                        </button>
                                    </>
                                )}

                                {modalState === 'success' && (
                                    <>
                                        <button
                                            onClick={handleViewInbox}
                                            className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-violet-500"
                                        >
                                            View in Support Inbox
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="flex-1 rounded-xl border border-white/5 bg-white/5 py-3 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                                        >
                                            Close
                                        </button>
                                    </>
                                )}

                                {modalState === 'submitting' && (
                                    <button
                                        disabled
                                        className="flex-1 rounded-xl border border-white/5 bg-white/5 py-3 text-sm font-bold text-slate-500 cursor-wait"
                                    >
                                        Please wait...
                                    </button>
                                )}

                                {modalState === 'error' && (
                                    <button
                                        onClick={onClose}
                                        className="flex-1 rounded-xl border border-white/5 bg-white/5 py-3 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                                    >
                                        Close
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
