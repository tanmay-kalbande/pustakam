import React from 'react';
import { Home, AlertCircle } from 'lucide-react';
import NebulaBackground from './NebulaBackground';

interface NotFoundPageProps {
  theme?: 'light' | 'dark';
}

const NotFoundPage: React.FC<NotFoundPageProps> = ({ theme = 'dark' }) => {
  return (
    <div className={`app-container ${theme === 'dark' ? 'dark' : ''} min-h-screen flex flex-col`}>
      {theme === 'dark' ? <NebulaBackground className="z-[-1]" /> : <div className="sun-background" />}
      {theme === 'dark' && <div className="app-bg-overlay" />}
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
        <div className="w-24 h-24 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center mb-8 mx-auto relative group">
            <div className="absolute inset-0 bg-red-500/10 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <AlertCircle size={40} className="text-red-400 opacity-80 z-10" />
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black text-[var(--text-primary)] mb-4 tracking-tight" style={{ fontFamily: "'Rubik', sans-serif" }}>
          404
        </h1>
        
        <h2 className="text-xl md:text-2xl font-bold text-[var(--text-secondary)] mb-6">
          Page Not Found
        </h2>
        
        <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto mb-10 leading-relaxed">
          The page you are looking for doesn't exist or has been moved. Check the URL or head back to the main page to continue your journey.
        </p>
        
        <a 
          href="/"
          className="btn btn-primary px-8 py-3 text-sm font-bold uppercase tracking-wider inline-flex items-center gap-2 group"
        >
          <Home size={16} className="group-hover:scale-110 transition-transform" />
          Back to Home
        </a>
      </div>
    </div>
  );
};

export default NotFoundPage;
