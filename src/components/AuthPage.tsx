
import React, { useState, useEffect } from 'react';
import { Provider } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { apiRequest } from '../services/api';
import { Logo } from './Logo';

interface AuthPageProps {
    onBack: () => void;
    onSuccess: () => void;
    initialView?: 'login' | 'signup';
    pendingSubscriptionPriceId?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBack, onSuccess, initialView = 'login', pendingSubscriptionPriceId }) => {
    console.log('[FORGOT] Component mounted (AuthPage)');
    const [view, setView] = useState<'login' | 'signup' | 'forgot-password'>(initialView);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Referral State
    const [referralCode, setReferralCode] = useState<string | null>(null);
    const [referralData, setReferralData] = useState<any>(null); // { valid, promo_code, discount_percent, table }

    // Check for referral on mount
    useEffect(() => {
        console.log("AuthPage Mounted. View:", view);
        const storedRef = localStorage.getItem('mdnexa_ref');
        if (storedRef) {
            setReferralCode(storedRef);
            validateReferral(storedRef);
        }
    }, [view]);

    const validateReferral = async (code: string) => {
        try {
            const data = await apiRequest(`/referrals/validate?code=${code}`);
            if (data && data.valid) {
                // Normalize for easier checking
                if (!data.table && data.category) {
                    // logical guess if table is missing, but usually API returns it. 
                    // We will rely on category or API fix.
                }
                setReferralData(data);
            } else {
                // Invalid or inactive, ignore or clear? keeping quiet is usually better UX than erroring unless user typed it manually
                console.log("Referral code invalid:", data?.message);
                localStorage.removeItem('mdnexa_ref'); // Clear invalid code
            }
        } catch (err) {
            console.error("Referral validation failed", err);
        }
    };

    const [showResend, setShowResend] = useState(false);

    const resendVerification = async () => {
        if (!email) return;
        setLoading(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            });
            if (error) throw error;
            setSuccessMessage("Verification email sent! Please check your inbox.");
            setShowResend(false);
        } catch (err: any) {
            console.error("Resend error:", err);
            // Limit rate limit errors display or general errors
            setError(err.message || "Failed to resend verification.");
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'apple') => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: `${window.location.origin}/`,
                },
            });
            if (error) throw error;
        } catch (err: any) {
            console.error(`${provider} login error:`, err);
            setError(err.message || `Failed to login with ${provider}`);
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        setShowResend(false);

        // Forgot Password Flow
        if (view === 'forgot-password') {
            // ... (existing forgot password logic) ...
            console.log('[FORGOT] submitting reset for', email);
            try {
                // Use window.location.origin to ensure correct environment (localhost vs prod)
                const redirectUrl = `${window.location.origin}/reset-password`;

                // 1. Check if user actually exists (Custom Backend Endpoint)
                try {
                    const checkRes = await apiRequest('/users/check-email', 'POST', { email });
                    if (!checkRes.exists) {
                        setError("We couldn't find an account with that email address.");
                        return;
                    }
                } catch (checkErr) {
                    console.warn("Failed to check email existence, proceeding with standard flow.", checkErr);
                    // Fallback to standard flow if check API fails
                }

                // 2. Send Reset Link (Only if we passed check or check failed)
                const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: redirectUrl,
                });

                if (error) {
                    console.error('[FORGOT] Error:', error);
                    setError(error.message);
                } else {
                    setSuccessMessage('A password reset link has been sent to your email.');
                }
            } catch (err: any) {
                console.error('[FORGOT] Exception:', err);
                setError(err.message || 'Failed to process request.');
            } finally {
                setLoading(false);
            }
            return;
        }

        const STRIPE_LINKS: Record<string, string> = {
            'price_1SYuANFvNzuNoc9FLyLTf8ny': 'https://buy.stripe.com/9B6cN5dgg1Gt9sbegm5Ne07',
            'price_1SYuB2FvNzuNoc9FjxK1LNyV': 'https://buy.stripe.com/aFa8wPfoocl76fZ3BI5Ne08'
        };

        // Pre-calculate target URL (existing logic)
        let targetUrl: string | undefined;
        if (view === 'login') {
            if (pendingSubscriptionPriceId) {
                targetUrl = STRIPE_LINKS[pendingSubscriptionPriceId];
            }
        } else {
            const isFreeAccess = referralData && ['team_referrals', 'family_referrals', 'ambassador_referrals', 'ambassador', 'team', 'family'].includes(referralData.table || referralData.category);

            if (isFreeAccess) {
                targetUrl = undefined;
            } else {
                const priceIdToUse = pendingSubscriptionPriceId || 'price_1SYuANFvNzuNoc9FLyLTf8ny';
                targetUrl = STRIPE_LINKS[priceIdToUse];
                if (targetUrl && referralData?.promo_code) {
                    targetUrl += `?prefilled_promo_code=${referralData.promo_code}`;
                }
            }
        }

        try {
            if (view === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                // Sync token explicitly
                if (data.session) {
                    localStorage.setItem('token', data.session.access_token);
                    localStorage.setItem('user', JSON.stringify(data.session.user));
                }

                if (targetUrl) {
                    // APPEND USER INFO TO STRIPE LINK
                    const userId = data.session.user.id;
                    const userEmail = data.session.user.email;
                    const separator = targetUrl.includes('?') ? '&' : '?';
                    const finalUrl = `${targetUrl}${separator}client_reference_id=${userId}&prefilled_email=${encodeURIComponent(userEmail || '')}`;

                    window.location.href = finalUrl;
                    return;
                }

                onSuccess();

            } else {

                // Use Supabase Direct Signup
                try {
                    console.log("Attempting Supabase signup...");
                    const { data: authData, error: authError } = await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                full_name: name,
                                ref_source: referralCode || undefined,
                            }
                        }
                    });

                    if (authError) throw authError;

                    // Track Usage (existing logic)
                    if (referralData) {
                        try {
                            apiRequest('/referrals/track', 'POST', {
                                code: referralData.code,
                                table: referralData.table
                            }).catch(err => console.warn("Referral tracking schema check", err));
                        } catch (e) { }
                    }

                    localStorage.removeItem('mdnexa_ref');

                    const session = authData.session;
                    const user = authData.user;

                    if (session) {
                        // Success - Auto Confirmed
                        localStorage.setItem('token', session.access_token);
                        localStorage.setItem('user', JSON.stringify(session.user));

                        if (targetUrl) {
                            // APPEND USER INFO TO STRIPE LINK
                            const userId = session.user.id;
                            const userEmail = session.user.email;
                            const separator = targetUrl.includes('?') ? '&' : '?';
                            const finalUrl = `${targetUrl}${separator}client_reference_id=${userId}&prefilled_email=${encodeURIComponent(userEmail || '')}`;

                            window.location.href = finalUrl;
                            return;
                        }
                        onSuccess();
                    } else if (user) {
                        // User created but no session -> Email confirmation required
                        console.log("User created, waiting for email confirmation.");
                        setSuccessMessage("Account created! Please check your email inbox (and spam) to confirm your account.");

                        // It is possible the user was ALREADY created but unverified, capturing that case here too:
                        if (user.identities && user.identities.length === 0) {
                            // This actually means user existed? No, identities length 0 usually means existing user in some contexts,
                            // but generally Supabase throws error for "User already registered".
                            // If we get here, it's usually a fresh success or a resend trigger logic.
                        }
                    } else {
                        throw new Error("Signup successful but no user returned.");
                    }

                } catch (signupErr: any) {
                    console.error("Signup failed:", signupErr);

                    // Handle "User already registered"
                    if (signupErr.message.includes("User already registered")) {
                        setError("Account already exists. Please log in.");
                        setView('login');
                        // Optionally auto-submit login? No, simpler to just switch view.
                    } else {
                        throw new Error(signupErr.message || "Signup failed");
                    }
                }
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            // Improving error visibility
            let msg = err.message || 'An error occurred during authentication.';

            if (msg.includes("Invalid login credentials")) {
                msg = "Invalid email or password.";
            } else if (msg.includes("Email not confirmed")) {
                msg = "Email not confirmed. Please verify your account.";
                setShowResend(true);
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-white dark:bg-[#0B1120] flex flex-col items-center justify-center p-4">
            {/* Header / Back */}
            <button
                onClick={onBack}
                className="absolute top-6 left-6 p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
            </button>

            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 mx-auto mb-4 text-medical-600">
                        <Logo className="w-full h-full" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        {view === 'login' ? 'Welcome Back' : view === 'signup' ? 'Create Account' : 'Reset Password'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        {view === 'login'
                            ? 'Enter your credentials to access your account'
                            : view === 'signup'
                                ? 'Sign up to start your medical AI journey'
                                : 'Enter your email to receive a reset link'}
                    </p>

                    {/* Startup/Referral Badge */}
                    {view === 'signup' && referralData && (
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium border border-green-200 dark:border-green-800 animate-fade-in-up">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                            </svg>
                            {referralData.category && ['team_referrals', 'family_referrals', 'ambassador_referrals', 'ambassador', 'team', 'family'].includes(referralData.table || referralData.category)
                                ? 'Unlimited Access Unlocked (Free)'
                                : `${referralData.category ? referralData.category + ' ' : ''}Referral Applied: ${referralData.discount_percent}% Off`
                            }
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" target="_self">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-300 text-sm">
                            <p>{error}</p>
                            {showResend && (
                                <button
                                    type="button"
                                    onClick={resendVerification}
                                    className="mt-2 text-xs font-semibold underline hover:text-red-800 dark:hover:text-red-200"
                                >
                                    Resend Verification Email
                                </button>
                            )}
                        </div>
                    )}
                    {successMessage && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-300 text-sm">
                            {successMessage}
                        </div>
                    )}
                    {view === 'signup' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 transition-all text-slate-900 dark:text-white"
                                placeholder="Dr. Jane Doe"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value.trim())}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 transition-all text-slate-900 dark:text-white"
                            placeholder="doctor@hospital.com"
                        />
                    </div>

                    {view === 'signup' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Referral Code (Optional)</label>
                            <input
                                type="text"
                                value={referralCode || ''}
                                onChange={(e) => {
                                    const val = e.target.value.trim();
                                    setReferralCode(val);
                                    if (val.length > 2) {
                                        validateReferral(val);
                                    } else {
                                        setReferralData(null);
                                    }
                                }}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 transition-all text-slate-900 dark:text-white"
                                placeholder="Have a code?"
                            />
                        </div>
                    )}

                    {view !== 'forgot-password' && (
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                                {view === 'login' && (
                                    <button
                                        type="button"
                                        onClick={() => setView('forgot-password')}
                                        className="text-xs font-semibold text-medical-600 dark:text-medical-400 hover:underline"
                                    >
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 transition-all text-slate-900 dark:text-white"
                                placeholder="••••••••"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-medical-600 hover:bg-medical-700 text-white font-bold rounded-xl shadow-lg shadow-medical-600/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </div>
                        ) : (
                            view === 'login' ? 'Log In' : view === 'signup' ? 'Sign Up' : 'Send Reset Link'
                        )}
                    </button>
                </form>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-[#0B1120] text-slate-500">Or continue with</span>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-3">
                        <button
                            type="button"
                            onClick={() => handleSocialLogin('google')}
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-transparent transition-all"
                        >
                            <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                                <path
                                    d="M12.0003 20.45c4.6667 0 7.9167-3.25 7.9167-8.1667 0-.75-.0834-1.25-.1667-1.75H12.0003v3.3333h4.5833C16.2503 15.75 13.917 17.5 12.0003 17.5c-3.1666 0-5.75-2.1666-6.6666-5.25C5.0836 11.25 5.0836 10.1667 5.3336 9.16667c.9167-3.08334 3.5-5.25 6.6667-5.25 1.5833 0 3.0833.58333 4.25 1.58333l2.4167-2.41666C16.8336 1.41667 14.5003.5 12.0003.5 7.08363.5 2.83363 3.5 1.08363 7.75c-.66667 1.5833-1 3.1667-1 4.75 0 1.5833.33333 3.1667 1 4.75 1.75 4.25 6.00001 7.25 10.91667 7.25z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M16.5833 13.8667c0-.75-.0833-1.25-.1666-1.75H12v3.3333h4.5833c-.3333 1.25-1.5 3-4.5833 3v2.8333c5.0833 0 8.0833-3.6666 4.5833-7.4166z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M2.91663 12.5c.25 1 .91666 2.0833 1.08333 2.5l2.4167-1.9167c-.25-.75-.33333-1.5833-.33333-2.5 0-.91666.08333-1.75.33333-2.5l-2.4167-1.83333C1.49996 9.33334 1.16663 10.9167 1.16663 12.5h1.75z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 3.91667c1.5833 0 3.0833.58333 4.25 1.58333l2.4167-2.41666C16.8333 1.41667 14.5.5 12 .5 7.08333.5 2.83333 3.5 1.08333 7.75l2.41667 1.83333c.91667-3.08333 3.5-5.25 6.6667-5.66666h1.8333z"
                                    fill="#EA4335"
                                />
                            </svg>
                            <span className="text-sm font-semibold">Google</span>
                        </button>

                        {/* <button
                            type="button"
                            onClick={() => handleSocialLogin('apple')}
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-transparent transition-all"
                        >
                            <svg className="h-5 w-5 text-slate-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
                            </svg>
                            <span className="text-sm font-semibold">Apple</span>
                        </button> */}
                    </div>
                </div>

                <div className="mt-8 text-center">
                    {view === 'forgot-password' ? (
                        <button
                            onClick={() => { setView('login'); setError(null); setSuccessMessage(null); }}
                            className="text-slate-600 dark:text-slate-400 font-semibold hover:text-medical-600 dark:hover:text-medical-400 transition-colors"
                        >
                            Back to Login
                        </button>
                    ) : (
                        <p className="text-slate-600 dark:text-slate-400">
                            {view === 'login' ? "Don't have an account? " : "Already have an account? "}
                            <button
                                onClick={() => {
                                    setView(view === 'login' ? 'signup' : 'login');
                                    setError(null);
                                    setSuccessMessage(null);
                                }}
                                className="text-medical-600 dark:text-medical-400 font-semibold hover:underline"
                            >
                                {view === 'login' ? 'Sign up' : 'Log in'}
                            </button>
                        </p>
                    )}
                </div>
            </div >
        </div >
    );
};
