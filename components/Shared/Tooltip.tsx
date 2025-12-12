import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  delay = 400,
  position = 'right'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        x = rect.left + rect.width / 2;
        y = rect.top;
        break;
      case 'bottom':
        x = rect.left + rect.width / 2;
        y = rect.bottom;
        break;
      case 'left':
        x = rect.left;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right;
        y = rect.top + rect.height / 2;
        break;
    }

    setCoords({ x, y });

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: '-translate-x-1/2 -translate-y-full mb-2',
    bottom: '-translate-x-1/2 translate-y-2',
    left: '-translate-y-1/2 -translate-x-full mr-2',
    right: '-translate-y-1/2 translate-x-2'
  };

  const arrowClasses = {
    top: 'left-1/2 -translate-x-1/2 top-full -mt-px border-l-transparent border-r-transparent border-b-transparent border-t-cyan-400/50',
    bottom: 'left-1/2 -translate-x-1/2 bottom-full -mb-px border-l-transparent border-r-transparent border-t-transparent border-b-cyan-400/50',
    left: 'top-1/2 -translate-y-1/2 left-full -ml-px border-t-transparent border-b-transparent border-r-transparent border-l-cyan-400/50',
    right: 'top-1/2 -translate-y-1/2 right-full -mr-px border-t-transparent border-b-transparent border-l-transparent border-r-cyan-400/50'
  };

  return (
    <>
      {React.cloneElement(children, {
        ref: triggerRef,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave
      })}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed z-[9999] pointer-events-none"
            style={{ left: coords.x, top: coords.y }}
          >
            <div className={`relative ${positionClasses[position]}`}>
              {/* Main tooltip */}
              <div className="relative px-3 py-2 rounded-lg border border-cyan-400/50 bg-slate-950/95 shadow-lg shadow-cyan-500/20 backdrop-blur-sm overflow-hidden">
                {/* Scanline effect */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-10"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6, 182, 212, 0.3) 2px, rgba(6, 182, 212, 0.3) 4px)'
                  }}
                />

                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-cyan-400/10 to-cyan-500/5 pointer-events-none" />

                {/* Content */}
                <p className="relative text-cyan-200 text-xs font-mono whitespace-nowrap leading-relaxed tracking-wide">
                  {content}
                </p>
              </div>

              {/* Arrow */}
              <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
