import React from 'react';
import NebulaBackground from './NebulaBackground';

interface LoadingScreenProps {
  theme?: 'light' | 'dark';
  message?: string;
  isExiting?: boolean;
  ownerName?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  theme = 'dark',
  message = 'Firing up the engine...',
  isExiting = false,
  ownerName = 'Tanmay Kalbande',
}) => {
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[var(--color-bg)] font-sans transition-all duration-700 ease-in-out ${
        isExiting ? 'pointer-events-none scale-105 opacity-0' : 'scale-100 opacity-100'
      }`}
    >
      {theme === 'dark' ? (
        <NebulaBackground opacity={1} />
      ) : (
        <div className="sun-background absolute inset-0 opacity-50" />
      )}

      <div className="relative z-10 flex h-full flex-col items-center justify-center pb-10">
        <div className="mb-10 flex flex-col items-center text-center">
          {theme === 'light' && (
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
              <img src="/black-logo.png" alt="Pustakam" className="h-8 w-8 opacity-90" />
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-[var(--color-text-primary)] md:text-5xl">
            Pustakam
          </h1>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.26em] text-[var(--color-text-secondary)] opacity-60 md:text-xs">
            {ownerName}
          </p>
        </div>

        <div className="absolute bottom-12 flex flex-col items-center gap-4">
          <div className="grok-loader">
            {Array.from({ length: 9 }).map((_, index) => <div key={index} className="dot" />)}
          </div>
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-60">
            {message}
          </div>
        </div>
      </div>
    </div>
  );
};
