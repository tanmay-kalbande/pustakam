import React from 'react';
import { X, BookOpen, Zap, Download, Check, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
    const { profile } = useAuth();
    if (!isOpen) return null;

    const firstName = profile?.full_name?.split(' ')[0] || 'Creator';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-[var(--bg-elevated)] backdrop-blur-2xl border border-[var(--border-default)] rounded-lg shadow-2xl overflow-hidden">
                <button onClick={onClose} className="absolute top-5 right-5 p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors z-10 rounded-md hover:bg-[var(--bg-surface)]">
                    <X size={18} />
                </button>

                <div className="relative p-8 text-center pt-10">
                    <div className="inline-flex mb-8">
                        <div className="relative">
                            <div className="absolute inset-0 bg-[var(--brand)]/10 blur-xl rounded-full" />
                            <div className="relative w-16 h-16 bg-[var(--bg-surface)] rounded-xl flex items-center justify-center border border-[var(--border-subtle)] shadow-lg">
                                <img src="/white-logo.png" alt="Pustakam" className="w-8 h-8" />
                            </div>
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
                        Welcome, {firstName}.
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm mb-10 leading-relaxed">
                        Ready to generate your first book? Z AI is the default, and Fast Mistral is there when you want quicker runs.
                    </p>

                    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-5 mb-8 text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand)]/5 blur-3xl -mr-16 -mt-16" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <Crown size={14} className="text-[var(--brand)]" />
                                <span className="text-[var(--brand)] font-bold uppercase tracking-[0.2em] text-[10px]">Free Access</span>
                            </div>
                            <p className="text-[var(--text-primary)] text-lg font-bold mb-1 tracking-tight">
                                Z AI Default
                            </p>
                            <p className="text-[var(--text-muted)] text-xs">Fast Mistral is available in the provider switcher</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-8">
                        {[
                            { icon: BookOpen, label: 'Full Books' },
                            { icon: Zap, label: 'Fast Mistral' },
                            { icon: Download, label: 'PDF Export' },
                        ].map(({ icon: Icon, label }) => (
                            <div key={label} className="p-4 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg transition-colors hover:bg-[var(--bg-surface)]">
                                <Icon size={16} className="text-[var(--text-secondary)] mx-auto mb-2" />
                                <span className="text-[11px] font-semibold text-[var(--text-muted)]">{label}</span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        className="btn btn-primary w-full py-4 uppercase tracking-widest text-xs font-bold"
                    >
                        <Check size={16} strokeWidth={3} />
                        <span>Start Building</span>
                    </button>

                    <p className="text-[var(--text-muted)] text-[10px] mt-6 font-medium">
                        Free to use. Up to 15 books per day. Resets at midnight UTC.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default WelcomeModal;
