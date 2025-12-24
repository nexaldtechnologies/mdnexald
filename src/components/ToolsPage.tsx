import React, { useState } from 'react';
import { TOOLS_DATA, ToolData } from '../constants';
import { Logo } from './Logo';
import { ToolWaitlistModal } from './ToolWaitlistModal';
import { MedicalDictionaryTool } from './tools/MedicalDictionaryTool';
import ICD10CheckerTool from './tools/ICD10CheckerTool';
import { DrugCheckerTool } from './tools/DrugCheckerTool';

// Alias Tool to ToolData for compatibility
type Tool = ToolData;

interface ToolProps { // Renamed from Tool to avoid conflict if I kept it, but I replaced it.
    // ... we can just use ToolData
}

interface ToolsPageProps {
    userName: string;
    onNavigateToAI: (initialQuery?: string) => void;
    userEmail?: string;
    userId?: string;
    currentView: 'dashboard' | 'ai' | 'tools' | 'profile' | 'settings';
    onNavigateFooter: (view: 'dashboard' | 'ai' | 'tools' | 'profile' | 'settings') => void;
    region: string;
    language: string;
    theme: 'light' | 'dark';
    onThemeChange: (theme: 'light' | 'dark') => void;
}

export const ToolsPage: React.FC<ToolsPageProps> = ({
    userName,
    onNavigateToAI,
    userEmail,
    userId,
    currentView,
    onNavigateFooter,
    region,
    language,
    theme,
    onThemeChange
}) => {
    const [selectedWaitlistTool, setSelectedWaitlistTool] = useState<string | null>(null);
    const [activeToolId, setActiveToolId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const TOOLS = TOOLS_DATA;

    const handleToolClick = (tool: Tool) => {
        if (tool.access === 'free') {
            if (tool.id === 'dictionary' || tool.id === 'icd10' || tool.id === 'drug_checker') {
                setActiveToolId(tool.id);
                setIsSidebarOpen(false); // Close sidebar on selection
            } else {
                // Redirects exit the tool view
                onNavigateToAI(`I want to use the ${tool.name}. ${tool.description}`);
            }
        } else {
            setSelectedWaitlistTool(tool.name);
        }
    };

    const handleSidebarSwitch = (tool: Tool) => {
        if (tool.access === 'waitlist') {
            // Cannot switch to it, strictly speaking it's disabled.
            // But maybe show waitlist modal?
            setSelectedWaitlistTool(tool.name);
            return;
        }

        if (tool.id === 'dictionary' || tool.id === 'icd10' || tool.id === 'drug_checker') {
            setActiveToolId(tool.id);
            setIsSidebarOpen(false); // Close sidebar on selection
        } else {
            // Redirects exit the tool view
            onNavigateToAI(`I want to use the ${tool.name}. ${tool.description}`);
        }
    };

    const handleBackToTools = () => {
        setActiveToolId(null);
    };

    // --- RENDER: TOOL VIEW (WITH SIDEBAR) ---
    if (activeToolId === 'dictionary' || activeToolId === 'icd10' || activeToolId === 'drug_checker') {
        const activeTool = TOOLS.find(t => t.id === activeToolId);

        return (
            <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0B1120] font-sans overflow-hidden">
                {/* Mobile Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/20 z-20 md:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Tools Sidebar */}
                <aside className={`
                    bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-30 shadow-xl
                    fixed inset-y-0 left-0 transition-all duration-300 ease-in-out
                    
                    /* Mobile: Off-canvas */
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}

                    /* Desktop (md+): Static with Width Transition */
                    md:translate-x-0 md:static md:shadow-none
                    ${isSidebarOpen ? 'md:w-64' : 'md:w-0 md:overflow-hidden md:border-r-0'}
                `}>
                    <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800 gap-3 min-w-[16rem]">
                        {/* Back Arrow added to Sidebar Header */}
                        <button
                            onClick={handleBackToTools}
                            className="p-1 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                        </button>

                        <div className="flex items-center gap-2">
                            <img src="/logo_full.png" alt="MDnexa" className="h-7 w-auto object-contain" />
                        </div>
                        {/* Close Button Mobile */}
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="md:hidden ml-auto p-1 text-slate-400"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar min-w-[16rem]">
                        <div className="px-3 pb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Active Tools
                        </div>
                        {TOOLS.map(tool => (
                            <button
                                key={tool.id}
                                onClick={() => handleSidebarSwitch(tool)}
                                className={`w-full text-left flex items-center gap-3 px-4 py-3 border-l-2 transition-all group ${tool.id === activeToolId
                                    ? 'border-medical-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                                    : tool.access === 'waitlist'
                                        ? 'border-transparent text-slate-500 dark:text-slate-400 opacity-50 cursor-not-allowed'
                                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                            >
                                <span className={`text-sm tracking-tight ${tool.id === activeToolId ? 'font-semibold' : 'font-medium'}`}>
                                    {tool.name}
                                </span>
                            </button>
                        ))}

                        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => setActiveToolId(null)}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-red-500 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                                Back to All Tools
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Tool Content Area */}
                <main className="flex-1 flex flex-col relative overflow-hidden">
                    {/* Main Header / Nav Bar */}
                    <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-20">
                        <div className="flex items-center gap-3">
                            {/* Hamburger Menu (Always Visible) */}
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                </svg>
                            </button>

                            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                                {TOOLS.find(t => t.id === activeToolId)?.name}
                            </h2>
                        </div>

                        {/* Theme Toggle MOVED here */}
                        <button
                            onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                        >
                            {theme === 'dark' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    {activeToolId === 'dictionary' && (
                        <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
                            <MedicalDictionaryTool
                                language={language}
                                region={region}
                            />
                        </div>
                    )}

                    {activeToolId === 'icd10' && (
                        <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
                            <ICD10CheckerTool
                                // Assuming 'country' prop is needed for ICD10CheckerTool, but not provided in ToolsPageProps.
                                // Using 'region' as a placeholder or removing if not applicable.
                                country={region}
                                region={region}
                                language={language}
                            />
                        </div>
                    )}

                    {activeToolId === 'drug_checker' && (
                        <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
                            <DrugCheckerTool
                                language={language}
                            />
                        </div>
                    )}
                </main>

                <ToolWaitlistModal
                    isOpen={!!selectedWaitlistTool}
                    onClose={() => setSelectedWaitlistTool(null)}
                    toolName={selectedWaitlistTool || ''}
                    userId={userId}
                />
            </div>
        );
    }

    // --- RENDER: GRID VIEW (HOME) ---
    return (
        <div className="flex flex-col h-screen bg-[#F8FAFC] dark:bg-[#0B1120] font-sans">
            {/* Header */}
            <header className="px-6 py-6 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <img src="/logo_full.png" alt="MDnexa" className="h-6 w-auto object-contain" />
                </div>
                <button
                    onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                >
                    {theme === 'dark' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                        </svg>
                    )}
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">MDnexa Medical Tools</h1>
                    <p className="text-slate-500 dark:text-slate-400">Access our suite of clinical utilities.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                    {TOOLS.map((tool) => (
                        <div
                            key={tool.id}
                            onClick={() => handleToolClick(tool)}
                            className="p-6 rounded-2xl border transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col h-full bg-white dark:bg-slate-950"
                            style={{
                                borderColor: `${tool.accentColor}${theme === 'dark' ? '40' : '4d'}`, // 25-30% opacity
                                color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = `0 0 20px -5px ${tool.accentColor}`;
                                e.currentTarget.style.borderColor = tool.accentColor;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.borderColor = `${tool.accentColor}${theme === 'dark' ? '40' : '4d'}`;
                            }}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                                    style={{
                                        backgroundColor: `${tool.accentColor}${theme === 'dark' ? '40' : '15'}`
                                    }}
                                >
                                    <img src={tool.iconPath} alt={tool.name} className="w-6 h-6 object-contain dark:brightness-0 dark:invert" />
                                </div>
                                {tool.access === 'waitlist' && (
                                    <span className="px-2 py-1 rounded-full bg-white/50 dark:bg-black/20 text-xs font-bold uppercase tracking-wider opacity-70">
                                        Waitlist
                                    </span>
                                )}
                            </div>

                            <h3 className="text-xl font-bold mb-2 transition-colors" style={{ color: theme === 'dark' ? '#fff' : '#1e293b' }}>
                                {tool.name}
                            </h3>

                            <p className="text-sm leading-relaxed font-medium mb-6 flex-grow" style={{ color: theme === 'dark' ? '#94a3b8' : '#475569' }}>
                                {tool.description}
                            </p>

                            <div
                                className="flex items-center text-sm font-bold mt-auto transition-transform transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                                style={{ color: tool.accentColor }}
                            >
                                {tool.access === 'free' ? 'Open Tool' : 'Join Waitlist'}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 ml-1">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                            </div>
                        </div>
                    ))}
                </div>
            </main >

            <ToolWaitlistModal
                isOpen={!!selectedWaitlistTool}
                onClose={() => setSelectedWaitlistTool(null)}
                toolName={selectedWaitlistTool || ''}
                userEmail={userEmail}
                userId={userId}
            />
        </div >
    );
};
