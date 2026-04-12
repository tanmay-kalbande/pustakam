import React, { useState, useMemo } from 'react';
import { Settings, User, LogOut, ChevronDown, ChevronUp, BookOpen, Shield } from 'lucide-react';
import { APISettings, ModelProvider } from '../types';
import { BookProject } from '../types/book';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { AI_SUITE_NAME, PROVIDERS } from '../constants/ai';
import { getDefaultModel, getModelsForProvider } from '../services/providerRegistry';

interface TopHeaderProps {
    settings: APISettings;
    books: BookProject[];
    currentBookId: string | null;
    onModelChange: (model: string, provider: ModelProvider) => void;
    onOpenSettings: () => void;
    onSelectBook: (id: string | null) => void;
    onDeleteBook: (id: string) => void;
    onNewBook: () => void;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    onOpenAuth: () => void;
    isAuthenticated: boolean;
    authEnabled?: boolean;
    user: SupabaseUser | null;
    userProfile: any | null;
    onSignOut: () => void;
    showModelSelector?: boolean;
    onOpenDocs?: () => void;
    onOpenAPIDocs?: () => void;
    centerContent?: React.ReactNode;
}


export const TopHeader: React.FC<TopHeaderProps> = ({
    settings,
    onModelChange,
    onOpenSettings,
    theme,
    onToggleTheme,
    onOpenAuth,
    isAuthenticated,
    authEnabled = true,
    user,
    userProfile,
    onSignOut,
    onOpenDocs,
    onOpenAPIDocs,
    showModelSelector = true,
    centerContent
}) => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showModelMenu, setShowModelMenu] = useState(false);
    const displayName = userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

    // Model cycling logic
    const providerModels = useMemo(
        () => getModelsForProvider(settings.selectedProvider),
        [settings.selectedProvider]
    );

    const currentModelIndex = useMemo(
        () => Math.max(0, providerModels.findIndex(m => m.id === settings.selectedModel)),
        [providerModels, settings.selectedModel]
    );

    const currentModelName = providerModels[currentModelIndex]?.name ?? settings.selectedModel;

    const cycleModel = (direction: 'up' | 'down') => {
        if (providerModels.length <= 1) return;
        let nextIndex: number;
        if (direction === 'up') {
            nextIndex = currentModelIndex <= 0 ? providerModels.length - 1 : currentModelIndex - 1;
        } else {
            nextIndex = currentModelIndex >= providerModels.length - 1 ? 0 : currentModelIndex + 1;
        }
        const nextModel = providerModels[nextIndex];
        onModelChange(nextModel.id, settings.selectedProvider);
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 h-16 pointer-events-none">
            {/* Precious Fade-in Background */}
            <div 
                className="absolute inset-0 bg-[#050505]/45 backdrop-blur-xl border-b border-[var(--border-subtle)]"
                style={{
                    maskImage: 'linear-gradient(to bottom, black 0%, black 25%, rgba(0,0,0,0.6) 65%, rgba(0,0,0,0.2) 85%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 25%, rgba(0,0,0,0.6) 65%, rgba(0,0,0,0.2) 85%, transparent 100%)'
                }}
            />
            {/* Interactive Content Container */}
            <div className="relative h-14 px-4 md:px-6 flex items-center justify-between pointer-events-auto">
                {/* Brand / Logo */}
                <div className="flex items-center gap-3 select-none flex-shrink-0">
                    <img src={theme === 'light' ? '/black-logo.png' : '/white-logo.png'} alt="Pustakam" className="w-7 h-7" />
                    <div className="flex flex-col">
                        <span className="text-sm md:text-base font-bold tracking-tight leading-none text-[var(--text-primary)] font-mono">
                            Pustakam
                        </span>
                        <span className="text-[9px] tracking-[0.2em] uppercase text-[var(--text-muted)] font-mono">
                            {AI_SUITE_NAME}
                        </span>
                    </div>
                </div>
 
                {/* Center Content */}
                <div className="flex-1 flex justify-center px-4 overflow-hidden">
                    {centerContent}
                </div>
 
                {/* Right Controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Provider Selector + Model Cycler */}
                    {showModelSelector && (
                        <div className="flex items-center gap-0 hidden sm:flex">
                            {/* Provider dropdown button */}
                            <div className="relative">
                                <button
                                    id="provider-selector-btn"
                                    onClick={() => setShowModelMenu(!showModelMenu)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-l-md transition-all border border-r-0 border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--brand)]/30 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                >
                                    {/* Active provider badge */}
                                    <span className="text-[9px] font-black font-mono tracking-widest px-1.5 py-0.5 rounded bg-[var(--brand)]/15 text-[var(--brand)]">
                                        {PROVIDERS.find(p => p.id === settings.selectedProvider)?.badge ?? 'AI'}
                                    </span>
                                    <span className="text-xs font-semibold font-mono tracking-wide">
                                        {PROVIDERS.find(p => p.id === settings.selectedProvider)?.name ?? 'AI'}
                                    </span>
                                    <ChevronDown size={14} className={`opacity-50 transition-transform duration-200 ${showModelMenu ? 'rotate-180' : ''}`} />
                                </button>

                                {showModelMenu && (
                                    <>
                                        <div className="fixed inset-0 z-50" onClick={() => setShowModelMenu(false)} />
                                        <div
                                            id="provider-dropdown-menu"
                                            className="absolute top-full right-0 mt-2 w-60 rounded-xl bg-[var(--bg-elevated)] backdrop-blur-xl border border-[var(--border-default)] shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
                                            style={{ transformOrigin: 'top right' }}
                                        >
                                            <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                                                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">AI Provider</p>
                                                <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Model is auto-selected per task</p>
                                            </div>

                                            <div 
                                                className="overflow-y-auto max-h-[380px] p-2 flex flex-col gap-1 custom-scrollbar"
                                                style={{
                                                    scrollbarWidth: 'thin',
                                                    scrollbarColor: 'var(--brand) transparent'
                                                }}
                                            >
                                                {PROVIDERS.map((provider) => {
                                                    const isActive = settings.selectedProvider === provider.id;
                                                    const needsWhiteFilter = ['anthropic', 'groq', 'openai', 'openrouter', 'xai'].includes(provider.id);
                                                    
                                                    return (
                                                        <button
                                                            key={provider.id}
                                                            id={`provider-option-${provider.id}`}
                                                            onClick={() => {
                                                                onModelChange(
                                                                    getDefaultModel(provider.id),
                                                                    provider.id
                                                                );
                                                                setShowModelMenu(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center justify-between gap-3 ${
                                                                isActive
                                                                    ? 'text-[var(--brand)] bg-[var(--brand)]/10 border border-[var(--brand)]/20 shadow-[0_4px_12px_rgba(var(--brand-rgb),0.1)]'
                                                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] border border-transparent'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 flex-shrink-0">
                                                                    <img 
                                                                        src={`/providers/${provider.id}.svg`} 
                                                                        alt={provider.name} 
                                                                        className="w-4 h-4 object-contain"
                                                                        style={needsWhiteFilter ? { filter: 'brightness(0) invert(1)' } : {}}
                                                                        onError={(e) => {
                                                                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                                                                            if (e.currentTarget.nextElementSibling) {
                                                                                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                                                            }
                                                                        }}
                                                                    />
                                                                    <div className="hidden items-center justify-center w-full h-full text-[8px] font-black uppercase text-[var(--text-muted)]">
                                                                        {provider.badge}
                                                                    </div>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <span className="font-semibold font-mono text-xs block">{provider.name}</span>
                                                                    <span className="text-[9px] text-[var(--text-muted)] block truncate">{provider.tagline}</span>
                                                                </div>
                                                            </div>
                                                            {isActive && (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] shadow-[0_0_8px_var(--brand)] flex-shrink-0" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Orchestration hint */}
                                            <div className="px-4 pb-3 pt-1 border-t border-[var(--border-subtle)]">
                                                <p className="text-[9px] text-[var(--text-muted)] leading-relaxed">
                                                    ✦ Smart model selection: fast model for quick tasks, flagship for content
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Model Cycler — up/down arrows with model name */}
                            <div className="flex items-center border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-r-md overflow-hidden">
                                <div className="flex items-center gap-1 px-2.5 py-1.5 min-w-0" title={`Model: ${currentModelName}`}>
                                    <span className="text-[10px] font-bold font-mono text-[var(--text-muted)] truncate max-w-[110px]">
                                        {currentModelName}
                                    </span>
                                </div>
                                <div className="flex flex-col border-l border-[var(--border-subtle)]">
                                    <button
                                        onClick={() => cycleModel('up')}
                                        disabled={providerModels.length <= 1}
                                        className="px-1.5 py-0 hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] text-[var(--text-muted)] transition-colors disabled:opacity-20 disabled:cursor-not-allowed leading-none"
                                        title="Previous model"
                                    >
                                        <ChevronUp size={11} strokeWidth={2.5} />
                                    </button>
                                    <div className="h-px bg-[var(--border-subtle)]" />
                                    <button
                                        onClick={() => cycleModel('down')}
                                        disabled={providerModels.length <= 1}
                                        className="px-1.5 py-0 hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] text-[var(--text-muted)] transition-colors disabled:opacity-20 disabled:cursor-not-allowed leading-none"
                                        title="Next model"
                                    >
                                        <ChevronDown size={11} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
 
                    {/* Usage Guide */}
                    <button
                        onClick={onOpenDocs}
                        className="p-2 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--brand)] hover:bg-[var(--brand)]/5 border border-transparent hover:border-[var(--brand)]/20"
                        title="Usage Guide"
                    >
                        <BookOpen size={18} />
                    </button>
 
                    {/* Auth State */}
                    {isAuthenticated ? (
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 px-2 py-1 rounded-md transition-all border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--brand)]/30 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium max-w-[80px] truncate hidden sm:block">{displayName}</span>
                                <ChevronDown size={12} className={`opacity-50 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                            </button>
 
                            {showUserMenu && (
                                <>
                                    <div className="fixed inset-0 z-50" onClick={() => setShowUserMenu(false)} />
                                    <div className="absolute top-full right-0 mt-2 w-52 rounded-lg bg-[var(--bg-elevated)] backdrop-blur-xl border border-[var(--border-default)] shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
                                        style={{ transformOrigin: 'top right' }}
                                    >
                                        <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-0.5">Signed in as</p>
                                            <p className="text-xs font-medium truncate text-[var(--text-primary)]">{user?.email}</p>
                                        </div>
                                        <div className="py-1">
                                            <button
                                                onClick={() => {
                                                    onOpenSettings();
                                                    setShowUserMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors"
                                            >
                                                <Settings size={14} />
                                                Settings
                                            </button>
                                            <button
                                                onClick={() => {
                                                    onSignOut();
                                                    setShowUserMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 text-red-400 hover:bg-red-400/10 transition-colors"
                                            >
                                                <LogOut size={14} />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : authEnabled ? (
                        <button
                            onClick={onOpenAuth}
                            className="p-2 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--brand)] hover:bg-[var(--brand)]/5 border border-transparent hover:border-[var(--brand)]/20"
                            title="Sign In"
                        >
                            <User size={18} />
                        </button>
                    ) : (
                        <div className="px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                            Local Preview
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
