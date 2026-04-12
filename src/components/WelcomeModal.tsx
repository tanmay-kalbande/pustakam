import React from 'react';
import { X, BookOpen, Sparkles, Download, Check, Cpu } from 'lucide-react';
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
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.5)]">
                {/* Decorative glow */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-48 bg-[var(--brand)]/8 blur-[80px] rounded-full pointer-events-none" />
                
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors z-10 rounded-lg hover:bg-[var(--bg-surface)]">
                    <X size={16} />
                </button>

                <div className="relative p-8 pt-10 text-center">
                    {/* Logo */}
                    <div className="inline-flex mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-[var(--brand)]/15 blur-2xl rounded-full scale-150" />
                            <div className="relative w-14 h-14 bg-[var(--bg-surface)] rounded-2xl flex items-center justify-center border border-[var(--border-subtle)] shadow-lg">
                                <img src="/white-logo.png" alt="Pustakam" className="w-7 h-7" />
                            </div>
                        </div>
                    </div>

                    {/* Greeting */}
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
                        Welcome, {firstName} ✦
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mb-8 leading-relaxed max-w-xs mx-auto">
                        Your account is ready. Start generating structured learning books from any topic.
                    </p>

                    {/* Feature pills */}
                    <div className="grid grid-cols-3 gap-2 mb-8">
                        {[
                            { icon: Cpu, label: '13+ AI Models', sub: 'Multi-provider' },
                            { icon: Sparkles, label: 'Free Tier', sub: 'No key needed' },
                            { icon: Download, label: 'PDF Export', sub: 'Full books' },
                        ].map(({ icon: Icon, label, sub }) => (
                            <div key={label} className="group p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl transition-all hover:border-[var(--brand)]/20 hover:bg-[var(--brand)]/5">
                                <Icon size={16} className="text-[var(--brand)] mx-auto mb-2 opacity-70 group-hover:opacity-100 transition-opacity" />
                                <span className="text-[11px] font-bold text-[var(--text-primary)] block leading-tight">{label}</span>
                                <span className="text-[9px] text-[var(--text-muted)] block mt-0.5">{sub}</span>
                            </div>
                        ))}
                    </div>

                    {/* How it works - compact */}
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 mb-8 text-left">
                        <p className="text-[9px] font-bold text-[var(--brand)] uppercase tracking-[0.2em] mb-3">Quick Start</p>
                        <div className="space-y-2.5">
                            {[
                                'Type any topic or learning goal',
                                'Generate a structured roadmap',
                                'Build chapter-by-chapter content',
                            ].map((step, idx) => (
                                <div key={step} className="flex items-center gap-2.5">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] text-[10px] font-bold flex items-center justify-center">
                                        {idx + 1}
                                    </span>
                                    <span className="text-xs text-[var(--text-secondary)]">{step}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA */}
                    <button
                        onClick={onClose}
                        className="btn btn-primary w-full py-3.5 rounded-xl uppercase tracking-widest text-xs font-bold"
                    >
                        <Check size={16} strokeWidth={3} />
                        <span>Start Building</span>
                    </button>

                    <p className="text-[var(--text-muted)] text-[10px] mt-5 font-medium">
                        Free books included • Bring your own API key for unlimited use
                    </p>
                </div>
            </div>
        </div>
    );
}

export default WelcomeModal;
