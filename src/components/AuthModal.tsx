// src/components/AuthModal.tsx
// Authentication modal with dark minimal design matching landing page

import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Loader2, ArrowRight, Eye, EyeOff, MessageCircle, Send, Briefcase, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialMode?: 'signin' | 'signup' | 'subscribe';
}

type AuthMode = 'signin' | 'signup' | 'subscribe';

export function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'signin' }: AuthModalProps) {
    const { signIn, signUp, isSupabaseEnabled, user } = useAuth();
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showContactOptions, setShowContactOptions] = useState(false);
    const [profession, setProfession] = useState('');
    const [learningInterest, setLearningInterest] = useState('');

    // Reset mode when modal opens
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setError(null);
            // If user is logged in and mode is subscribe, show contact options directly
            if (user && initialMode === 'subscribe') {
                setShowContactOptions(true);
            } else {
                setShowContactOptions(false);
            }
        }
    }, [isOpen, initialMode, user]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (mode === 'signin' || mode === 'subscribe') {
                const { error } = await signIn(email, password);
                if (error) {
                    setError(error.message);
                } else {
                    if (mode === 'subscribe') {
                        // Show contact options after successful login for subscription
                        setShowContactOptions(true);
                    } else {
                        onSuccess?.();
                        onClose();
                    }
                }
            } else {
                const { error } = await signUp(email, password, fullName, profession, learningInterest);
                if (error) {
                    setError(error.message);
                } else {
                    onSuccess?.();
                    onClose();
                }
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setMode(mode === 'signin' ? 'signup' : 'signin');
        setError(null);
    };

    const handleWhatsApp = () => {
        const message = encodeURIComponent('Hi! I want to subscribe to Pustakam premium plan.');
        window.open(`https://wa.me/${config.contact.whatsappNumber}?text=${message}`, '_blank');
        onClose();
    };

    const handleEmail = () => {
        const subject = encodeURIComponent('Pustakam Premium Subscription');
        const body = encodeURIComponent('Hi,\n\nI want to subscribe to Pustakam premium plan.\n\nThanks!');
        window.open(`mailto:${config.contact.supportEmail}?subject=${subject}&body=${body}`, '_blank');
        onClose();
    };

    // Show contact options after login for subscription
    if (showContactOptions) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                <div className="relative w-full max-w-sm bg-[var(--bg-elevated)] backdrop-blur-2xl border border-[var(--border-default)] rounded-lg shadow-2xl overflow-hidden">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors z-10">
                        <X size={18} />
                    </button>

                    <div className="relative p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-5 bg-[var(--brand)]/10 rounded-xl flex items-center justify-center border border-[var(--brand)]/20">
                            <img src="/white-logo.png" alt="Pustakam" className="w-10 h-10" />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Subscribe to Premium</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-8">Choose how you'd like to contact us</p>

                        <div className="space-y-3">
                            <button
                                onClick={handleWhatsApp}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md flex items-center justify-center gap-3 transition-colors shadow-lg shadow-emerald-900/20"
                            >
                                <MessageCircle size={20} />
                                <span>WhatsApp</span>
                            </button>
                            <button
                                onClick={handleEmail}
                                className="btn btn-secondary w-full py-3.5 flex items-center justify-center gap-3"
                            >
                                <Send size={20} />
                                <span>Email Us</span>
                            </button>
                        </div>

                        <p className="text-xs text-[var(--text-muted)] mt-6">We'll respond within 24 hours</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal - wider for signup */}
            <div className={`relative w-full ${mode === 'signup' ? 'max-w-md' : 'max-w-sm'} bg-[var(--bg-elevated)] backdrop-blur-2xl border border-[var(--border-default)] rounded-lg shadow-2xl overflow-hidden`}>


                {/* Close button */}
                <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors z-10">
                    <X size={16} />
                </button>

                {/* Header - Compact */}
                <div className="relative px-6 pt-6 pb-4 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-[var(--brand)]/10 rounded-xl flex items-center justify-center border border-[var(--brand)]/20">
                        <img src="/white-logo.png" alt="Pustakam" className="w-7 h-7" />
                    </div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        {mode === 'subscribe' ? 'Sign In to Subscribe' : mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                        {mode === 'subscribe'
                            ? 'Sign in to continue with subscription'
                            : mode === 'signin'
                                ? 'Sign in to continue to Pustakam'
                                : 'Join Pustakam and start learning'
                        }
                    </p>
                </div>

                {/* Form - Compact */}
                <form onSubmit={handleSubmit} className="relative px-6 pb-6 space-y-3">
                    {!isSupabaseEnabled && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                            <p className="text-amber-400 text-xs text-center">⚠️ Auth not configured</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-red-400 text-xs text-center">{error}</p>
                        </div>
                    )}

                    {mode === 'signup' && (
                        <>
                            <div>
                                <label className="block text-[10px] text-[var(--text-muted)] mb-1.5 font-bold uppercase tracking-wider">Full Name</label>
                                <div className="relative">
                                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Your name"
                                        required
                                        className="w-full pl-10 pr-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--brand)]/50 transition-colors"
                                    />
                                </div>
                            </div>
 
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] text-[var(--text-muted)] mb-1.5 font-bold uppercase tracking-wider">Profession</label>
                                    <div className="relative">
                                        <Briefcase size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                        <select
                                            value={profession}
                                            onChange={(e) => setProfession(e.target.value)}
                                            required
                                            className="w-full pl-10 pr-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-md text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]/50 transition-colors appearance-none cursor-pointer"
                                        >
                                            <option value="" disabled className="bg-[var(--bg-elevated)]">Select Role</option>
                                            <option value="student" className="bg-[var(--bg-elevated)]">Student</option>
                                            <option value="developer" className="bg-[var(--bg-elevated)]">Developer / Engineer</option>
                                            <option value="educator" className="bg-[var(--bg-elevated)]">Educator / Teacher</option>
                                            <option value="designer" className="bg-[var(--bg-elevated)]">Designer</option>
                                            <option value="pm" className="bg-[var(--bg-elevated)]">Product Manager</option>
                                            <option value="creator" className="bg-[var(--bg-elevated)]">Content Creator / Writer</option>
                                            <option value="researcher" className="bg-[var(--bg-elevated)]">Researcher / Scientist</option>
                                            <option value="business" className="bg-[var(--bg-elevated)]">Business / Founder</option>
                                            <option value="other" className="bg-[var(--bg-elevated)]">Other</option>
                                        </select>
                                    </div>
                                </div>
 
                                <div>
                                    <label className="block text-[10px] text-[var(--text-muted)] mb-1.5 font-bold uppercase tracking-wider">Interest</label>
                                    <div className="relative">
                                        <BookOpen size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                        <input
                                            type="text"
                                            value={learningInterest}
                                            onChange={(e) => setLearningInterest(e.target.value)}
                                            placeholder="e.g. AI, Web Dev"
                                            className="w-full pl-10 pr-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--brand)]/50 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                     <div>
                        <label className="block text-[10px] text-[var(--text-muted)] mb-1.5 font-bold uppercase tracking-wider">Email</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full pl-11 pr-4 py-3 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--brand)]/50 transition-colors"
                            />
                        </div>
                    </div>
 
                    <div>
                        <label className="block text-[10px] text-[var(--text-muted)] mb-1.5 font-bold uppercase tracking-wider">Password</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                className="w-full pl-11 pr-11 py-3 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--brand)]/50 transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
 
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn btn-primary w-full py-3.5 flex items-center justify-center gap-2 group mt-2"
                    >
                        {isLoading ? (
                            <><Loader2 size={18} className="animate-spin" /><span>Please wait...</span></>
                        ) : (
                            <><span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span><ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" /></>
                        )}
                    </button>
 
                    {mode !== 'subscribe' && (
                        <div className="text-center pt-2">
                            <button type="button" onClick={toggleMode} className="text-sm text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors">
                                {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

export default AuthModal;
