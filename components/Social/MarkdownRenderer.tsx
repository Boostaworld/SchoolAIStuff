/**
 * Markdown Renderer with Math Support
 * Renders markdown with LaTeX math, Unicode math, code blocks, and GFM features
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown content with support for:
 * - LaTeX inline math: $x^2$
 * - LaTeX block math: $$\sum_{i=1}^{n}$$
 * - Unicode math: Σ, π, ∫
 * - AsciiMath (via LaTeX syntax)
 * - GFM tables, task lists, strikethrough
 * - Code blocks with syntax
 * - Bold, italic, headers, lists, links
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Custom components for styling
          h1: ({ node, ...props }) => (
            <h1 className="text-xl font-bold text-cyan-300 mt-4 mb-2" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg font-bold text-cyan-400 mt-3 mb-2" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-base font-bold text-cyan-500 mt-2 mb-1" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-2 leading-relaxed" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside ml-4 mb-2 space-y-1" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside ml-4 mb-2 space-y-1" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-cyan-200" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-cyan-400 hover:text-cyan-300 underline transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');

            return !inline ? (
              // Block code (with language)
              <div className="my-3 rounded-lg overflow-hidden border border-cyan-500/30 bg-slate-900/50">
                {match && (
                  <div className="px-3 py-1 bg-slate-800/50 border-b border-cyan-500/20 text-xs font-mono text-cyan-400 uppercase">
                    {match[1]}
                  </div>
                )}
                <pre className="p-3 overflow-x-auto">
                  <code className={`text-sm font-mono text-cyan-100 ${className || ''}`} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              // Inline code
              <code
                className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-sm"
                {...props}
              >
                {children}
              </code>
            );
          },
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-cyan-500/50 pl-4 my-3 italic text-cyan-300/80 bg-slate-900/30 py-2"
              {...props}
            />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-3">
              <table
                className="min-w-full border border-cyan-500/30 rounded-lg overflow-hidden"
                {...props}
              />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-slate-800/50 text-cyan-300 font-mono text-sm" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-cyan-500/20" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-slate-800/30 transition-colors" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-2 text-left border-r border-cyan-500/20 last:border-r-0" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-2 text-cyan-200 border-r border-cyan-500/20 last:border-r-0" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-cyan-100" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-cyan-200/90" {...props} />
          ),
          del: ({ node, ...props }) => (
            <del className="line-through text-cyan-400/60" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
