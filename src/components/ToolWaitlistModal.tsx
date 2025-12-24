import React, { useState } from 'react';
import { apiRequest } from '../services/api';

interface ToolWaitlistModalProps {
    isOpen: boolean;
    onClose: () => void;
    toolName: string;
    userEmail?: string;
    userId?: string;
}

export const ToolWaitlistModal: React.FC<ToolWaitlistModalProps> = ({ isOpen, onClose, toolName, userEmail, userId }) => {
    const [email, setEmail] = useState(userEmail || '');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');

        try {
            const result = await apiRequest('/tools/waitlist', 'POST', {
                email,
                tool_name: toolName,
                user_id: userId
            });

            if (result.success) {
                setStatus('success');
                setMessage(result.message);
                setTimeout(onClose, 2000);
            } else {
                setStatus('error');
                setMessage(result.error || 'Failed to join waitlist.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Network error. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 relative overflow-hidden">

                {/* Lock Icon Background */}
                <div className="absolute -top-6 -right-6 text-slate-100 dark:text-slate-700/30 transform rotate-12">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-32 h-32">
                        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                    </svg>
                </div>

                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 relative z-10 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-500">
                        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                    </svg>
                    {toolName} Locked
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 relative z-10">
                    This advanced tool is currently in closed beta. Join the waitlist to get early access.
                </p>

                {status === 'success' ? (
                    <div className="text-center py-4 text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 rounded-lg">
                        {message}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="relative z-10">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="doctor@hospital.com"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all dark:text-white mb-4"
                        />

                        {status === 'error' && (
                            <p className="text-xs text-red-500 mb-3">{message}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-white text-white dark:text-slate-900 font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {status === 'loading' ? (
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                ) : 'Join Waitlist'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
