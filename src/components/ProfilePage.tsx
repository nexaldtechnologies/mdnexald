import React from 'react';

interface ProfilePageProps {
    userName: string;
    onLogout: () => void;
    // Keep consistent props with other pages even if unused to avoid App.tsx changes
    currentView: 'dashboard' | 'ai' | 'tools' | 'profile';
    onNavigateFooter: (view: 'dashboard' | 'ai' | 'tools' | 'profile') => void;
    userEmail?: string;
    userRole?: string;
    theme?: any;
    onThemeChange?: any;
    isAuthenticated?: any;
    onNavigateToAuth?: any;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
    userName,
    onLogout
}) => {
    return (
        <div className="flex flex-col h-screen bg-[#F8FAFC] dark:bg-[#0B1120] font-sans">
            {/* Header */}
            <header className="px-6 py-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Profile</h1>
                <button
                    onClick={onLogout}
                    className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                >
                    Log Out
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto px-6 py-8 pb-32">
                <div className="max-w-md mx-auto space-y-6">

                    {/* User Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            {userName ? userName.charAt(0) : 'U'}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{userName || 'User'}</h2>
                            <p className="text-slate-500 dark:text-slate-400">Medical Professional</p>
                        </div>
                    </div>

                    {/* Placeholder Logic for "Clean Slate" - Can evolve later */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                        <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">Account Settings</h3>
                        <p className="text-blue-700 dark:text-blue-400 text-sm">
                            Manage your subscription, verified credentials, and app preferences here.
                        </p>
                    </div>

                    <div className="text-center pt-8">
                        <p className="text-slate-400 text-sm">MDnexa Version 1.0.0</p>
                    </div>

                </div>
            </main>
        </div>
    );
};
