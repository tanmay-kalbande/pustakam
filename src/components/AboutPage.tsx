import React from 'react';
import { X, ArrowLeft } from 'lucide-react';

interface AboutPageProps {
    onClose: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-base)] overflow-auto">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-[var(--bg-base)]/90 backdrop-blur-xl border-b border-[var(--border-subtle)] px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <ArrowLeft size={18} />
                        <span className="text-sm">Back</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="mb-12">
                    <span className="text-[11px] font-mono tracking-[0.3em] uppercase text-[var(--brand)] mb-4 block">Company</span>
                    <h1 role="heading" aria-level={1} className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-6">About Pustakam</h1>
                    <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
                        Built because the right tutorial never existed for what you needed right now.
                    </p>
                </div>

                <div className="space-y-12 text-[var(--text-secondary)]">
                    <section>
                        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">Our Mission</h2>
                        <p className="leading-relaxed mb-4 text-[var(--text-secondary)]">
                            I built Pustakam because I watched people spend three hours finding the right tutorial 
                            before they could start building. That's three hours you're not building.
                        </p>
                        <p className="leading-relaxed mb-4 text-[var(--text-secondary)]">
                            There's no "right resource at the right depth" online for most topics. Every tutorial 
                            is either too shallow or assumes you already know the prerequisites. Pustakam generates 
                            the specific manual you actually need, on demand.
                        </p>
                        <p className="leading-relaxed mb-4 text-[var(--brand)] font-medium">
                            Stop searching. Start building.
                        </p>
                        <p className="leading-relaxed text-[var(--text-secondary)]">
                            Whether you're a student, a professional upskilling, or just curious — Pustakam turns 
                            your learning goal into a complete, structured book in about 20 minutes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">How It Works</h2>
                        <div className="space-y-4">
                            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">1. Describe Your Topic</h3>
                                <p className="text-[var(--text-secondary)]">Simply tell us what you want to learn. From programming languages to philosophy, from cooking to quantum physics — any topic works.</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">2. GLM-5 Generates Content</h3>
                                <p className="text-[var(--text-secondary)]">We use GLM-5 to lay out a structured curriculum and stream module content directly. A 30,000-word book takes about 20 minutes.</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">3. Read or Download</h3>
                                <p className="text-[var(--text-secondary)]">Read in the response view or grab the final book PDF. No generalized courses—just the specific documentation you requested.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">Our Vision</h2>
                        <p className="leading-relaxed text-[var(--text-secondary)]">
                            To replace "tutorial hell" with custom-built documentation. We want to collapse the gap 
                            between having a question and possessing the structured manual to answer it.
                        </p>
                        <p className="text-sm font-medium text-[var(--brand)] mt-2">
                            Stop searching. Start building.
                        </p>
                    </section>

                    <section className="pt-8 border-t border-[var(--border-subtle)]">
                        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">Contact Us</h2>
                        <p className="leading-relaxed mb-4 text-[var(--text-secondary)]">
                            Have questions, feedback, or just want to say hello? We'd love to hear from you.
                        </p>
                        <a
                            href="mailto:hello@tanmaysk.in"
                            className="btn btn-primary px-6 py-3"
                        >
                            Get in Touch
                        </a>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default AboutPage;
