import React, { useState, useEffect } from 'react';
import { X, BookOpen, Sparkles, Download, Check, Cpu, MonitorSmartphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
    const { profile } = useAuth();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile(); // Check on mount
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

                <div className="relative p-6 pt-8 text-center max-h-[85vh] overflow-y-auto custom-scrollbar">
                    {/* Logo */}
                    <div className="inline-flex mb-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-[var(--brand)]/15 blur-xl rounded-full scale-125" />
                            <div className="relative w-10 h-10 bg-[var(--bg-surface)] rounded-xl flex items-center justify-center border border-[var(--border-subtle)] shadow-md">
                                <img src="/white-logo.png" alt="Pustakam" className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    {/* Greeting */}
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
                        Welcome, {firstName} ✦
                    </h1>
                    <p className="text-[var(--text-muted)] text-xs md:text-sm mb-6 leading-relaxed max-w-xs mx-auto">
                        Your account is ready. Start generating structured learning books from any topic.
                    </p>

                    {/* Feature pills */}
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        {[
                            { icon: Cpu, label: '13+ Models', sub: 'Multi-provider' },
                            { icon: Sparkles, label: 'Free Tier', sub: 'Included' },
                            { icon: Download, label: 'PDF Export', sub: 'Full books' },
                        ].map(({ icon: Icon, label, sub }) => (
                            <div key={label} className="group p-2.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg transition-all hover:border-[var(--brand)]/20 hover:bg-[var(--brand)]/5 flex flex-col items-center justify-center">
                                <Icon size={14} className="text-[var(--brand)] mb-1.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                                <span className="text-[10px] md:text-[11px] font-bold text-[var(--text-primary)] leading-tight text-center">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Mobile Desktop Recommendation */}
                    {isMobile && (
                        <div className="bg-[var(--brand)]/10 border border-[var(--brand)]/30 text-[var(--brand)] rounded-lg p-3.5 mb-6 text-left flex items-start gap-3">
                            <MonitorSmartphone size={18} className="mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold uppercase tracking-wider">Optimal Experience</p>
                                <p className="text-[10px] md:text-[11px] opacity-90 leading-relaxed">
                                    Pustakam AI features an advanced split-pane workspace. For the best reading and building experience, we recommend using a desktop browser.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* How it works - compact */}
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-3.5 mb-6 text-left">
                        <p className="text-[8px] md:text-[9px] font-bold text-[var(--brand)] uppercase tracking-[0.2em] mb-2.5">Quick Start</p>
                        <div className="space-y-2">
                            {[
                                'Type any topic or learning goal',
                                'Generate a structured roadmap',
                                'Build chapter-by-chapter content',
                            ].map((step, idx) => (
                                <div key={step} className="flex items-center gap-2">
                                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] text-[8px] font-bold flex items-center justify-center">
                                        {idx + 1}
                                    </span>
                                    <span className="text-[11px] md:text-xs text-[var(--text-secondary)] leading-none">{step}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA */}
                    <button
                        onClick={onClose}
                        className="btn btn-primary w-full py-3 rounded-lg uppercase tracking-widest text-[11px] font-bold"
                    >
                        <Check size={14} strokeWidth={3} />
                        <span>Start Building</span>
                    </button>

                    <p className="text-[var(--text-muted)] text-[9px] mt-4 font-medium opacity-80">
                        Free books included • Bring your own API key for unlimited use
                    </p>
                </div>
            </div>
        </div>
    );
}

export default WelcomeModal;
