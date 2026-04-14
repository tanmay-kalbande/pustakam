import React from 'react';

interface LoadingScreenProps {
  theme?: 'light' | 'dark';
  message?: string;
  isExiting?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  theme = 'dark',
  message = 'Firing up the engine...',
  isExiting = false,
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      className={`fixed inset-0 z-[100] overflow-hidden transition-all duration-300 ease-out ${
        isExiting ? 'pointer-events-none opacity-0 scale-[1.01]' : 'opacity-100 scale-100'
      }`}
    >
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? 'radial-gradient(circle at 20% 20%, rgba(254, 205, 140, 0.14), transparent 32%), radial-gradient(circle at 80% 18%, rgba(255, 255, 255, 0.08), transparent 24%), radial-gradient(circle at 50% 100%, rgba(254, 205, 140, 0.12), transparent 38%), linear-gradient(180deg, #040404 0%, #090909 100%)'
            : 'radial-gradient(circle at 18% 18%, rgba(234, 179, 8, 0.16), transparent 28%), radial-gradient(circle at 80% 12%, rgba(255, 255, 255, 0.7), transparent 26%), linear-gradient(180deg, #faf7ef 0%, #f4efe5 100%)',
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_40%,rgba(254,205,140,0.04))]" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/5 shadow-[0_18px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border border-[var(--brand)]/30" />
            <div className="absolute inset-[6px] rounded-full bg-[var(--brand)]/20 animate-pulse-subtle" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className={`text-4xl font-bold tracking-tight md:text-5xl ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            Pustakam<span className="text-[var(--brand)]">.ai</span>
          </h1>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.32em] ${isDark ? 'text-white/35' : 'text-neutral-600/80'}`}>
            Readying your workspace
          </p>
        </div>

        <div className="mt-8 w-full max-w-[220px]">
          <div className={`h-1.5 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
            <div className="h-full w-full animate-slide-in-out rounded-full bg-[var(--brand)]" />
          </div>
          <p className={`mt-4 text-xs font-medium ${isDark ? 'text-white/50' : 'text-neutral-700/70'}`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};
