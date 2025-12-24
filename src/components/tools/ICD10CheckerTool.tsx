import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../../services/api';
import { useTypewriter } from '../../hooks/useTypewriter';
import { isArabic } from '../../constants';

interface ICD10Result {
    primary: {
        code: string;
        description: string;
        rationale: string;
        confidence: 'High' | 'Medium' | 'Low';
        isBillable: boolean;
        synonyms: string[];
        excludes: string[];
    };
    alternatives: {
        code: string;
        description: string;
        distinction: string;
    }[];
    refinements?: {
        question: string;
        options: string[];
    }[];
    standard: string;
}

interface ICD10CheckerToolProps {
    country: string; // Kept for prop compatibility but unused currently
    region: string;
    language: string;
}

const ICD10CheckerTool: React.FC<ICD10CheckerToolProps> = ({ country, region, language }) => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<ICD10Result | null>(null);
    const [loading, setLoading] = useState(false);
    const [contextChips, setContextChips] = useState<string[]>([]);

    // Local overrides for search settings
    const [selectedLanguage, setSelectedLanguage] = useState(language || 'English');
    const isRTL = isArabic(selectedLanguage);

    // New Standard Selector State (References user request: CM, GM, AM, CA, FR, JP, CN, etc)
    const [selectedStandard, setSelectedStandard] = useState("ICD-10 (WHO) International");

    const ICD_STANDARDS = [
        "ICD-10 (WHO) International", // Moved to top
        "ICD-10-CM (USA)",
        "ICD-10-GM (Germany)",
        "ICD-10-AM (Australia)",
        "ICD-10-CA (Canada)",
        "ICD-10-FR (France, CIM-10)",
        "ICD-10-JP (Japan)",
        "ICD-10-CN (China)",
        "ICD-10-BR (Brazil, CID-10)",
        "ICD-10-ES (Spain, CIE-10)",
        "ICD-10-NL (Netherlands)",
        "ICD-10-SE (Sweden)"
    ];

    const phrases = React.useMemo(() => [
        "Describe the diagnosis...",
        "Type 2 diabetes with polyneuropathy",
        "Fracture of distal radius",
        "Acute viral bronchitis",
        "Essential hypertension"
    ], []);
    const placeholder = useTypewriter(phrases);

    // Auto-focus input
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const commonContexts = ['Acute', 'Chronic', 'Left', 'Right', 'Bilateral', 'Post-op', 'Complication'];

    const toggleContext = (chip: string) => {
        setContextChips(prev =>
            prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
        );
    };

    const handleSearch = async (overrideQuery?: string) => {
        const q = overrideQuery || query;
        if (!q.trim()) return;

        setLoading(true);
        setResult(null);

        try {
            const data = await apiRequest('/gemini/icd10', 'POST', {
                query: q,
                standard: selectedStandard, // Pass explicit standard
                language: selectedLanguage,
                contextChips
            });
            setResult(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefinement = (option: string) => {
        // Append option to query and re-search
        const newQuery = `${query} ${option}`;
        setQuery(newQuery);
        handleSearch(newQuery);
    };

    const getConfidenceColor = (level: string) => {
        switch (level) {
            case 'High': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
            case 'Medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
            case 'Low': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
            {/* Header / Hero */}
            <div className="text-center mb-8">

                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-2">
                    Medical Coding Assistant
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                    Find the precise code with rationale and validation.
                </p>

                {/* Settings Selectors - Replicated Global Style */}
                <div className="flex flex-wrap justify-center gap-4 mb-4">
                    {/* Standard Select */}
                    <div className="flex flex-col items-start text-left">
                        <label className="mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">ICD Standard</label>
                        <select
                            value={selectedStandard}
                            onChange={(e) => setSelectedStandard(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-4 shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-medical-500 cursor-pointer hover:border-medical-500/50 transition-all w-64"
                        >
                            {ICD_STANDARDS.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Language Select */}
                    <div className="flex flex-col items-start text-left">
                        <label className="mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Language</label>
                        <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-4 shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-medical-500 cursor-pointer hover:border-medical-500/50 transition-all w-40"
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

                {/* Search Input */}
                <div className="relative max-w-3xl mx-auto">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder={placeholder}
                        className="w-full text-lg pl-12 pr-40 py-4 rounded-xl border-none outline-none bg-slate-100 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 shadow-lg shadow-orange-500/10 focus:shadow-orange-500/20 transition-all font-medium"
                    />
                    {/* Search Icon */}
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>

                    <button
                        onClick={() => handleSearch()}
                        disabled={loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                    >
                        {loading ? 'Checking...' : 'Check Code'}
                    </button>
                </div>

                {/* Chips */}
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {commonContexts.map(chip => (
                        <button
                            key={chip}
                            onClick={() => toggleContext(chip)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${contextChips.includes(chip)
                                ? 'bg-medical-100 text-medical-700 dark:bg-medical-900/40 dark:text-medical-300 border border-medical-200'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 border border-transparent'
                                }`}
                        >
                            {contextChips.includes(chip) ? '✓ ' : '+ '}{chip}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results */}
            {result && (
                <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    {/* Primary Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                        <div className="p-6 md:p-8">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                            {result.primary.code}
                                        </h2>
                                        {result.primary.isBillable && (
                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded uppercase">
                                                Billable
                                            </span>
                                        )}

                                    </div>
                                    <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
                                        {result.primary.description}
                                    </p>
                                </div>
                                <span className={`px-4 py-2 rounded-lg text-sm font-bold border ${getConfidenceColor(result.primary.confidence)}`}>
                                    {result.primary.confidence} Match
                                </span>
                            </div>

                            <div className="prose dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Rationale</h4>
                                <p className="text-slate-600 dark:text-slate-300 m-0">
                                    {result.primary.rationale}
                                </p>
                            </div>

                            {/* Synonyms & Excludes */}
                            {(result.primary.synonyms?.length > 0) && (
                                <div className="mt-4 text-sm text-slate-500">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">Matches: </span>
                                    {result.primary.synonyms.join(', ')}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => navigator.clipboard.writeText(result.primary.code)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                    Copy Code
                                </button>
                                <button
                                    onClick={() => navigator.clipboard.writeText(`${result.primary.code} - ${result.primary.description}`)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                    Copy Full
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Smart Refinements */}
                    {result.refinements && result.refinements.length > 0 && (
                        <div className="bg-medical-50 dark:bg-medical-900/20 border border-medical-100 dark:border-medical-800 rounded-xl p-6">
                            <h3 className="font-bold text-medical-800 dark:text-medical-300 mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Refine your result
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                {result.refinements.map((ref, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-medical-100 dark:border-slate-700">
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">{ref.question}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {ref.options.map(opt => (
                                                <button
                                                    key={opt}
                                                    onClick={() => handleRefinement(opt)}
                                                    className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-medical-600 hover:text-white dark:bg-slate-700 dark:hover:bg-medical-600 rounded-md transition-colors"
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Alternatives */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Other possibilities</h3>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {result.alternatives.map((alt, idx) => (
                                <div key={idx} className="p-4 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors flex justify-between items-center group cursor-pointer" onClick={() => handleSearch(alt.code + " " + alt.description)}>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-slate-600 dark:text-slate-400 group-hover:text-medical-600 transition-colors">{alt.code}</span>
                                            <span className="text-slate-700 dark:text-slate-300">{alt.description}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">{alt.distinction}</p>
                                    </div>
                                    <button className="text-slate-300 group-hover:text-medical-600">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ICD10CheckerTool;
