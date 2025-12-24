import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../../services/api';
import { useTypewriter } from '../../hooks/useTypewriter';

interface DrugResult {
    summary: {
        name: string;
        brand: string;
        class: string;
        badges: string[];
    };
    facts: {
        indications: string[];
        dosing: string;
        contraindications: string[];
        adverse_effects: string[];
    };
    clinical?: {
        renal?: { summary: string; detail: string };
        hepatic?: { summary: string; detail: string };
        interactions?: { major: string[]; moderate: string[] };
        pregnancy_lactation?: { pregnancy: string; lactation: string };
    };
    references: string[];
}

interface DrugCheckerToolProps {
    language: string;
}

// ... (imports)
import { VOICE_LANGUAGES, isArabic } from '../../constants';

// ... (interfaces)

export const DrugCheckerTool: React.FC<DrugCheckerToolProps> = ({ language }) => {
    // Search State
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DrugResult | null>(null);

    // Interaction Check State
    const [interactionDrugA, setInteractionDrugA] = useState('');
    const [interactionDrugB, setInteractionDrugB] = useState('');
    const [interactionLoading, setInteractionLoading] = useState(false);
    const [interactionResult, setInteractionResult] = useState<{ severity: string, mechanism: string, management: string, description: string } | null>(null);

    // Settings
    const [standard, setStandard] = useState("Germany (AMG / Fachinformation)");
    const [patientGroup, setPatientGroup] = useState("Adult");
    const [selectedLanguage, setSelectedLanguage] = useState(language || 'English'); // Default to prop or English

    // Sync with prop if it changes (optional, but good for consistency if global lang changes)
    useEffect(() => {
        if (language) setSelectedLanguage(language);
    }, [language]);

    const isRTL = isArabic(selectedLanguage);

    // ... (toggles)
    const [showRenal, setShowRenal] = useState(true);
    const [showInteractions, setShowInteractions] = useState(true);
    const [showPregnancy, setShowPregnancy] = useState(false);

    // ... (expandedSections state and toggleSection function)
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        renal: false,
        interactions: false,
        pregnancy: false
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // ... (phrases, placeholder)
    const phrases = React.useMemo(() => [
        "Check drug details...",
        "Metformin",
        "Apixaban",
        "Lisinopril",
        "Amoxicillin",
        "Bisoprolol"
    ], []);
    const placeholder = useTypewriter(phrases);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setResult(null);
        // Clear previous interaction result when searching new drug
        setInteractionResult(null);
        setInteractionDrugA(query); // Auto-fill Drug A with the searched drug
        setInteractionDrugB('');

        try {
            const data = await apiRequest('/gemini/drug-check', 'POST', {
                drugName: query,
                standard,
                patientGroup,
                language: selectedLanguage, // Send selected language
                toggles: {
                    renal: showRenal,
                    interactions: showInteractions,
                    pregnancy: showPregnancy
                }
            });
            setResult(data);

            if (data?.clinical?.interactions?.major?.length > 0) {
                setExpandedSections(prev => ({ ...prev, interactions: true }));
            }

        } catch (error) {
            console.error("Drug check failed", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInteractionCheck = async () => {
        if (!interactionDrugA.trim() || !interactionDrugB.trim()) return;
        setInteractionLoading(true);
        setInteractionResult(null);

        try {
            const data = await apiRequest('/gemini/drug-interaction', 'POST', {
                drugA: interactionDrugA,
                drugB: interactionDrugB,
                standard,
                patientGroup,
                language: selectedLanguage // Send selected language
            });
            setInteractionResult(data);
        } catch (error) {
            console.error("Interaction check failed", error);
        } finally {
            setInteractionLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in pb-24">

            {/* 1. Header & Controls */}
            <div className="flex flex-col mb-8 gap-4 items-center text-center">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
                        Quick Drug Checker
                    </h1>
                </div>

                {/* Controls Row Underneath Title */}
                <div className="flex flex-wrap gap-3 items-center justify-center">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Guidelines:</label>
                    <select
                        value={standard}
                        onChange={(e) => setStandard(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                    >
                        <option>Germany (AMG / Fachinformation)</option>
                        <option>USA (FDA)</option>
                        <option>UK (NICE / BNF)</option>
                        <option>EU (EMA / SmPC)</option>
                        <option>Australia (TGA / AMH)</option>
                        <option>Canada (Health Canada)</option>
                        <option>France (ANSM / VIDAL)</option>
                        <option>Japan (PMDA)</option>
                        <option>China (NMPA)</option>
                        <option>International (WHO)</option>
                    </select>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>

                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Language:</label>
                    <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                    >
                        {Object.keys(VOICE_LANGUAGES).map((lang) => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>

                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Patient:</label>
                    <select
                        value={patientGroup}
                        onChange={(e) => setPatientGroup(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                    >
                        <option>Adult</option>
                        <option>Pediatric</option>
                        <option>Geriatric</option>
                    </select>
                </div>
            </div>

            {/* 2. Hero Input */}
            <div className="relative max-w-3xl mx-auto mb-8">
                <div className="relative mb-6">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="w-full text-lg pl-12 pr-40 py-4 rounded-xl border-none outline-none bg-slate-100 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-rose-500/20 shadow-lg shadow-rose-500/10 focus:shadow-rose-500/20 transition-all font-medium"
                    />
                    {/* Search Icon */}
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>

                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-rose-500 hover:bg-rose-600 text-white px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 text-sm"
                    >
                        {loading ? 'Checking...' : 'Check Drug'}
                    </button>
                </div>

                {/* Toggles */}
                <div className="flex justify-center gap-3 flex-wrap">
                    <button
                        onClick={() => setShowRenal(!showRenal)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${showRenal ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                    >
                        Renal Dosing {showRenal ? 'ON' : 'OFF'}
                    </button>
                    <button
                        onClick={() => setShowInteractions(!showInteractions)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${showInteractions ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                    >
                        Interactions {showInteractions ? 'ON' : 'OFF'}
                    </button>
                    <button
                        onClick={() => setShowPregnancy(!showPregnancy)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${showPregnancy ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                    >
                        Pregnancy {showPregnancy ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>

            {/* 3. Results Layout */}
            {result && (
                <div className={`space-y-6 animate-fade-in-up ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>

                    {/* A) Drug Summary Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border-l-4 border-blue-500 shadow-sm p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{result.summary.name}</h2>
                                <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">{result.summary.brand}</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {result.summary.badges.map((badge, i) => (
                                    <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wide rounded-md">
                                        {badge}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-500 text-sm">Class: <span className="font-semibold text-slate-700 dark:text-slate-300">{result.summary.class}</span></p>
                    </div>

                    {/* B) Quick Clinical Facts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Indications */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span> Indications
                            </h3>
                            <ul className="space-y-2">
                                {result.facts.indications.map((ind, i) => (
                                    <li key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-snug">• {ind}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Dosing */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Standard Dosing
                            </h3>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white leading-relaxed">
                                {result.facts.dosing}
                            </p>
                            <p className="text-xs text-slate-400 mt-2">({patientGroup})</p>
                        </div>

                        {/* Contraindications */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span> Contraindications
                            </h3>
                            <ul className="space-y-2">
                                {result.facts.contraindications.map((ci, i) => (
                                    <li key={i} className="text-sm text-red-700 dark:text-red-400 leading-snug font-medium">• {ci}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Adverse Effects */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span> Adverse Effects
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {result.facts.adverse_effects.map((ae, i) => (
                                    <span key={i} className="px-2 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-xs rounded border border-orange-100 dark:border-orange-800">
                                        {ae}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 4) Smart Clinical Sections (Collapsible) */}

                    {/* Renal/Hepatic */}
                    {(showRenal && result.clinical?.renal) && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <button
                                onClick={() => toggleSection('renal')}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold text-slate-800 dark:text-white ml-1">Renal & Hepatic Adjustments</h3>
                                    <span className="text-xs text-slate-500 hidden md:inline ml-2">• {result.clinical.renal.summary}</span>
                                </div>
                                <span className="text-slate-400 text-xl transform transition-transform duration-200" style={{ transform: expandedSections.renal ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                            </button>

                            {expandedSections.renal && (
                                <div className="p-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Renal Impairment</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{result.clinical.renal.detail}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Hepatic Impairment</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{result.clinical?.hepatic?.detail || "No specific data returned."}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Interactions */}
                    {(showInteractions && result.clinical?.interactions) && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <button
                                onClick={() => toggleSection('interactions')}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold text-slate-800 dark:text-white ml-1">Drug Interactions</h3>
                                    <span className="text-xs text-slate-500 hidden md:inline ml-2">
                                        • {result.clinical.interactions.major.length > 0 ?
                                            `${result.clinical.interactions.major.length} Major Interactions` :
                                            "Common interactions summary"}
                                    </span>
                                </div>
                                <span className="text-slate-400 text-xl transform transition-transform duration-200" style={{ transform: expandedSections.interactions ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                            </button>

                            {expandedSections.interactions && (
                                <div className="p-6 border-t border-slate-100 dark:border-slate-800">
                                    <div className="grid md:grid-cols-2 gap-8 mb-6">
                                        <div>
                                            <h4 className="text-sm font-bold text-red-600 dark:text-red-400 mb-2 uppercase tracking-wide">Major / Serious</h4>
                                            {result.clinical.interactions.major.length > 0 ? (
                                                <ul className="list-disc list-inside space-y-1">
                                                    {result.clinical.interactions.major.map((int, i) => (
                                                        <li key={i} className="text-sm text-slate-700 dark:text-slate-300">{int}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-slate-500 italic">None listed.</p>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-yellow-600 dark:text-yellow-500 mb-2 uppercase tracking-wide">Moderate / Caution</h4>
                                            {result.clinical.interactions.moderate.length > 0 ? (
                                                <ul className="list-disc list-inside space-y-1">
                                                    {result.clinical.interactions.moderate.map((int, i) => (
                                                        <li key={i} className="text-sm text-slate-700 dark:text-slate-300">{int}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-slate-500 italic">None listed.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Specific Interaction Check */}
                                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                            Check Interaction Between Two Drugs
                                        </h4>
                                        <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                            <div className="flex-1 w-full">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1">First Drug</label>
                                                <input
                                                    type="text"
                                                    value={interactionDrugA}
                                                    onChange={(e) => setInteractionDrugA(e.target.value)}
                                                    placeholder="e.g. Warfarin"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                                                />
                                            </div>
                                            <div className="text-slate-400 font-bold px-2">+</div>
                                            <div className="flex-1 w-full">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1">Second Drug</label>
                                                <input
                                                    type="text"
                                                    value={interactionDrugB}
                                                    onChange={(e) => setInteractionDrugB(e.target.value)}
                                                    placeholder="e.g. Aspirin"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                                                />
                                            </div>
                                            <button
                                                onClick={handleInteractionCheck}
                                                disabled={interactionLoading}
                                                className="w-full md:w-auto px-6 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                                            >
                                                {interactionLoading ? 'Checking...' : 'Check Interaction'}
                                            </button>
                                        </div>

                                        {/* Specific Interaction Result */}
                                        {interactionResult && (
                                            <div className={`mt-4 p-4 rounded-xl border ${interactionResult.severity.includes('Contraindicated') || interactionResult.severity.includes('Major')
                                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                                : interactionResult.severity.includes('Moderate')
                                                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                                    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                                }`}>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded ${interactionResult.severity.includes('Contraindicated') || interactionResult.severity.includes('Major')
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                                        : interactionResult.severity.includes('Moderate')
                                                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                                            : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                        }`}>
                                                        {interactionResult.severity}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-white mb-1">{interactionResult.mechanism}</p>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{interactionResult.description}</p>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-white">Management: <span className="font-normal">{interactionResult.management}</span></p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pregnancy / Lactation */}
                    {(showPregnancy && result.clinical?.pregnancy_lactation) && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <button
                                onClick={() => toggleSection('pregnancy')}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold text-slate-800 dark:text-white ml-1">Pregnancy & Lactation</h3>
                                    <p className="text-xs text-slate-500 hidden md:inline ml-2">• Safety profile</p>
                                </div>
                                <span className="text-slate-400 text-xl transform transition-transform duration-200" style={{ transform: expandedSections.pregnancy ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                            </button>

                            {expandedSections.pregnancy && (
                                <div className="p-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="text-sm font-bold text-pink-600 dark:text-pink-400 mb-2">Pregnancy</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{result.clinical.pregnancy_lactation.pregnancy}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-pink-600 dark:text-pink-400 mb-2">Breastfeeding</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{result.clinical.pregnancy_lactation.lactation}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 6. References & Disclaimer */}
                    <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">References Utilized</h4>
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-6">
                            {result.references.map((ref, i) => (
                                <span key={i} className="text-xs text-slate-500 italic">{ref}</span>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400 max-w-2xl mx-auto">
                            Disclaimer: Supports clinical decision-making. Always verify with official product information (e.g. Fachinformation, SmPC) before prescribing. AI-generated content may contain errors.
                        </p>
                    </div>

                </div>
            )}
        </div>
    );
};
