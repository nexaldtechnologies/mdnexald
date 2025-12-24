import React, { useState, useEffect } from 'react';
import { lookupMedicalTerm } from '../../services/geminiService';
import MarkdownRenderer from '../MarkdownRenderer';
import { useTypewriter } from '../../hooks/useTypewriter';
import { isArabic } from '../../constants';

interface MedicalDictionaryToolProps {
    region: string; // valid prop but ignored in UI now
    language: string;
}

export const MedicalDictionaryTool: React.FC<MedicalDictionaryToolProps> = ({ region, language }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [definition, setDefinition] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    // Only Language is adjustable now
    const [selectedLanguage, setSelectedLanguage] = useState(language || 'English');
    const isRTL = isArabic(selectedLanguage);

    const phrases = React.useMemo(() => [
        "Search medical term...",
        "Myocardial Infarction",
        "Appendicitis",
        "Hypertension",
        "Acetaminophen",
        "Diabetes Mellitus"
    ], []);
    const placeholder = useTypewriter(phrases);

    useEffect(() => {
        const saved = localStorage.getItem('mdnexa_dict_history');
        if (saved) {
            setRecentSearches(JSON.parse(saved));
        }
    }, []);

    const saveSearch = (term: string) => {
        const updated = [term, ...recentSearches.filter(t => t !== term)].slice(0, 15);
        setRecentSearches(updated);
        localStorage.setItem('mdnexa_dict_history', JSON.stringify(updated));
    };

    const handleSearch = async (termToSearch: string) => {
        if (!termToSearch.trim()) return;

        setIsLoading(true);
        setDefinition(null);
        setSearchTerm(termToSearch);

        try {
            // Simplified context since we aren't asking for region/country
            const context = "General Medical Context";

            const result = await lookupMedicalTerm(
                termToSearch,
                context,
                selectedLanguage,
                'detailed'
            );
            setDefinition(result);
            saveSearch(termToSearch);
        } catch (error) {
            console.error(error);
            setDefinition("## Error\nCould not retrieve definition. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in pb-24">
            {/* Top Search Bar */}
            <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-2">MDnexa Medical Dictionary</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Comprehensive definitions, clinical context, and related terms.</p>

                {/* Only Language Selector remains */}
                <div className="flex justify-center mb-8">
                    {/* Language Select */}
                    <div className="flex flex-col items-start text-left">
                        <label className="mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Language</label>
                        <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-4 shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-teal-500 cursor-pointer hover:border-teal-500/50 transition-all w-40"
                        >
                            <option value="English">English</option>
                            <option value="German">Deutsch</option>
                            <option value="Spanish">Español</option>
                            <option value="French">Français</option>
                            <option value="Hindi">Hindi</option>
                            <option value="Portuguese">Português</option>
                            <option value="Russian">Русский</option>
                            <option value="Italian">Italiano</option>
                            <option value="Chinese">中文</option>
                            <option value="Arabic">العربية</option>
                            <option value="Japanese">日本語</option>
                        </select>
                    </div>
                </div>

                <form
                    onSubmit={(e) => { e.preventDefault(); handleSearch(searchTerm); }}
                    className="relative max-w-3xl mx-auto"
                >
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={placeholder}
                        className="w-full pl-12 pr-40 py-4 rounded-xl border-none outline-none bg-slate-100 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-teal-500/20 shadow-lg shadow-teal-500/10 focus:shadow-teal-500/20 transition-all font-medium text-lg"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !searchTerm.trim()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? 'Searching...' : 'Search'}
                    </button>
                    {/* Search Icon */}
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </form>

                {/* Recent Searches (Horizontal Scroll) */}
                {recentSearches.length > 0 && !definition && (
                    <div className="max-w-3xl mx-auto mt-6 overflow-x-auto pb-2 custom-scrollbar">
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Recent:</span>
                            {recentSearches.map(term => (
                                <button
                                    key={term}
                                    onClick={() => handleSearch(term)}
                                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-600 dark:text-slate-300 hover:border-teal-500 hover:text-teal-600 transition-colors whitespace-nowrap"
                                >
                                    {term}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Results Area */}
            <div className="mt-8">
                <div className="">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 opacity-50 space-y-4">
                            <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
                            <p className="text-slate-500 font-medium">Analyzing clinical data...</p>
                        </div>
                    ) : definition ? (
                        <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 animate-fade-in ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                            <MarkdownRenderer
                                content={definition}
                                className="text-slate-800 dark:text-slate-200"
                                onLinkClick={(term) => handleSearch(term)}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                            {/* Placeholder content removed for cleaner look, or keep if desired */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
