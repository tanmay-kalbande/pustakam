import React from 'react';
import NebulaBackground from './NebulaBackground';

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
        <div className="mb-12 text-center">
          <h1 className="mb-2 text-4xl uppercase opacity-90 md:text-6xl">
            <span className="font-sans font-bold tracking-[0.02em] text-[var(--color-text-primary)]">Pustakam</span>
            <span className="font-sans font-bold tracking-[0.02em] text-[var(--color-accent-primary)]">.ai</span>
          </h1>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-text-secondary)] opacity-60 md:text-sm">
            by Tanmay Kalbande
          </p>
        </div>

        <div className="absolute bottom-12 flex flex-col items-center gap-4">
          <div className="animate-pulse-subtle text-xs font-medium uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">
            {message}
          </div>
        </div>
      </div>
    </div>
  );
};
