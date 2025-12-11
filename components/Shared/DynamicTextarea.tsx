import React, { useRef, useEffect } from 'react';
import clsx from 'clsx';

interface DynamicTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    onSubmit?: () => void;
    maxHeight?: number;
}

export const DynamicTextarea: React.FC<DynamicTextareaProps> = ({
    value,
    onChange,
    onSubmit,
    maxHeight = 200,
    className,
    onKeyDown,
    ...props
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }, [value, maxHeight]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit?.();
        }
        onKeyDown?.(e);
    };

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            className={clsx("resize-none overflow-hidden", className)}
            rows={1}
            {...props}
        />
    );
};
