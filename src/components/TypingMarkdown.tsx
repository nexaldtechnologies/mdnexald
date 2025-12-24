import React, { useState, useEffect, useRef } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface TypingMarkdownProps {
    content: string;
    shouldAnimate?: boolean;
    isRTL?: boolean;
}

export const TypingMarkdown: React.FC<TypingMarkdownProps> = ({ content, shouldAnimate, isRTL }) => {
    // If we shouldn't animate, just show full content immediately
    if (!shouldAnimate) {
        return <MarkdownRenderer content={content} className={`prose-sm md:prose-base ${isRTL ? 'text-right' : ''}`} isRTL={isRTL} />;
    }

    const [displayedContent, setDisplayedContent] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const indexRef = useRef(0);

    useEffect(() => {
        // Reset if content changes dramatically (new message), but for streaming, we just want to catch up
        if (!content) {
            setDisplayedContent('');
            indexRef.current = 0;
            return;
        }

        // Catch up loop
        const intervalId = setInterval(() => {
            if (indexRef.current < content.length) {
                // Type a few characters at a time for speed (adjust as needed)
                // For streaming, we often get chunks, so we want to be smooth but fast
                const chunkSize = 2;
                setDisplayedContent((prev) => content.slice(0, indexRef.current + chunkSize));
                indexRef.current += chunkSize;
            } else {
                // Finished typing current buffer
                setIsTyping(indexRef.current < content.length); // stay typing if more content arrives concurrently
            }
        }, 10); // 10ms is very fast smooth typing

        return () => clearInterval(intervalId);
    }, [content]);

    // Force completion if content stops updating for a while? 
    // Actually, checking if displayedContent === content in render is better.
    const isDone = displayedContent.length >= content.length;

    return (
        <div className="relative">
            <MarkdownRenderer content={displayedContent} className={`prose-sm md:prose-base ${isRTL ? 'text-right' : ''}`} isRTL={isRTL} />
            {!isDone && (
                <span className="inline-block w-2 h-4 ml-1 align-middle bg-slate-400 rounded-sm animate-pulse"></span>
            )}
        </div>
    );
};
