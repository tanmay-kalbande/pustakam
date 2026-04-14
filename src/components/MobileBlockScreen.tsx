import React from 'react';

export const MobileBlockScreen: React.FC = () => {
  return (
    <div className="light fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-[#f4f1ea] text-[#171717] font-sans px-6 text-center">
      <div className="relative z-10 flex h-full flex-col items-center justify-center max-w-md mx-auto">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-black/5 bg-white shadow-sm">
            <img 
              src="/black-logo.png" 
              alt="Pustakam" 
              className="h-10 w-10 opacity-90" 
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#171717] mb-4">
            Desktop Experience
          </h1>
          <p className="text-[14px] leading-relaxed text-[#52525b]">
            We're currently optimizing Pustakam for mobile devices. For the best experience building and exploring AI-generated books, please open this app on your desktop.
          </p>
        </div>

        <div className="absolute bottom-12 flex flex-col items-center gap-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a1a1aa] opacity-80">
            Available on Desktop
          </div>
        </div>
      </div>
    </div>
  );
};
