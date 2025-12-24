import React, { useState, useEffect } from 'react';
import { apiRequest, apiFetch } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { REGIONS_DATA, VOICE_LANGUAGES, PROFESSIONAL_ROLES } from '../constants';
import { ReportHallucinationModal } from './ReportHallucinationModal'; // Import Modal
import { SubscriptionPlans } from './SubscriptionPlans';

interface SettingsPageProps {
    userName: string;
    setUserName: (n: string) => void;
    userRole: string;
    setUserRole: (r: string) => void;
    theme: string;
    onThemeChange: (theme: string) => void;
    region: string;
    setRegion: (r: string) => void;
    country: string;
    setCountry: (c: string) => void;
    language: string;
    setLanguage: (l: string) => void;
    fontSize: string;
    setFontSize: (s: string) => void;
    isAuthenticated: boolean;
    onOpenAuth: () => void;
    onLogout: () => void;
    onClearHistory: () => void;
    userId?: string | null;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
    userName,
    setUserName,
    userRole,
    setUserRole,
    theme,
    onThemeChange,
    region,
    setRegion,
    country,
    setCountry,
    language,
    setLanguage,
    fontSize,
    setFontSize,
    isAuthenticated,
    onOpenAuth,
    onLogout,
    onClearHistory,
    userId // [FIX] Add userId to destructuring
}) => {
    const [activeTab, setActiveTab] = useState<'account' | 'general' | 'help'>('account');
    const [userProfile, setUserProfile] = useState<any>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const [loadingPortal, setLoadingPortal] = useState(false);
    const [specialty, setSpecialty] = useState('');
    const [showReportModal, setShowReportModal] = useState(false); // Modal State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            fetchUserProfile();
        }
    }, [isAuthenticated]);

    const fetchUserProfile = async () => {
        // 1. Fetch from Auth Metadata (Fail-safe)
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserProfile((prev: any) => ({
                    ...prev,
                    full_name: user.user_metadata?.full_name || prev?.full_name,
                    email: user.email || prev?.email,
                    role: user.user_metadata?.role || prev?.role || 'user'
                }));
            }
        } catch (e) { console.error("Auth fetch failed", e); }

        // 2. Fetch from Backend (Source of Truth)
        try {
            const data = await apiRequest('/users/me');
            setUserProfile(data);
            // Assuming specialty might be in profile data, if not we default
            if (data.specialty) setSpecialty(data.specialty);

            // Fetch subscription status
            try {
                const { subscription } = await apiRequest('/subscriptions/status');
                setSubscription(subscription);
            } catch (subError) {
                console.log('No active subscription found or error fetching status');
            }
        } catch (error) {
            console.error('Error fetching user profile from API:', error);
        }
    };

    const handleManageSubscription = async () => {
        setLoadingPortal(true);
        try {
            const { url } = await apiRequest('/subscriptions/create-portal-session', 'POST');
            window.location.href = url;
        } catch (error) {
            console.error("Error creating portal session:", error);
            alert("Failed to open billing portal.");
        } finally {
            setLoadingPortal(false);
        }
    };

    const handleResetPassword = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const email = user?.email;
            if (!email) {
                alert("Could not determine your email address.");
                return;
            }
            if (confirm(`Send password reset email to ${email}?`)) {
                const data = await apiFetch('/auth/forgot-password', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                });
                if (data && data.success) {
                    alert("We’ve sent a reset link to your email.");
                } else {
                    alert(data.message || "Failed to send reset link.");
                }
            }
        } catch (error: any) {
            console.error("[PW_RESET_SETTINGS] Error:", error);
            alert(error.message || "An error occurred. Please try again.");
        }
    };

    const handleDeactivate = async () => {
        if (window.confirm("Are you sure you want to deactivate your account? This will permanently delete your data and log you out immediately.")) {
            try {
                await apiRequest('/users/delete-account', 'DELETE');
                alert("Account deactivated successfully.");
                onLogout();
            } catch (error) {
                console.error("Error deactivating account:", error);
                alert("Failed to deactivate account. Please try again or contact support.");
            }
        }
    };

    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newRegion = e.target.value;
        setRegion(newRegion);
        if (REGIONS_DATA[newRegion] && REGIONS_DATA[newRegion].length > 0) {
            setCountry(REGIONS_DATA[newRegion][0]);
        }
    };

    const handleReportHallucination = () => {
        setShowReportModal(true);
    };

    return (
        <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0B1120] font-sans overflow-hidden">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-20 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-30 shadow-sm
                fixed inset-y-0 left-0 transition-all duration-300 ease-in-out
                
                /* Mobile: Off-canvas */
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}

                /* Desktop (md+): Static with Width Transition */
                md:translate-x-0 md:static md:shadow-none
                ${isSidebarOpen ? 'md:w-64' : 'md:w-0 md:overflow-hidden md:border-r-0'}
            `}>
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800 min-w-[16rem]">
                    <span className="font-bold text-slate-900 dark:text-white text-lg">Settings</span>
                    <button
                        onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                        className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                        title="Toggle Theme"
                    >
                        {theme === 'dark' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                            </svg>
                        )}
                    </button>
                    {/* Close Button Mobile */}
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden ml-2 p-1 text-slate-400"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="flex-1 py-4 px-3 space-y-1 min-w-[16rem]">
                    <button
                        onClick={() => setActiveTab('account')}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${activeTab === 'account' ? 'bg-medical-50 dark:bg-medical-900/20 text-medical-700 dark:text-medical-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        Account & Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${activeTab === 'general' ? 'bg-medical-50 dark:bg-medical-900/20 text-medical-700 dark:text-medical-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                        </svg>
                        General Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('help')}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${activeTab === 'help' ? 'bg-medical-50 dark:bg-medical-900/20 text-medical-700 dark:text-medical-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                        </svg>
                        Help Center
                    </button>
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 min-w-[16rem]">
                    {isAuthenticated ? (
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                            </svg>
                            Log Out
                        </button>
                    ) : (
                        <button
                            onClick={onOpenAuth}
                            className="w-full py-2 bg-medical-600 hover:bg-medical-700 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                            Log In
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar relative">
                {/* Hamburger (Always Visible) */}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute top-4 left-4 p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors z-10"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </button>

                <div className="max-w-3xl mx-auto pt-8 md:pt-0">
                    {/* Header: Profile Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-8 shadow-sm flex items-start gap-6">
                        <div
                            className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold ring-4 ring-medical-50 dark:ring-slate-700 uppercase overflow-hidden flex-shrink-0 ${isAuthenticated ? 'bg-medical-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                            {isAuthenticated && userProfile?.logo_url ? (
                                <img src={userProfile.logo_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span>{isAuthenticated && (userProfile?.full_name || userName) ? (userProfile?.full_name || userName).split(' ').map((n: string) => n[0]).join('').substring(0, 2) : '?'}</span>
                            )}
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 dark:text-slate-200 uppercase tracking-wider mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        placeholder="Your Name"
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-medical-500 font-semibold"
                                        disabled={!isAuthenticated}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="block text-xs font-semibold text-slate-400 dark:text-slate-200 uppercase tracking-wider">Role</label>
                                    <select
                                        value={PROFESSIONAL_ROLES.includes(userRole) ? userRole : 'Other'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'Other') setUserRole('');
                                            else setUserRole(val);
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-medical-500"
                                        disabled={!isAuthenticated}
                                    >
                                        {PROFESSIONAL_ROLES.map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 dark:text-slate-200 uppercase tracking-wider mb-1">Specialty</label>
                                    <input
                                        type="text"
                                        value={specialty}
                                        onChange={(e) => setSpecialty(e.target.value)}
                                        placeholder="e.g. Cardiology"
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-medical-500"
                                        disabled={!isAuthenticated}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 dark:text-slate-200 uppercase tracking-wider mb-1">Status</label>
                                    <div className="px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 w-fit">
                                        <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">
                                            {subscription ? 'Premium Plan' : 'Free Plan'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {activeTab === 'account' && (
                        <div className="space-y-8 animate-fade-in">
                            <section>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Account Details</h3>
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-200 uppercase tracking-wider mb-2">Email Address</label>
                                        <input
                                            type="email"
                                            value={userProfile?.email || ''}
                                            disabled
                                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-500 dark:text-indigo-200 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-slate-800 dark:text-white">Password</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-300">Secure your account</div>
                                        </div>
                                        <button onClick={handleResetPassword} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                            Reset Password
                                        </button>
                                    </div>
                                </div>
                            </section>


                            <section>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Subscription Plans</h3>
                                <SubscriptionPlans
                                    userId={userId}
                                    getStripeUrl={(url: string) => {
                                        if (!userId) return url;
                                        const separator = url.includes('?') ? '&' : '?';
                                        return `${url}${separator}client_reference_id=${userId}`;
                                    }}
                                />
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Manage Subscription</h3>
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-slate-800 dark:text-white">Billing Portal</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-300">Manage payment methods, download invoices, and cancel subscription.</div>
                                        </div>
                                        <button
                                            onClick={handleManageSubscription}
                                            disabled={loadingPortal || !subscription}
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loadingPortal ? 'Loading...' : (subscription ? 'Open Portal' : 'No Active Plan')}
                                        </button>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
                                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-6 flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-red-800 dark:text-red-300">Delete Account</div>
                                        <div className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">Permanently remove your data and access.</div>
                                    </div>
                                    <button onClick={handleDeactivate} className="px-4 py-2 bg-white dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 rounded-lg text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                        Delete Account
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}


                    {
                        activeTab === 'general' && (
                            <div className="space-y-8 animate-fade-in">
                                <section>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Appearance & Language</h3>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-slate-800 dark:text-white">Theme</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-300">Select your preferred look</div>
                                            </div>
                                            <select
                                                value={theme}
                                                onChange={(e) => onThemeChange(e.target.value)}
                                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-medical-500"
                                            >
                                                <option value="light">Light</option>
                                                <option value="dark">Dark</option>
                                                <option value="system">System</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-slate-800 dark:text-white">Font Size</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-300">Adjust reading size</div>
                                            </div>
                                            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                                                <button onClick={() => setFontSize('small')} className={`px-3 py-1 text-xs rounded transition-colors ${fontSize === 'small' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Aa</button>
                                                <button onClick={() => setFontSize('normal')} className={`px-3 py-1 text-sm rounded transition-colors ${fontSize === 'normal' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Aa</button>
                                                <button onClick={() => setFontSize('large')} className={`px-3 py-1 text-base rounded transition-colors ${fontSize === 'large' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Aa</button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-slate-800 dark:text-white">Language</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-300">For AI responses and Tools</div>
                                            </div>
                                            <select
                                                value={language}
                                                onChange={(e) => setLanguage(e.target.value)}
                                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-medical-500"
                                            >
                                                {Object.keys(VOICE_LANGUAGES).map(lang => (
                                                    <option key={lang} value={lang}>{lang}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Clinical Region</h3>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-200 uppercase tracking-wider mb-2">Region</label>
                                            <select
                                                value={region}
                                                onChange={handleRegionChange}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-medical-500"
                                            >
                                                {Object.keys(REGIONS_DATA).map(r => (
                                                    <option key={r} value={r}>{r}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-200 uppercase tracking-wider mb-2">Country</label>
                                            <select
                                                value={country}
                                                onChange={(e) => setCountry(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-medical-500"
                                            >
                                                {REGIONS_DATA[region]?.map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </section>
                                <div className="pt-4">
                                    <button onClick={() => { if (confirm('Delete all history?')) onClearHistory(); }} className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 hover:underline">
                                        Clear all consultation history
                                    </button>
                                </div>
                            </div>
                        )
                    }



                    {
                        activeTab === 'help' && (
                            <div className="space-y-8 animate-fade-in">
                                <section>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Help Center</h3>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900 dark:text-white">Contact Support</h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-300 mb-2">Need help with your account or found a bug?</p>
                                                <a href="mailto:service@mdnexa.com" className="text-sm font-bold text-medical-600 dark:text-medical-400 hover:underline">
                                                    service@mdnexa.com
                                                </a>
                                            </div>
                                        </div>
                                        <div className="border-t border-slate-100 dark:border-slate-700 my-4"></div>
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-slate-900 dark:text-white">Report AI Hallucination</h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-300 mb-3">Found an incorrect or misleading AI response? Help us improve.</p>
                                                <button
                                                    onClick={handleReportHallucination}
                                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Report this issue
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )
                    }
                </div >
            </main >

            {/* Hallucination Report Modal */}
            < ReportHallucinationModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)
                }
            />
        </div >
    );
};
