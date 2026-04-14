import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  LogOut,
  Moon,
  Settings,
  Shield,
  Sun,
  User,
  Zap,
} from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { APISettings, ModelProvider } from '../types';
import { BookProject } from '../types/book';
import { AI_SUITE_NAME, PROVIDERS } from '../constants/ai';
import { getDefaultModel, getModelsForProvider } from '../services/providerRegistry';
import { byokStorage } from '../utils/byokStorage';

interface TopHeaderProps {
  settings: APISettings;
  books?: BookProject[];
  currentBookId?: string | null;
  onModelChange: (model: string, provider: ModelProvider) => void;
  onOpenSettings: () => void;
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
  quotaStatus?: import('../types/providers').QuotaStatus | null;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  settings,
  currentBookId,
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
  centerContent,
  quotaStatus,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProviderMenu, setShowProviderMenu] = useState(false);

  const displayName =
    userProfile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';

  const providerModels = useMemo(
    () => getModelsForProvider(settings.selectedProvider),
    [settings.selectedProvider]
  );

  const currentModelIndex = useMemo(
    () => Math.max(0, providerModels.findIndex(model => model.id === settings.selectedModel)),
    [providerModels, settings.selectedModel]
  );

  const currentModelName = providerModels[currentModelIndex]?.name ?? settings.selectedModel;
  const activeProvider = PROVIDERS.find(provider => provider.id === settings.selectedProvider);
  const availableProviders = PROVIDERS.filter(provider => provider.isProxy || byokStorage.hasKey(provider.id));

  const cycleModel = (direction: 'up' | 'down') => {
    if (providerModels.length <= 1) return;

    const nextIndex =
      direction === 'up'
        ? currentModelIndex <= 0
          ? providerModels.length - 1
          : currentModelIndex - 1
        : currentModelIndex >= providerModels.length - 1
          ? 0
          : currentModelIndex + 1;

    const nextModel = providerModels[nextIndex];
    onModelChange(nextModel.id, settings.selectedProvider);
  };

  return (
    <header className="workspace-topbar">
      <div className="workspace-topbar__inner">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={theme === 'light' ? '/black-logo.png' : '/white-logo.png'}
            alt="Pustakam"
            className="h-7 w-7 shrink-0 opacity-95"
          />
          <div className="min-w-0">
            <span className="workspace-topbar__label">{AI_SUITE_NAME}</span>
            <span className="workspace-topbar__title">
              {currentBookId ? 'Book Workspace' : 'Internal Workspace'}
            </span>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center px-4 lg:flex">
          {centerContent ?? (
            <div className="flex min-w-0 items-center gap-3 text-xs text-[var(--text-muted)]">
              <span>Roadmap</span>
              <span className="h-1 w-1 rounded-full bg-[var(--workspace-line)]" />
              <span>Chapters</span>
              <span className="h-1 w-1 rounded-full bg-[var(--workspace-line)]" />
              <span>Assembly</span>
              <span className="h-1 w-1 rounded-full bg-[var(--workspace-line)]" />
              <span>Study</span>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {showModelSelector && (
            <div className="hidden items-center gap-2 md:flex">
              <div className="relative">
                <button
                  onClick={() => setShowProviderMenu(open => !open)}
                  className="workspace-topbar__pill min-w-[170px] justify-between text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      Provider
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-semibold text-[var(--text-primary)]">
                      {activeProvider?.name ?? 'AI Provider'}
                    </span>
                  </span>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 opacity-60 transition-transform ${showProviderMenu ? 'rotate-180' : ''}`}
                  />
                </button>

                {showProviderMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProviderMenu(false)} />
                    <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-[var(--workspace-line)] bg-[rgba(10,10,10,0.96)] p-2 shadow-[0_24px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                      <div className="border-b border-[var(--workspace-line)] px-3 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                          Active provider
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                          Use the shared path or switch to your own key when you need it.
                        </p>
                      </div>

                      <div className="custom-scrollbar max-h-[360px] space-y-1 overflow-y-auto px-1 py-2">
                        {availableProviders.map(provider => {
                          const isActive = settings.selectedProvider === provider.id;
                          const invertLogo = ['anthropic', 'groq', 'openai', 'openrouter', 'xai'].includes(provider.id);

                          return (
                            <button
                              key={provider.id}
                              onClick={() => {
                                onModelChange(getDefaultModel(provider.id), provider.id);
                                setShowProviderMenu(false);
                              }}
                              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                                isActive
                                  ? 'border-[var(--brand)]/25 bg-[var(--brand)]/10'
                                  : 'border-transparent bg-transparent hover:border-[var(--workspace-line)] hover:bg-white/[0.03]'
                              }`}
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
                                <img
                                  src={`/providers/${provider.id}.svg`}
                                  alt={provider.name}
                                  className="h-4 w-4 object-contain"
                                  style={invertLogo ? { filter: 'brightness(0) invert(1)' } : undefined}
                                  onError={event => {
                                    (event.currentTarget as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-[var(--text-primary)]">
                                  {provider.name}
                                </div>
                                <div className="truncate text-[11px] text-[var(--text-secondary)]">
                                  {provider.tagline}
                                </div>
                              </div>
                              {isActive ? (
                                <span className="rounded-full bg-[var(--brand)]/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)]">
                                  Active
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="workspace-topbar__section">
                <div className="min-w-[120px] px-2">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Model
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-semibold text-[var(--text-primary)]">
                    {currentModelName}
                  </span>
                </div>
                <div className="flex flex-col overflow-hidden rounded-[10px] border border-[var(--workspace-line)]">
                  <button
                    onClick={() => cycleModel('up')}
                    disabled={providerModels.length <= 1}
                    className="flex h-[17px] w-7 items-center justify-center text-[var(--text-secondary)] transition-colors hover:bg-white/[0.04] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-25"
                    title="Previous model"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <div className="h-px bg-[var(--workspace-line)]" />
                  <button
                    onClick={() => cycleModel('down')}
                    disabled={providerModels.length <= 1}
                    className="flex h-[17px] w-7 items-center justify-center text-[var(--text-secondary)] transition-colors hover:bg-white/[0.04] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-25"
                    title="Next model"
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {quotaStatus ? (
            <div className="workspace-topbar__pill hidden md:inline-flex">
              <Zap size={14} className="text-[var(--brand)]" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {quotaStatus.hasBYOK
                  ? 'BYOK active'
                  : `${Math.max(0, quotaStatus.freeLimit - quotaStatus.booksUsed)} books left`}
              </span>
            </div>
          ) : null}

          {onOpenDocs ? (
            <button onClick={onOpenDocs} className="workspace-topbar__ghost hidden sm:inline-flex">
              <BookOpen size={16} />
              <span className="text-sm font-medium">Guide</span>
            </button>
          ) : null}

          {onOpenAPIDocs ? (
            <button onClick={onOpenAPIDocs} className="workspace-topbar__ghost hidden lg:inline-flex">
              <Shield size={16} />
              <span className="text-sm font-medium">API</span>
            </button>
          ) : null}

          <button
            onClick={onToggleTheme}
            className="workspace-topbar__ghost"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button onClick={onOpenSettings} className="workspace-topbar__ghost" title="Settings">
            <Settings size={16} />
          </button>

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(open => !open)}
                className="workspace-topbar__pill"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--workspace-line)] bg-white/[0.03] text-[11px] font-bold text-[var(--text-primary)]">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden max-w-[110px] truncate text-sm font-medium text-[var(--text-primary)] sm:block">
                  {displayName}
                </span>
                <ChevronDown
                  size={14}
                  className={`opacity-60 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-[var(--workspace-line)] bg-[rgba(10,10,10,0.96)] shadow-[0_24px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                    <div className="border-b border-[var(--workspace-line)] px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Signed in
                      </p>
                      <p className="mt-1 truncate text-sm text-[var(--text-primary)]">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          onOpenSettings();
                          setShowUserMenu(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-white/[0.03] hover:text-[var(--text-primary)]"
                      >
                        <Settings size={15} />
                        Workspace settings
                      </button>
                      <button
                        onClick={() => {
                          onSignOut();
                          setShowUserMenu(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
                      >
                        <LogOut size={15} />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : authEnabled ? (
            <button onClick={onOpenAuth} className="workspace-topbar__pill">
              <User size={15} />
              <span className="hidden text-sm font-medium sm:block">Sign in</span>
            </button>
          ) : (
            <div className="workspace-topbar__pill">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Local preview
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
