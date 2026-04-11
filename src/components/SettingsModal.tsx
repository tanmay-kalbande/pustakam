// src/components/SettingsModal.tsx
import React from 'react';
import { X, Database, Download, Upload, Trash2, Settings, Sparkles, Globe, Cpu, BookOpen, ChevronRight, Crown, Sun, Moon, Info, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { APISettings } from '../types';
import { storageUtils } from '../utils/storage';
import { DisclaimerPage } from './DisclaimerPage';
import NebulaBackground from './NebulaBackground';
import { AI_SUITE_NAME, APP_AI_BRANDLINE, PROVIDERS } from '../constants/ai';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: APISettings;
  onSaveSettings: (settings: APISettings) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenAPIDocs: () => void;
  onOpenUsageGuide: () => void;
  onOpenCompliance: () => void;
  showAlertDialog: (props: {
    type: 'info' | 'warning' | 'error' | 'success' | 'confirm';
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }) => void;
}

// Only three real tabs — 'keys' was broken (immediately redirected away) so removed
type ActiveTab = 'personality' | 'data' | 'about';

interface ImportPreview {
  books: any[];
  settings: APISettings;
  conflicts: {
    duplicateBooks: number;
    settingsConflict: boolean;
  };
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  theme,
  onToggleTheme,
  onOpenAPIDocs,
  onOpenUsageGuide,
  onOpenCompliance,
  showAlertDialog,
}: SettingsModalProps) {
  const [localSettings, setLocalSettings] = React.useState<APISettings>(settings);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('personality');
  const [importPreview, setImportPreview] = React.useState<ImportPreview | null>(null);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [showDisclaimer, setShowDisclaimer] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  const handleSave = () => {
    setIsSaving(true);
    onSaveSettings(localSettings);
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 300);
  };

  const handleExportData = () => {
    const data = {
      books: storageUtils.getBooks(user?.id),
      settings: storageUtils.getSettings(),
      exportDate: new Date().toISOString(),
      version: '1.0.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pustakam-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPreview = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        const existingBooks = storageUtils.getBooks(user?.id);
        const existingSettings = storageUtils.getSettings();

        const duplicateBooks = importData.books
          ? importData.books.filter((importBook: any) =>
              existingBooks.some((eb) => eb.id === importBook.id)
            ).length
          : 0;

        const settingsConflict =
          importData.settings &&
          JSON.stringify(existingSettings) !== JSON.stringify(importData.settings);

        setImportPreview({
          books: importData.books || [],
          settings: importData.settings || existingSettings,
          conflicts: { duplicateBooks, settingsConflict },
        });
        setShowImportModal(true);
      } catch {
        showAlertDialog({
          type: 'error',
          title: 'Invalid File',
          message: 'Failed to read import file. Please check the file format.',
          confirmText: 'OK',
        });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const executeImport = (mode: 'merge' | 'replace') => {
    if (!importPreview) return;

    try {
      if (mode === 'replace') {
        storageUtils.saveBooks(importPreview.books, user?.id);
        if (importPreview.settings) {
          setLocalSettings(importPreview.settings);
          storageUtils.saveSettings(importPreview.settings);
        }
      } else {
        const existingBooks = storageUtils.getBooks(user?.id);
        const mergedBooks = [...existingBooks];
        importPreview.books.forEach((importBook: any) => {
          if (!mergedBooks.some((eb) => eb.id === importBook.id)) {
            mergedBooks.push(importBook);
          }
        });
        storageUtils.saveBooks(mergedBooks, user?.id);
        storageUtils.saveSettings(importPreview.settings);
        setLocalSettings(importPreview.settings);
      }

      setShowImportModal(false);
      setImportPreview(null);
      showAlertDialog({
        type: 'success',
        title: 'Import Successful',
        message: `Data imported using ${mode} mode. The app will reload.`,
        confirmText: 'OK',
        onConfirm: () => window.location.reload(),
      });
    } catch (error) {
      let message = 'Failed to import data. Please check the file and try again.';
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        message = 'Import failed: Browser storage is full.';
      }
      showAlertDialog({ type: 'error', title: 'Import Failed', message, confirmText: 'Dismiss' });
    }
  };

  const handleClearData = () => {
    showAlertDialog({
      type: 'confirm',
      title: 'Confirm Data Deletion',
      message: 'This will permanently delete all books and settings. This action cannot be undone.',
      confirmText: 'Yes, Delete All',
      cancelText: 'Cancel',
      onConfirm: () => {
        storageUtils.clearAll();
        showAlertDialog({
          type: 'success',
          title: 'Data Cleared',
          message: 'All data has been cleared. The app will reload.',
          confirmText: 'OK',
          onConfirm: () => window.location.reload(),
        });
      },
    });
  };

  if (!isOpen) return null;

  const NAV_TABS: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'personality', label: 'Persona & Identity', icon: Sparkles },
    { id: 'data',        label: 'Data & Backup',      icon: Database },
    { id: 'about',       label: 'About',               icon: Cpu },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-3 md:items-center md:p-4 backdrop-blur-md"
        onClick={onClose}
      >
        <div
          className="relative my-auto flex max-h-[calc(100vh-24px)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-white/10 bg-[var(--bg-base)] shadow-2xl md:max-h-[calc(100vh-40px)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Background effects */}
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <NebulaBackground opacity={0.2} />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />

          {/* Header */}
          <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4 md:px-8">
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-[var(--brand)]/20 bg-[var(--brand)]/10 p-2 text-[var(--brand)]">
                <Settings size={16} />
              </div>
              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand)]/80">System Preferences</h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">Configuration & Workspace Controls</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn btn-secondary p-2 rounded-full"
            >
              <X size={18} />
            </button>
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden flex-col md:flex-row">
            {/* Sidebar */}
            <div className="flex w-full flex-col overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 md:w-[260px] md:border-b-0 md:border-r">
              <div className="flex flex-1 items-center overflow-x-auto p-4 whitespace-nowrap custom-scrollbar md:flex-col md:items-start md:overflow-x-hidden md:overflow-y-auto md:p-6 md:whitespace-normal">
                <div className="flex items-center gap-2 mb-0 md:mb-8 mr-6 md:mr-0 shrink-0">
                  <div className="h-6 w-1 rounded-full bg-[var(--brand)]" />
                  <h2 className="text-base font-bold uppercase tracking-tight text-[var(--text-primary)] md:text-lg">Settings</h2>
                </div>

                <nav className="flex md:flex-col space-x-1 md:space-x-0 md:space-y-1 shrink-0 w-full">
                  {NAV_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-3 rounded-md px-4 py-2 text-left text-xs font-bold transition-all duration-200 md:py-2.5 ${
                        activeTab === tab.id
                          ? 'bg-[var(--brand)]/10 text-[var(--brand)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <tab.icon
                        size={16}
                        className="shrink-0"
                      />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>

                {/* Resource links */}
                <div className="hidden md:block mt-8 pt-6 border-t border-[var(--border-subtle)] w-full text-left">
                  <p className="mb-4 px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Resources</p>
                  <div className="space-y-1">
                    <button
                      onClick={onOpenUsageGuide}
                      className="flex w-full items-center gap-3 px-4 py-2 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--brand)]"
                    >
                      <Info size={14} /> Usage Guide
                    </button>
                    <button
                      onClick={onOpenCompliance}
                      className="flex w-full items-center gap-3 px-4 py-2 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--brand)]"
                    >
                      <Shield size={14} /> Compliance
                    </button>
                  </div>
                </div>
              </div>

              {/* Theme toggle (desktop only) */}
              <div className="hidden md:flex mt-auto border-t border-[var(--border-subtle)] p-6">
                <button
                  onClick={onToggleTheme}
                  className="group flex w-full items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] p-4 transition-all hover:border-[var(--brand)]/30"
                >
                  <div className="flex items-center gap-3">
                    {theme === 'light' ? (
                      <Sun size={18} className="text-[var(--brand)]" />
                    ) : (
                      <Moon size={18} className="text-[var(--brand)]" />
                    )}
                    <span className="text-sm font-bold capitalize text-[var(--text-secondary)]">{theme} Mode</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-[var(--brand)]' : 'bg-[var(--text-muted)]'}`}>
                    <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-5' : 'left-1'}`} />
                  </div>
                </button>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-5 text-[var(--color-text-primary)] scroll-smooth md:p-6">

              {/* ── PERSONALITY TAB ── */}
              {activeTab === 'personality' && (
                <div className="space-y-8">
                  <header>
                    <h3 className="mb-1 text-lg font-bold text-[var(--text-primary)]">Persona & Identity</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Customize appearance and generation behaviors.</p>
                  </header>

                  {/* Theme */}
                  <section className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Theme Preference</label>
                    <div className="grid grid-cols-2 gap-2 rounded-md border border-[var(--border-subtle)] bg-white/5 p-1">
                      {(['light', 'dark'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => theme !== t && onToggleTheme()}
                          className={`flex items-center justify-center gap-2.5 py-2.5 rounded-sm transition-all duration-200 capitalize font-bold text-sm ${
                            theme === t
                              ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)] font-black'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {t === 'light' ? <Sun size={16} className={theme === 'light' ? 'text-[var(--brand)]' : ''} /> : <Moon size={16} className={theme === 'dark' ? 'text-[var(--brand)]' : ''} />}
                          {t} Mode
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Generation mode */}
                  <section className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Default Generation Mode</label>
                    <div className="grid grid-cols-2 gap-2 rounded-md border border-[var(--border-subtle)] bg-white/5 p-1">
                      {[
                        { value: 'stellar',   label: 'Stellar Mode', icon: Sparkles },
                        { value: 'blackhole', label: 'Street Mode',  icon: Crown },
                      ].map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => setLocalSettings(p => ({ ...p, defaultGenerationMode: value as any }))}
                          className={`flex items-center justify-center gap-2.5 py-2.5 rounded-sm transition-all duration-200 font-bold text-sm ${
                            localSettings.defaultGenerationMode === value
                              ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)] font-black'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <Icon size={16} className={localSettings.defaultGenerationMode === value ? 'text-[var(--brand)]' : ''} /> {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] italic text-[var(--text-muted)]">
                      Stellar is professional. Street is raw and unrestricted.
                    </p>
                  </section>

                  {/* Language */}
                  <section className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Default Language</label>
                    <div className="grid grid-cols-1 gap-2 rounded-md border border-[var(--border-subtle)] bg-white/5 p-1 md:grid-cols-3">
                      {[
                        { value: 'en', label: 'English' },
                        ...(localSettings.defaultGenerationMode === 'blackhole'
                          ? [
                              { value: 'hi', label: 'Hindi (Tapori)' },
                              { value: 'mr', label: 'Marathi (Tapori)' },
                            ]
                          : []),
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setLocalSettings(p => ({ ...p, defaultLanguage: value as any }))}
                          className={`flex items-center justify-center gap-2 py-2.5 rounded-sm transition-all duration-200 font-bold text-sm ${
                            localSettings.defaultLanguage === value
                              ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)] font-black'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <Globe size={14} className={localSettings.defaultLanguage === value ? 'text-[var(--brand)]' : ''} /> {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] italic text-[var(--text-muted)]">
                      {localSettings.defaultGenerationMode === 'blackhole'
                        ? 'Desi "Tapori" modes are only available for Street personality.'
                        : 'Standard English used for Stellar Mode.'}
                    </p>
                  </section>
                </div>
              )}

              {/* ── DATA TAB ── */}
              {activeTab === 'data' && (
                <div className="space-y-8">
                  <header>
                    <h3 className="mb-1 text-lg font-bold text-[var(--text-primary)]">Data Management</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Control your local library and archives.</p>
                  </header>

                  <section className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Backup Operations</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleExportData}
                        className="btn btn-primary h-10 text-xs rounded-md"
                      >
                        <Download size={14} /> Export Archive
                      </button>
                      <label className="btn btn-secondary h-10 text-xs rounded-md">
                        <Upload size={14} /> Restore Library
                        <input type="file" ref={fileInputRef} onChange={handleImportPreview} accept=".json" className="hidden" />
                      </label>
                    </div>
                  </section>

                  <section className="pt-8 space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-500">Danger Zone</h4>
                    <div className="p-4 rounded-md border border-red-500/20 bg-red-500/5">
                      <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                        Resetting the engine will purge all knowledge bases, session history, and preferences. This cannot be undone.
                      </p>
                      <button
                        onClick={handleClearData}
                        className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-2 transition-colors uppercase tracking-wider"
                      >
                        <Trash2 size={14} /> Purge All System Data
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {/* ── ABOUT TAB ── */}
              {activeTab === 'about' && (
                <div className="space-y-10">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)] shrink-0">
                      <img src="/white-logo.png" alt="Logo" className="w-10 h-10 opacity-70" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">{APP_AI_BRANDLINE.toUpperCase()}</h3>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--brand)] opacity-60 px-2 py-0.5 bg-[var(--brand)]/10 rounded-md inline-block">{AI_SUITE_NAME} Edition</p>
                      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                        A focused AI book forge for modular generation, long-form chapters, and structured learning assets.
                      </p>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                    {[
                      { label: 'AI Framework', val: 'Smart Orchestration' },
                      { label: 'Providers',    val: `${PROVIDERS.length} (Z AI, Fast Mistral)` },
                      { label: 'Architecture', val: 'Hybrid PWA' },
                      { label: 'Security',    val: 'Client-side Encryption' },
                    ].map(({ label, val }) => (
                      <div key={label} className="space-y-1.5 text-left">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
                        <p className="text-sm font-bold text-[var(--text-secondary)]">{val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 pt-10 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Developer</p>
                      <a
                        href="https://www.linkedin.com/in/tanmay-kalbande/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors"
                      >
                        T. KALBANDE
                      </a>
                    </div>
                    <button
                      onClick={onOpenUsageGuide}
                      className="btn btn-secondary w-full h-10 text-xs font-bold justify-between group rounded-md"
                    >
                      <span className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">Open User Manual & Guide</span>
                      <ChevronRight size={14} className="text-[var(--text-muted)]" />
                    </button>

                    <button
                      onClick={() => setShowDisclaimer(true)}
                      className="btn btn-secondary w-full h-10 text-xs font-bold justify-between group rounded-md"
                    >
                      <span className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">System Regulatory Compliance</span>
                      <ChevronRight size={14} className="text-[var(--text-muted)]" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 flex shrink-0 flex-col items-center justify-between gap-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-4 md:flex-row md:gap-0">
            <div className="flex items-center gap-2 order-2 md:order-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/20" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Edge Engine Online</span>
            </div>
            <div className="flex items-center gap-3 order-1 md:order-2 w-full md:w-auto">
              <button
                onClick={onClose}
                className="btn btn-ghost px-4 text-xs font-bold md:flex-none h-10 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn btn-primary flex-1 md:flex-none px-6 rounded-md h-10 text-xs"
              >
                {isSaving ? 'Saving…' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Import confirm modal */}
      {showImportModal && importPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg shadow-2xl w-full max-w-md p-8">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Confirm Data Import</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Review the details below before proceeding.</p>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="p-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-base)]">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Items</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{importPreview.books.length} Books</p>
              </div>
              <div className="p-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-base)]">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Config</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{importPreview.settings ? 'Included' : 'None'}</p>
              </div>
            </div>

            {importPreview.conflicts.duplicateBooks > 0 && (
              <div className="p-4 rounded-md border border-[var(--brand)]/20 bg-[var(--brand)]/5 mb-6">
                <p className="text-xs font-bold text-[var(--brand)] mb-1">⚠️ Conflicts detected</p>
                <p className="text-xs text-[var(--text-secondary)]">{importPreview.conflicts.duplicateBooks} existing record(s) will be updated</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={() => executeImport('merge')}
                className="btn btn-primary w-full py-3"
              >
                Merge with Current Library
              </button>
              <button
                onClick={() => executeImport('replace')}
                className="btn btn-secondary w-full py-3"
              >
                Replace Entire Library
              </button>
              <button
                onClick={() => { setShowImportModal(false); setImportPreview(null); }}
                className="btn btn-ghost w-full py-3 text-[var(--text-muted)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDisclaimer && (
        <DisclaimerPage isOpen={showDisclaimer} onClose={() => setShowDisclaimer(false)} />
      )}
    </>
  );
}
