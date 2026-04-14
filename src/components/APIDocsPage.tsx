import React from 'react';
import { ArrowLeft, ExternalLink, KeyRound, Lock, Network, Shield, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface APIDocsPageProps {
  onClose: () => void;
}

const safetyCards = [
  {
    icon: Lock,
    title: 'Your API keys stay local',
    body: 'Bring-your-own keys are stored in this browser only. They are used directly from your device when a provider supports BYOK.',
  },
  {
    icon: Network,
    title: 'Shared quota uses the proxy path',
    body: 'If you use the shared free path, requests go through the app-managed provider route instead of using your own key.',
  },
  {
    icon: Trash2,
    title: 'You stay in control',
    body: 'You can remove saved keys anytime from Workspace Settings. Clearing browser storage also removes locally stored keys.',
  },
];

const flowSteps = [
  {
    title: 'Choose a provider',
    body: 'Pick the provider and model from the top bar or inside settings before starting a roadmap or chapter run.',
  },
  {
    title: 'Start with a roadmap',
    body: 'The workspace generates the roadmap first, then uses that structure to write chapters and assemble the final book.',
  },
  {
    title: 'Review outputs locally',
    body: 'Roadmaps, chapters, final books, and reader state stay in your local workspace so you can reopen drafts quickly.',
  },
];

const providerNotes = [
  'Use proxy/free quota when you want the fastest setup.',
  'Use your own API key when you want direct billing and full provider control.',
  'Switch models between runs if you want a different tone, speed, or reasoning style.',
];

const APIDocsPage: React.FC<APIDocsPageProps> = ({ onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-black/70 p-3 backdrop-blur-md md:p-6"
    >
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 px-5 py-4 backdrop-blur-xl md:px-7">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-base)]/40 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Back to workspace
          </button>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Internal Docs</div>
            <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">API, keys, and request flow</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 py-6 md:px-7 md:py-8">
          <div className="mx-auto max-w-5xl">
            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_320px]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">API Docs</p>
                <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-[-0.05em] text-[var(--text-primary)] md:text-6xl md:leading-[1.02]">
                  Clear provider controls. Safer key handling. Less guesswork.
                </h1>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] md:text-[15px]">
                  This workspace supports both shared proxy usage and bring-your-own-key providers. The important part is simple:
                  your saved BYOK keys stay on this device, and you can remove them anytime from settings.
                </p>
              </div>

              <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-base)]/40">
                    <Shield className="h-5 w-5 text-[var(--brand)]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Key Safety</div>
                    <div className="mt-1 text-base font-semibold text-[var(--text-primary)]">What to tell users</div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                  Pustakam does not need to expose the user's BYOK key in the UI beyond local settings. For supported providers, the browser sends the request directly with the locally stored key.
                </p>
              </div>
            </section>

            <section className="mt-8 grid gap-4 md:grid-cols-3">
              {safetyCards.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-base)]/40">
                    <Icon className="h-4 w-4 text-[var(--brand)]" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{title}</h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{body}</p>
                </div>
              ))}
            </section>

            <section className="mt-10 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-6 md:px-7">
              <div className="flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-[var(--brand)]" />
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">How requests move through the app</h2>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {flowSteps.map((step, index) => (
                  <div key={step.title} className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-base)]/30 px-4 py-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Step {index + 1}</div>
                    <h3 className="mt-2 text-base font-semibold text-[var(--text-primary)]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{step.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-6 md:px-7">
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">Provider guidance</h2>
                <div className="mt-5 space-y-3">
                  {providerNotes.map((note) => (
                    <div key={note} className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-base)]/25 px-4 py-3 text-sm leading-7 text-[var(--text-secondary)]">
                      {note}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-6">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Quick Check</div>
                <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">Best practice for users</h2>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                  <li>Tell users to keep sensitive keys in Workspace Settings only.</li>
                  <li>Explain clearly whether a run is using shared quota or BYOK.</li>
                  <li>Encourage users to delete unused keys from the same device when finished.</li>
                </ul>
                <a
                  href="https://supabase.com/docs/guides/auth"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--brand)] transition-colors hover:text-[var(--brand-hover)]"
                >
                  External auth reference
                  <ExternalLink size={14} />
                </a>
              </div>
            </section>
          </div>
        </main>
      </div>
    </motion.div>
  );
};

export default APIDocsPage;
