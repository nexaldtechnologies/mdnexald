import React, { useState } from 'react';
import { useTypewriter } from '../hooks/useTypewriter';
import { DEFAULT_QUESTION_POOL } from '../constants';

interface DashboardSearchProps {
    onSearch: (query: string) => void;
}

export const DashboardSearch: React.FC<DashboardSearchProps> = ({ onSearch }) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Memoize phrases to prevent recreation
    const phrases = React.useMemo(() => [
        "Ask AI a specific medical question...",
        ...DEFAULT_QUESTION_POOL.slice(0, 10)
    ], []);

    const placeholder = useTypewriter(phrases);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            onSearch(searchQuery);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-card flex items-center gap-3 border border-slate-100 dark:border-slate-700 transition-all overflow-hidden"
        >
            <div className="pl-4 text-medical-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
            </div>
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={placeholder}
                className="flex-1 py-4 bg-transparent border-none focus:ring-0 outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
            />
            <button
                type="submit"
                disabled={!searchQuery.trim()}
                className="pr-4 text-medical-600 hover:text-medical-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                </svg>
            </button>
        </form>
    );
};
