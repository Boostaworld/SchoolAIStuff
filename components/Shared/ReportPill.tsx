/**
 * ReportPill - Navbar pill button for Bug/Suggestion Reports
 * Clean, minimal design that fits in the top header
 */

import React, { useState } from 'react';
import { Bug } from 'lucide-react';
import { ReportModal } from './ReportModal';

export const ReportPill: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 rounded-full text-amber-400 text-xs font-bold transition-all"
                aria-label="Report an issue"
                data-trail-id="report-pill"
            >
                <Bug className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Report</span>
            </button>

            <ReportModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
};
