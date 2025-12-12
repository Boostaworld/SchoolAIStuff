/**
 * ReportFAB - Floating Action Button for Bug/Suggestion Reports
 * Subtle edge tab design - slides out on hover to avoid blocking UI
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug } from 'lucide-react';
import { ReportModal } from './ReportModal';

interface ReportFABProps {
    isAuthenticated: boolean;
}

export const ReportFAB: React.FC<ReportFABProps> = ({ isAuthenticated }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Don't render if not authenticated
    if (!isAuthenticated) return null;

    return (
        <>
            {/* Edge Tab Button - Mostly hidden, slides out on hover */}
            <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1, type: 'spring', stiffness: 200 }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="fixed right-0 bottom-1/3 z-[9990]"
            >
                <motion.button
                    onClick={() => setIsModalOpen(true)}
                    animate={{
                        x: isHovered ? 0 : 36,
                        scale: isHovered ? 1.05 : 1
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white pl-3 pr-4 py-3 rounded-l-xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50"
                    aria-label="Report an issue"
                    data-trail-id="report-fab"
                >
                    <Bug className="w-5 h-5 flex-shrink-0" />
                    <AnimatePresence>
                        {isHovered && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.15 }}
                                className="text-sm font-bold whitespace-nowrap overflow-hidden"
                            >
                                Report Issue
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.button>
            </motion.div>

            {/* Report Modal */}
            <ReportModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
};
