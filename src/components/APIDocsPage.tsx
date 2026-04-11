import React from 'react';
import { ArrowLeft, Shield, AlertTriangle, Lock, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface APIDocsPageProps {
    onClose: () => void;
}

const APIDocsPage: React.FC<APIDocsPageProps> = ({ onClose }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[var(--bg-base)] overflow-auto font-sans"
        >
            {/* Header */}
            <header className="sticky top-0 z-[60] bg-[var(--bg-base)]/80 backdrop-blur-2xl border-b border-[var(--border-subtle)] px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-300 group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Exit Docs</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">v2.7.0</span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-5xl mx-auto px-6 py-16 md:py-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-20 text-center md:text-left"
                >
                    <span className="text-[11px] font-mono tracking-[0.4em] uppercase text-emerald-500 mb-6 block font-bold">The Intelligence Protocol</span>
                    <h1 className="text-5xl md:text-7xl font-bold text-[var(--text-primary)] mb-8 tracking-tighter leading-none">
                        API <span className="text-[var(--brand)]">Documentation</span>
                    </h1>
                    <p className="text-[var(--text-secondary)] text-xl leading-relaxed max-w-2xl mx-auto md:mx-0">
                        A developer's guide to AI providers, token utilization, and the Zero-Middleman security architecture.
                    </p>
                </motion.div>

                <div className="space-y-24">
                    {/* Section 1: API Security & Assurance (MOVED TO TOP) */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="space-y-8"
                    >
                        <div className="flex items-center gap-4 text-[var(--text-primary)]">
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] uppercase">Zero-Middleman Protocol</h2>
                                <p className="text-[var(--text-muted)] text-sm">Pure client-side autonomy</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="p-10 rounded-[2.5rem] bg-[var(--brand)]/[0.03] border border-[var(--brand)]/20 relative overflow-hidden group">
                                <Lock className="absolute -bottom-6 -right-6 text-[var(--brand)]/10 group-hover:text-[var(--brand)]/20 transition-all duration-500" size={140} />
                                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6 relative z-10">Client-Side Vault</h3>
                                <p className="text-[var(--text-secondary)] text-base leading-relaxed mb-8 relative z-10">
                                    Pustakam operates as a <strong>standalone entity</strong>. Your cryptographic keys never touch external servers because we function entirely within your browser environment.
                                </p>
                                <ul className="space-y-5 relative z-10">
                                    <li className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] mt-2 shrink-0 shadow-[0_0_8px_var(--brand-glow)]" />
                                        <span><strong>Direct Tunneling:</strong> Peer-to-peer browser-to-API communication.</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] mt-2 shrink-0 shadow-[0_0_8px_var(--brand-glow)]" />
                                        <span><strong>Local Persistence:</strong> Keys stored in local encrypted memory only.</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] mt-2 shrink-0 shadow-[0_0_8px_var(--brand-glow)]" />
                                        <span><strong>Full Purge:</strong> Instant wipe capability for all stored intelligence.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="flex flex-col gap-6">
                                <div className="p-8 rounded-[2rem] bg-[var(--bg-surface)]/50 border border-[var(--border-subtle)] hover:border-[var(--brand)]/20 transition-all duration-500 group">
                                    <h4 className="text-xs font-bold text-[var(--brand)] uppercase tracking-[0.2em] mb-4">Traffic Transparency</h4>
                                    <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                                        Monitor the <strong>Network Stack (F12)</strong> during generation. You'll observe outbound traffic reaching only official endpoints like <code>api.z.ai</code> (Zhipu GLM).
                                    </p>
                                </div>
                                <div className="p-8 rounded-[2rem] bg-[var(--bg-surface)]/50 border border-[var(--border-subtle)] hover:border-[var(--brand)]/20 transition-all duration-500 group">
                                    <h4 className="text-xs font-bold text-[var(--brand)] uppercase tracking-[0.2em] mb-4">Privacy Immutable</h4>
                                    <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                                        <strong>End-to-End Privacy:</strong> Your creative output remains 100% local. We use anonymized analytics for performance, and encrypted account records for profile persistence—never at the cost of your intellectual privacy.
                                    </p>
                                </div>
                                <div className="mt-auto p-4 rounded-2xl bg-[var(--brand)]/5 border border-[var(--brand)]/10">
                                    <p className="text-[11px] text-[var(--brand)]/60 font-mono text-center italic tracking-wider">
                                        "Architecture is the strongest form of security."
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    {/* Token Estimation Note */}
                    <motion.section
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="p-10 rounded-[2.5rem] bg-blue-500/[0.03] border border-blue-500/20"
                    >
                        <h3 className="text-blue-400 text-xl font-bold mb-6">
                            Token Economics
                        </h3>
                        <p className="text-[var(--text-secondary)] text-base leading-relaxed mb-8">
                            For a <strong className="text-[var(--text-primary)]">30,000-word volume</strong>, context builds progressively.
                            Each module incorporates preceding knowledge, resulting in <strong className="text-blue-400 italic">progressive context stacking</strong>:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                            <div className="p-6 rounded-2xl bg-[var(--bg-surface)]/50 border border-[var(--border-subtle)]">
                                <p className="text-[var(--text-muted)] font-mono uppercase tracking-widest text-[10px] mb-2">Output Ceiling</p>
                                <p className="text-[var(--text-primary)] font-bold text-3xl mb-1">~40,000</p>
                                <p className="text-[var(--text-muted)] text-xs">Generated tokens for core content</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-[var(--bg-surface)]/50 border border-[var(--border-subtle)]">
                                <p className="text-blue-400/40 font-mono uppercase tracking-widest text-[10px] mb-2">Input Cumulative</p>
                                <p className="text-blue-400 font-bold text-3xl mb-1">~200,000</p>
                                <p className="text-[var(--text-muted)] text-xs">Full stack context across 10 modules</p>
                            </div>
                        </div>
                    </motion.section>

                    {/* Providers & Use Cases sections follow with same styling... */}

                    <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
                        Pustakam runs on Zhipu GLM models via a secure server-side proxy. No API key setup is required — just sign in and start generating.
                    </p>

                    {/* Section 4: Model Strategy */}
                    <section className="space-y-10">
                        <div className="flex items-center gap-4 text-[var(--text-primary)]">
                            <h2 className="text-3xl font-bold tracking-tight uppercase">Intelligence Strategy</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-8 rounded-xl bg-[var(--bg-surface)]/50 border border-[var(--border-subtle)] hover:border-blue-500/20 transition-all">
                                <h4 className="text-xs font-bold text-blue-400 uppercase mb-4 tracking-widest">Fiction & Narrative</h4>
                                <p className="text-[14px] text-[var(--text-muted)] leading-relaxed">
                                    Prioritize <strong>GLM-4.7</strong> or <strong>Mistral Large</strong> for deep world-building and characteristic dialogue flow.
                                </p>
                            </div>
                            <div className="p-8 rounded-xl bg-[var(--bg-surface)]/50 border border-[var(--border-subtle)] hover:border-emerald-500/20 transition-all">
                                <h4 className="text-xs font-bold text-emerald-400 uppercase mb-4 tracking-widest">Technical & Deep Logic</h4>
                                <p className="text-[14px] text-[var(--text-muted)] leading-relaxed">
                                    Deploy <strong>Gemma 3 27B</strong> or <strong>GPT-120B</strong> for rigorous structural accuracy and system architecture.
                                </p>
                            </div>
                            <div className="p-8 rounded-xl bg-[var(--bg-surface)]/50 border border-[var(--border-subtle)] hover:border-cyan-500/20 transition-all">
                                <h4 className="text-xs font-bold text-cyan-400 uppercase mb-4 tracking-widest">Multilingual King</h4>
                                <p className="text-[14px] text-[var(--text-muted)] leading-relaxed">
                                    Use <strong>Qwen-3-235B</strong> for the absolute peak of Marathi, Hindi, and regional dialect reasoning.
                                </p>
                            </div>
                            <div className="p-8 rounded-xl bg-[var(--bg-surface)]/50 border border-[var(--border-subtle)] hover:border-purple-500/20 transition-all">
                                <h4 className="text-xs font-bold text-purple-400 uppercase mb-4 tracking-widest">Structured Pedagogy</h4>
                                <p className="text-[14px] text-[var(--text-muted)] leading-relaxed">
                                    Select <strong>Gemini 2.0</strong> or <strong>Llama 3.3</strong> for high-fidelity educational frameworks and logic.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="pt-12 border-t border-[var(--border-subtle)] text-center">
                        <p className="text-[var(--text-muted)] text-xs font-mono tracking-widest uppercase">
                            Built by Tanmay Kalbande · hello@tanmaysk.in
                        </p>
                    </section>
                </div>
            </main>
        </motion.div>
    );
};

export default APIDocsPage;
