
import React, { useState } from 'react';
import { Logo } from './Logo';
import { supabase } from '../services/supabaseClient';
import { apiRequest } from '../services/api';
import { SubscriptionPlans } from './SubscriptionPlans';

interface PricingPageProps {
    onBack: () => void;
    onStart: () => void;
    onSubscribe?: (priceId: string) => void;
    isAuthenticated?: boolean;
    userName?: string;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onBack, onStart, onSubscribe, isAuthenticated, userName }) => {
    const [isYearly, setIsYearly] = useState(false);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    React.useEffect(() => {
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
            }
        };
        getUser();
    }, []);

    const getStripeUrl = (baseUrl: string) => {
        if (!userId) return baseUrl;
        // Check if url already has query params
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}client_reference_id=${userId}`;
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-sans selection:bg-medical-100 dark:selection:bg-medical-900 flex flex-col">
            {/* Navigation */}
            <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between w-full">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group"
                >
                    <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
                        <Logo className="w-full h-full" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Back to Home</span>
                </button>
                <div className="flex items-center gap-6">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                Logged in as <span className="text-slate-900 dark:text-white font-semibold">{userName || 'User'}</span>
                            </span>
                        </div>
                    ) : (
                        <>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 hidden md:block">Already have an account?</span>
                            <button
                                onClick={onStart}
                                className="text-sm font-semibold text-medical-600 dark:text-medical-400 hover:underline"
                            >
                                Login
                            </button>
                        </>
                    )}
                </div>
            </nav>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center py-10 md:py-16 px-4 md:px-6">
                <div className="text-center max-w-3xl mx-auto mb-8 md:mb-10">
                    <h2 className="text-medical-600 dark:text-medical-400 font-semibold tracking-wide uppercase text-sm mb-3">Simple Pricing</h2>
                    <h1 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 md:mb-6">
                        Invest in your clinical workflow.
                    </h1>
                    <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                        Guideline-aware clinical intelligence with pathophysiology, drug safety, interactions, and evidence-based reasoning built in.
                    </p>
                </div>

                <SubscriptionPlans userId={userId} getStripeUrl={getStripeUrl} />
            </div>
        </div>
    );
};
