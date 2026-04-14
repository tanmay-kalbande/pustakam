import React from 'react';

export const MobileBlockScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] font-sans px-6 text-center">
      <div className="relative z-10 flex h-full flex-col items-center justify-center max-w-md mx-auto">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] backdrop-blur-md shadow-lg">
            <img 
              src="/black-logo.png" 
              alt="Pustakam" 
              className="h-10 w-10 opacity-90 dark:invert transition-all" 
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-4">
            Desktop Experience
          </h1>
          <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
            We're currently optimizing Pustakam for mobile devices. For the best experience building and exploring AI-generated books, please open this app on your desktop.
          </p>
        </div>

        <div className="absolute bottom-12 flex flex-col items-center gap-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60">
            Available on Desktop
          </div>
        </div>
      </div>
    </div>
  );
};
