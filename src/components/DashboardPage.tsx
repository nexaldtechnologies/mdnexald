import React, { useState } from 'react';
import { Logo } from './Logo'; // Re-use Logo
import { ToolWaitlistModal } from './ToolWaitlistModal';
import { DashboardSearch } from './DashboardSearch';
import { TOOLS_DATA } from '../constants';

interface DashboardPageProps {
    userName: string;
    onNavigateToAI: () => void;
    onOpenSession: (sessionId: string) => void;
    recentSessions: any[];
    favoriteSessions: any[];
    userEmail?: string;
    userId?: string;
    currentView: 'dashboard' | 'ai' | 'tools' | 'profile' | 'settings';
    onNavigateFooter: (view: 'dashboard' | 'ai' | 'tools' | 'profile' | 'settings') => void;
    theme: 'light' | 'dark';
    onThemeChange: (theme: 'light' | 'dark') => void;
    onSearch: (query: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
    userName,
    onNavigateToAI,
    onOpenSession,
    recentSessions,
    favoriteSessions,
    userEmail,
    userId,
    currentView,
    onNavigateFooter,
    theme,
    onThemeChange,
    onSearch
}) => {
    const [lockedTool, setLockedTool] = useState<string | null>(null);


    // Filter for the tools you want to show on dashboard (seems like Paid tools were shown here)
    const tools = TOOLS_DATA.filter(t => ['mdnexa-calc', 'mdnexa-labs', 'mdnexa-scores', 'mdnexa-drugs', 'mdnexa-ddx', 'mdnexa-docu'].includes(t.id));

    return (
        <div className="flex flex-col h-screen bg-[#F8FAFC] dark:bg-[#0B1120] font-sans">
            {/* Header */}
            <header className="px-6 py-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img src="/logo_full.png" alt="MDnexa" className="h-6 w-auto object-contain" />
                </div>
                <button
                    onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Toggle Dark Mode"
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

            {/* Main Content (Scrollable) */}
            <main className="flex-1 overflow-y-auto px-6 pb-24 custom-scrollbar">
                {/* Helper text if needed, or remove */}
                <div className="mb-6">
                    <div className="text-left">
                        <h1 className="text-2xl font-semibold text-slate-800 dark:text-white cursor-default">
                            Good Morning {userName && userName !== 'User' ? `Dr. ${userName}` : 'Doc'}.<br />
                            <span className="text-medical-600 block mt-1">Welcome to MDnexa</span>
                        </h1>
                    </div>
                </div>

                {/* Search Bar - Takes to AI */}
                <DashboardSearch onSearch={onSearch} />
                <div className="mb-8 px-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 opacity-80">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Set the country and language in settings for answers that follow your local guidelines.
                    </p>
                </div>

                {/* Recents */}
                <section className="mb-8">
                    <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Recently Viewed</h2>
                    {recentSessions.length > 0 ? (
                        <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                            {recentSessions.slice(0, 5).map(session => (
                                <div
                                    key={session.id}
                                    onClick={() => onOpenSession(session.id)}
                                    className="snap-start min-w-[200px] bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md cursor-pointer transition-all"
                                >
                                    <div className="font-medium text-slate-700 dark:text-slate-200 line-clamp-2">{session.title || 'Untitled Chat'}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-slate-500 italic">No recent history.</div>
                    )}
                </section>

                {/* Favorites */}
                {favoriteSessions.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Favorites</h2>
                        <div className="space-y-3">
                            {favoriteSessions.slice(0, 3).map(session => (
                                <div
                                    key={session.id}
                                    onClick={() => onOpenSession(session.id)}
                                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                >
                                    <span className="font-medium text-slate-700 dark:text-slate-200">{session.title}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400">
                                        <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Tools Grid (Locked) */}
                <section className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tools (Coming Soon)</h2>
                        <button
                            onClick={() => onNavigateFooter('tools')}
                            className="text-sm font-medium text-medical-600 dark:text-medical-400 hover:underline"
                        >
                            View All
                        </button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {tools.map(tool => (
                            <div
                                key={tool.id}
                                onClick={() => setLockedTool(tool.name)}
                                className="p-6 rounded-2xl flex flex-col items-center justify-center gap-3 relative overflow-hidden group cursor-pointer border transition-all duration-300 bg-white dark:bg-slate-950"
                                style={{
                                    borderColor: `${tool.accentColor}${theme === 'dark' ? '40' : '4d'}`,
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
                                <div className="absolute top-2 right-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                                    style={{
                                        backgroundColor: `${tool.accentColor}${theme === 'dark' ? '40' : '15'}`
                                    }}
                                >
                                    <img src={tool.iconPath} alt={tool.name} className="w-6 h-6 object-contain dark:brightness-0 dark:invert" />
                                </div>
                                <span className="font-bold text-lg text-center" style={{ color: theme === 'dark' ? '#fff' : '#1e293b' }}>{tool.name}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Trending Guidelines (Placeholder) */}
                <section className="mb-8 opacity-60">
                    <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Trending Guidelines</h2>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <p className="text-sm text-slate-500">🚑 Sepsis Management Protocol (2025 Update)</p>
                    </div>
                </section>

            </main>

            <ToolWaitlistModal
                isOpen={!!lockedTool}
                onClose={() => setLockedTool(null)}
                toolName={lockedTool || ''}
                userEmail={userEmail}
                userId={userId}
            />
        </div >
    );
};
