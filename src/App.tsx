// ============================================================================
// FILE: src/App.tsx
// ============================================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { LoadingScreen } from './components/LoadingScreen';
import { InstallPrompt } from './components/InstallPrompt';
import { SettingsModal } from './components/SettingsModal';
import { useGenerationStats } from './components/GenerationProgressPanel';
import { APISettings, ModelProvider } from './types';
import { usePWA } from './hooks/usePWA';
import { WifiOff } from 'lucide-react';
import { storageUtils } from './utils/storage';
import { bookService } from './services/bookService';
import { planService } from './services/planService';
import { BookView } from './components/BookView';
import { BookProject, BookSession } from './types/book';
import { generateId } from './utils/helpers';
import { TopHeader } from './components/TopHeader';
import { CustomAlertDialog } from './components/CustomAlertDialog';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { WelcomeModal } from './components/WelcomeModal';
import LandingPage from './components/LandingPage';
import AboutPage from './components/AboutPage';
import TermsPage from './components/TermsPage';
import PrivacyPage from './components/PrivacyPage';
import NebulaBackground from './components/NebulaBackground';
import APIDocsPage from './components/APIDocsPage';
import UsageGuidePage from './components/UsageGuidePage';
import CompliancePage from './components/CompliancePage';
import { DisclaimerPage } from './components/DisclaimerPage';
import BlogPage from './components/BlogPage';
import { Toast, ToastType } from './components/Toast';
import { APP_AI_BRANDLINE, PROVIDERS } from './constants/ai';

type AppView = 'list' | 'create' | 'detail';
type Theme = 'light' | 'dark';
const MAX_BOOK_TITLE_LENGTH = 72;

function formatBookTitle(session: Pick<BookSession, 'title' | 'goal'>): string {
  const rawTitle = (session.title || session.goal || 'Untitled Book').replace(/\s+/g, ' ').trim();
  if (rawTitle.length <= MAX_BOOK_TITLE_LENGTH) return rawTitle;

  const slice = rawTitle.slice(0, MAX_BOOK_TITLE_LENGTH);
  const lastSpace = slice.lastIndexOf(' ');
  const safeSlice = lastSpace >= 40 ? slice.slice(0, lastSpace) : slice;

  return `${safeSlice.trim().replace(/[.,:;!?-]+$/, '')}...`;
}

interface GenerationStatus {
  currentModule?: { id: string; title: string; attempt: number; progress: number; generatedText?: string; };
  totalProgress: number;
  status: 'idle' | 'generating' | 'completed' | 'error' | 'paused' | 'waiting_retry';
  logMessage?: string;
  totalWordsGenerated?: number;
  retryInfo?: { moduleTitle: string; error: string; retryCount: number; maxRetries: number; waitTime?: number; };
}

function App() {
  const [showLocalLanding, setShowLocalLanding] = useState(true);
  const [books, setBooks] = useState<BookProject[]>([]);
  const [settings, setSettings] = useState<APISettings>(() => storageUtils.getSettings());
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [view, setView] = useState<AppView>('list');
  const [showListInMain, setShowListInMain] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({ status: 'idle', totalProgress: 0, totalWordsGenerated: 0 });
  const [generationStartTime, setGenerationStartTime] = useState<Date>(new Date());
  const [showModelSwitch, setShowModelSwitch] = useState(false);
  const [modelSwitchOptions, setModelSwitchOptions] = useState<Array<{ provider: ModelProvider; model: string; name: string }>>([]);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('pustakam-theme') as Theme) || 'dark');
  const [isReadingMode, setIsReadingMode] = useState(false);

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'subscribe'>('signin');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isAuthTransitioning, setIsAuthTransitioning] = useState(false);
  const [isLoadingScreenVisible, setIsLoadingScreenVisible] = useState(true);
  const [isLoadingScreenExiting, setIsLoadingScreenExiting] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Legal pages state
  const [showAboutPage, setShowAboutPage] = useState(false);
  const [showTermsPage, setShowTermsPage] = useState(false);
  const [showPrivacyPage, setShowPrivacyPage] = useState(false);
  const [showAPIDocsPage, setShowAPIDocsPage] = useState(false);
  const [showUsageGuidePage, setShowUsageGuidePage] = useState(false);
  const [showCompliancePage, setShowCompliancePage] = useState(false);
  const [showDisclaimerPage, setShowDisclaimerPage] = useState(false);
  const [showBlogPage, setShowBlogPage] = useState(false);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  }, []);

  const { isAuthenticated, isSupabaseEnabled, isLoading, user, profile, signOut, refreshProfile } = useAuth();

  // Alert dialog state
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [alertDialogProps, setAlertDialogProps] = useState<{
    type: 'info' | 'warning' | 'error' | 'success' | 'confirm';
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({ type: 'info', title: '', message: '' });

  const showAlertDialog = useCallback((props: {
    type: 'info' | 'warning' | 'error' | 'success' | 'confirm';
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }) => {
    setAlertDialogProps(props);
    setIsAlertDialogOpen(true);
  }, []);

  const handleAlertDialogClose = useCallback(() => {
    setIsAlertDialogOpen(false);
    setAlertDialogProps({ type: 'info', title: '', message: '' });
  }, []);

  const { isInstallable, isInstalled, installApp, dismissInstallPrompt } = usePWA();

  const currentBook = useMemo(
    () => (currentBookId ? books.find(b => b.id === currentBookId) : null),
    [currentBookId, books]
  );

  const isGenerating = useMemo(() => {
    if (!currentBook) return false;
    return currentBook.status === 'generating_content' || generationStatus.status === 'generating';
  }, [currentBook?.status, generationStatus.status]);

  const totalWordsGenerated = useMemo(
    () => currentBook?.modules.reduce((sum, m) => sum + (m.status === 'completed' ? m.wordCount : 0), 0) || 0,
    [currentBook?.modules]
  );

  // Offer the OTHER provider as an alternative when generation fails
  const alternativeModels = useMemo(
    () => PROVIDERS
      .filter(p => p.id !== settings.selectedProvider)
      .map(p => ({
        provider: p.id,
        model: p.id === 'zhipu' ? 'glm-5' : 'mistral-medium-latest',
        name: p.name,
      })),
    [settings.selectedProvider]
  );

  const generationStats = useGenerationStats(
    currentBook?.roadmap?.totalModules || 0,
    currentBook?.modules.filter(m => m.status === 'completed').length || 0,
    currentBook?.modules.filter(m => m.status === 'error').length || 0,
    generationStartTime,
    generationStatus.totalWordsGenerated || totalWordsGenerated
  );

  useEffect(() => {
    localStorage.setItem('pustakam-theme', theme);
    document.documentElement.className = theme;
  }, [theme]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    books.forEach(book => {
      if (book.status === 'completed') {
        try { localStorage.removeItem(`pause_flag_${book.id}`); }
        catch (e) { console.warn('Failed to clear pause flag:', e); }
      }
    });
  }, []);

  useEffect(() => {
    bookService.updateSettings(settings);
    bookService.setProgressCallback(handleBookProgressUpdate);
    bookService.setGenerationStatusCallback((bookId, status) => {
      setGenerationStatus(prev => ({
        ...prev,
        ...status,
        totalWordsGenerated: status.totalWordsGenerated || prev.totalWordsGenerated,
      }));
    });
  }, [settings]);

  const hasLoadedUserBooksRef = React.useRef(false);

  useEffect(() => {
    if (!isLoading && hasLoadedUserBooksRef.current) {
      storageUtils.saveBooks(books, user?.id);
    }
  }, [books, user?.id, isLoading]);

  useEffect(() => { if (!currentBookId) setView('list'); }, [currentBookId]);

  useEffect(() => {
    if (!isLoading) setIsAuthTransitioning(false);
  }, [isAuthenticated, isLoading]);

  // Extra safety: never let auth-transition mode blank the whole app for too long.
  useEffect(() => {
    if (!isAuthTransitioning) return;

    const transitionSafetyTimer = setTimeout(() => {
      console.warn('[App] Auth transition safety timeout - forcing content render');
      setIsAuthTransitioning(false);
      setIsLoadingScreenVisible(false);
      setIsLoadingScreenExiting(false);
    }, 8000);

    return () => clearTimeout(transitionSafetyTimer);
  }, [isAuthTransitioning]);

  // Hard safety: never let the loading screen stay more than 15 seconds
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (isLoadingScreenVisible) {
        console.warn('[App] Loading screen safety timeout — forcing dismiss');
        setIsLoadingScreenExiting(true);
        setTimeout(() => {
          setIsLoadingScreenVisible(false);
          setIsLoadingScreenExiting(false);
          setIsAuthTransitioning(false);
        }, 400);
      }
    }, 15000);   // ← was 6000
    return () => clearTimeout(safetyTimer);
  }, []); // run once on mount

  // Load user books when auth resolves
  useEffect(() => {
    if (isLoading) return;

    const loadedBooks = storageUtils.getBooks(user?.id);
    setBooks(loadedBooks);
    hasLoadedUserBooksRef.current = true;

    // Ensure a smooth transition even for fasting loading landing page
    const holdTime = user ? 1500 : 1000;
    setTimeout(() => {
      setIsLoadingScreenExiting(true);
      setTimeout(() => {
        setIsLoadingScreenVisible(false);
        setIsLoadingScreenExiting(false);
      }, 700);
    }, holdTime);

    if (user?.id && loadedBooks.length > 0) {
      planService.syncBooksCount(loadedBooks.length)
        .then(synced => { if (synced) refreshProfile(); })
        .catch(() => {});
    }

    setCurrentBookId(null);
  }, [user?.id, isLoading, refreshProfile]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setShowOfflineMessage(false); };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
      setTimeout(() => setShowOfflineMessage(false), 5000);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-advance status when all modules complete
  useEffect(() => {
    if (!currentBook) return;

    const areAllModulesDone =
      currentBook.roadmap &&
      currentBook.modules.length === currentBook.roadmap.modules.length &&
      currentBook.modules.every(m => m.status === 'completed');

    if (
      areAllModulesDone &&
      currentBook.status === 'generating_content' &&
      generationStatus.status !== 'generating' &&
      generationStatus.status !== 'paused' &&
      generationStatus.status !== 'waiting_retry'
    ) {
      setBooks(prev =>
        prev.map(book =>
          book.id === currentBook.id
            ? { ...book, status: 'roadmap_completed', progress: 90, updatedAt: new Date() }
            : book
        )
      );
      setGenerationStatus({
        status: 'completed',
        totalProgress: 100,
        logMessage: 'Done. Your book is ready.',
        totalWordsGenerated: currentBook.modules.reduce((s, m) => s + m.wordCount, 0),
      });
    }
  }, [currentBook, generationStatus.status]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const hasApiKey = import.meta.env.VITE_USE_PROXY === 'true';

  const shouldShowLanding =
    !isLoading &&
    !isAuthTransitioning &&
    ((isSupabaseEnabled && !isAuthenticated) || (!isSupabaseEnabled && showLocalLanding));

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSelectBook = (id: string | null) => {
    setCurrentBookId(id);
    if (id) {
      setView('detail');
      const book = books.find(b => b.id === id);
      if (book?.status === 'completed') {
        try { localStorage.removeItem(`pause_flag_${id}`); } catch {}
        setGenerationStatus({
          status: 'idle',
          totalProgress: 0,
          totalWordsGenerated: book.modules.reduce((s, m) => s + m.wordCount, 0),
        });
      }
    }
  };

  const handleBookProgressUpdate = (bookId: string, updates: Partial<BookProject>) => {
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, ...updates, updatedAt: new Date() } : b));
  };

  const handleUpdateBookStatus = (bookId: string, newStatus: BookProject['status']) => {
    if (!bookId || !newStatus) return;
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, status: newStatus, updatedAt: new Date() } : b));
  };

  const handleCreateBookRoadmap = async (session: BookSession) => {
    if (!session.goal.trim()) {
      showAlertDialog({ type: 'warning', title: 'Input Required', message: 'Please enter a learning goal.', confirmText: 'Got it' });
      return;
    }


    const bookId = generateId();
    try {
      localStorage.removeItem(`pause_flag_${bookId}`);
      localStorage.removeItem(`checkpoint_${bookId}`);
    } catch {}

    const newBook: BookProject = {
      id: bookId,
      title: formatBookTitle(session),
      goal: session.goal,
      language: 'en',
      status: 'planning',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      modules: [],
      category: 'general',
      reasoning: session.reasoning,
      generationMode: session.generationMode,
    };

    setBooks(prev => [...prev, newBook]);
    setCurrentBookId(bookId);
    setView('detail');

    try {
      const roadmap = await bookService.generateRoadmap(session, bookId);
      setBooks(prev => prev.map(book =>
        book.id === bookId
          ? { ...book, roadmap, status: 'roadmap_completed', progress: 10, title: formatBookTitle(session) }
          : book
      ));
      showToast('Roadmap created! Ready to generate chapters.', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to generate roadmap';
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, status: 'error', error: msg } : b));
      showToast(`Roadmap failed: ${msg}`, 'error');
    }
  };

  const handleGenerateAllModules = async (book: BookProject, session: BookSession) => {
    if (isSupabaseEnabled && !isAuthenticated) { setShowAuthModal(true); return; }
    if (!book.roadmap) {
      showToast('No roadmap found. Generate a roadmap first.', 'warning');
      return;
    }
    if (!session?.goal?.trim()) {
      showAlertDialog({ type: 'error', title: 'Invalid Session', message: 'Book session data is incomplete. Try creating a new book.', confirmText: 'Dismiss' });
      return;
    }

    setGenerationStartTime(new Date());
    setGenerationStatus({ status: 'generating', totalProgress: 0, logMessage: 'Starting generation…', totalWordsGenerated: 0 });

    try {
      await bookService.generateAllModulesWithRecovery(book, session);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Generation failed';
      if (!msg.includes('GENERATION_PAUSED')) {
        setGenerationStatus({ status: 'error', totalProgress: 0, logMessage: `Generation failed: ${msg}` });
        showToast(`Generation stopped: ${msg}`, 'error');
      }
    }
  };

  const handlePauseGeneration = (bookId: string) => {
    showAlertDialog({
      type: 'confirm',
      title: 'Cancel Generation?',
      message: 'Progress will be saved. You can resume later.',
      confirmText: 'Yes, Cancel',
      cancelText: 'Keep Generating',
      onConfirm: () => {
        bookService.cancelActiveRequests(bookId);
        bookService.pauseGeneration(bookId);
        setGenerationStatus(prev => ({ ...prev, status: 'paused', logMessage: '⏸ Generation paused' }));
        showToast('Paused. Picks up right where you left off.', 'info');
      },
    });
  };

  const handleResumeGeneration = async (book: BookProject, session: BookSession) => {
    if (!book.roadmap) {
      showToast('No roadmap. Cannot resume.', 'error');
      return;
    }

    bookService.resumeGeneration(book.id);
    setGenerationStartTime(new Date());
    setGenerationStatus({
      status: 'generating',
      totalProgress: 0,
      logMessage: 'Resuming generation…',
      totalWordsGenerated: book.modules.reduce((sum, m) => sum + (m.status === 'completed' ? m.wordCount : 0), 0),
    });

    try {
      await bookService.generateAllModulesWithRecovery(book, session);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Resume failed';
      if (!msg.includes('GENERATION_PAUSED')) {
        setGenerationStatus({ status: 'error', totalProgress: 0, logMessage: `Resume failed: ${msg}` });
        showToast(`Resume failed: ${msg}`, 'error');
      }
    }
  };

  const handleRetryFailedModules = async (book: BookProject, session: BookSession) => {
    const failedCount = book.modules.filter(m => m.status === 'error').length;
    if (failedCount === 0) {
      showToast('No failed modules to retry.', 'info');
      return;
    }

    setGenerationStartTime(new Date());
    setGenerationStatus({
      status: 'generating',
      totalProgress: 0,
      logMessage: `Retrying ${failedCount} failed module(s)…`,
      totalWordsGenerated: book.modules.reduce((sum, m) => sum + (m.status === 'completed' ? m.wordCount : 0), 0),
    });

    try {
      await bookService.retryFailedModules(book, session);
      showToast('Retry complete!', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Retry failed';
      setGenerationStatus({ status: 'error', totalProgress: 0, logMessage: `Retry failed: ${msg}` });
      showToast(`Retry failed: ${msg}`, 'error');
    }
  };

  const handleAssembleBook = async (book: BookProject, session: BookSession) => {
    try {
      await bookService.assembleFinalBook(book, session);
      setGenerationStatus({ status: 'completed', totalProgress: 100, logMessage: '✅ Book completed!' });
      showToast('Book assembled! Ready to read.', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Assembly failed';
      showToast('Couldn\'t assemble the final book. Your chapters are saved.', 'error');
      setBooks(prev => prev.map(b => b.id === book.id ? { ...b, status: 'error', error: msg } : b));
    }
  };

  const handleDeleteBook = (id: string) => {
    showAlertDialog({
      type: 'confirm',
      title: 'Delete Book?',
      message: 'This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => {
        setBooks(prev => prev.filter(b => b.id !== id));
        if (currentBookId === id) { setCurrentBookId(null); setView('list'); }
        try {
          localStorage.removeItem(`checkpoint_${id}`);
          localStorage.removeItem(`pause_flag_${id}`);
        } catch {}
        showToast('Book deleted.', 'info');
      },
    });
  };

  const handleSaveSettings = (newSettings: APISettings) => {
    setSettings(newSettings);
    storageUtils.saveSettings(newSettings);
    setSettingsOpen(false);
    showToast('Settings saved.', 'success');
  };

  const handleModelChange = (model: string, provider: ModelProvider) => {
    const newSettings = { ...settings, selectedModel: model, selectedProvider: provider };
    setSettings(newSettings);
    storageUtils.saveSettings(newSettings);
    const providerName = provider === 'zhipu' ? 'Z.ai' : (provider || 'MODEL').toUpperCase();
    showToast(`Switched to ${providerName}`, 'info');
  };

  const handleRetryDecision = async (decision: 'retry' | 'switch' | 'skip') => {
    if (!currentBook) return;

    if (decision === 'retry') {
      bookService.setRetryDecision(currentBook.id, 'retry');
    } else if (decision === 'switch') {
      bookService.setRetryDecision(currentBook.id, 'switch');
      if (alternativeModels.length === 0) {
        showAlertDialog({
          type: 'warning',
          title: 'No Alternatives',
          message: 'No alternative GLM models available. Check the proxy config in settings.',
          confirmText: 'Open Setup',
          onConfirm: () => setSettingsOpen(true),
        });
        return;
      }
      setModelSwitchOptions(alternativeModels);
      setShowModelSwitch(true);
    } else {
      showAlertDialog({
        type: 'confirm',
        title: 'Skip This Module?',
        message: 'It will be marked as failed and excluded from the final book.',
        confirmText: 'Yes, Skip',
        cancelText: 'Wait',
        onConfirm: () => bookService.setRetryDecision(currentBook.id, 'skip'),
      });
    }
  };

  const handleModelSwitch = async (provider: ModelProvider, model: string) => {
    const newSettings = { ...settings, selectedProvider: provider, selectedModel: model };
    setSettings(newSettings);
    storageUtils.saveSettings(newSettings);
    setShowModelSwitch(false);
    const providerName = provider === 'zhipu' ? 'Z.ai' : (provider || 'MODEL').toUpperCase();
    showToast(`Switched to ${providerName}. Click Resume to continue.`, 'success');
    if (currentBook) {
      setGenerationStatus(prev => ({ ...prev, status: 'paused', logMessage: '⚙️ Model switched' }));
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="app-container">
      {/* 1. Global Background Layers */}
      {theme === 'dark' ? <NebulaBackground className="z-[-1]" /> : <div className="sun-background" />}
      {theme === 'dark' && !shouldShowLanding && <div className="app-bg-overlay" />}

      {/* 2. Loading Phase (Full Screen Portal/Overlay) */}
      {isLoadingScreenVisible && (
        <LoadingScreen
          theme={theme}
          isExiting={isLoadingScreenExiting}
          message={isAuthTransitioning ? 'Getting your books ready...' : 'Firing up the engine...'}
        />
      )}

      {/* 3. Authentication & Content Determining Phase */}
      {/* We wait for auth to settle (isLoading=false) before showing ANY content to prevent FOUC */}
      {!isLoading && !isAuthTransitioning && (
        <>
          {shouldShowLanding ? (
            /* A. Landing / Auth Entry Path */
            <>
              <LandingPage
                onLogin={() => { setAuthMode('signin'); setShowAuthModal(true); }}
                onGetStarted={() => {
                  if (isSupabaseEnabled) { setAuthMode('signup'); setShowAuthModal(true); return; }
                  setShowLocalLanding(false);
                  setView('list');
                }}
                onSubscribe={() => { setAuthMode('subscribe'); setShowAuthModal(true); }}
                onShowAbout={() => setShowAboutPage(true)}
                onShowTerms={() => setShowTermsPage(true)}
                onShowPrivacy={() => setShowPrivacyPage(true)}
                onShowCompliance={() => setShowCompliancePage(true)}
                onShowDisclaimer={() => setShowDisclaimerPage(true)}
                onShowBlog={() => setShowBlogPage(true)}
              />
              <AuthModal
                isOpen={isSupabaseEnabled && showAuthModal}
                onClose={() => setShowAuthModal(false)}
                initialMode={authMode}
                onSuccess={() => {
                  setIsAuthTransitioning(true);
                  setIsLoadingScreenVisible(true);
                  setShowAuthModal(false);
                  setTimeout(() => {
                    setIsLoadingScreenExiting(true);
                    setTimeout(() => {
                      setIsLoadingScreenVisible(false);
                      setIsLoadingScreenExiting(false);
                      setIsAuthTransitioning(false);
                      setShowWelcomeModal(true);
                    }, 700);
                  }, 2500);
                }}
              />
            </>
          ) : (
            /* B. Application Main Path */
            <>
              <TopHeader
                settings={settings}
                books={books}
                currentBookId={currentBookId}
                onModelChange={handleModelChange}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenDocs={() => setShowUsageGuidePage(true)}
                onOpenAPIDocs={() => setShowAPIDocsPage(true)}
                theme={theme}
                onToggleTheme={toggleTheme}
                onOpenAuth={() => setShowAuthModal(true)}
                authEnabled={isSupabaseEnabled}
                isAuthenticated={!!user}
                user={user}
                userProfile={profile}
                onSignOut={signOut}
                centerContent={
                  showListInMain && !currentBookId
                    ? <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">My Books</h1>
                    : null
                }
              />

              <main id="main-scroll-area" className="main-content">
                {showOfflineMessage && (
                  <div className="fixed top-20 right-4 z-50 content-card p-3 animate-fade-in-up">
                    <div className="flex items-center gap-2 text-yellow-400">
                      <WifiOff size={16} />
                      <span className="text-sm">You're offline. Some features may be unavailable.</span>
                    </div>
                  </div>
                )}

                <BookView
                  books={books}
                  currentBookId={currentBookId}
                  onCreateBookRoadmap={handleCreateBookRoadmap}
                  onGenerateAllModules={handleGenerateAllModules}
                  onRetryFailedModules={handleRetryFailedModules}
                  onAssembleBook={handleAssembleBook}
                  onSelectBook={handleSelectBook}
                  onDeleteBook={handleDeleteBook}
                  onUpdateBookStatus={handleUpdateBookStatus}
                  hasApiKey={hasApiKey}
                  view={view}
                  setView={setView}
                  onUpdateBookContent={(bookId, content) =>
                    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, finalBook: content, updatedAt: new Date() } : b))
                  }
                  showListInMain={showListInMain}
                  setShowListInMain={setShowListInMain}
                  isMobile={isMobile}
                  generationStatus={generationStatus}
                  generationStats={generationStats}
                  onPauseGeneration={handlePauseGeneration}
                  onResumeGeneration={handleResumeGeneration}
                  isGenerating={isGenerating}
                  onRetryDecision={handleRetryDecision}
                  availableModels={alternativeModels}
                  theme={theme}
                  onOpenSettings={() => setSettingsOpen(true)}
                  showAlertDialog={showAlertDialog}
                  showToast={showToast}
                  onReadingModeChange={setIsReadingMode}
                  settings={settings}
                  onModelChange={handleModelChange}
                />
              </main>

              <SettingsModal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                settings={settings}
                onSaveSettings={handleSaveSettings}
                theme={theme}
                onToggleTheme={toggleTheme}
                onOpenAPIDocs={() => setShowAPIDocsPage(true)}
                onOpenUsageGuide={() => setShowUsageGuidePage(true)}
                onOpenCompliance={() => setShowCompliancePage(true)}
                showAlertDialog={showAlertDialog}
              />

              {/* Model switch modal */}
              {showModelSwitch && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                  <div className="card-elevated w-full max-w-sm p-6 animate-fade-in-up">
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Switch AI Model</h3>
                      <p className="text-xs text-[var(--text-muted)]">Select an alternative model to continue generation.</p>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      {modelSwitchOptions.map(opt => (
                        <button
                          key={`${opt.provider}-${opt.model}`}
                          onClick={() => handleModelSwitch(opt.provider as ModelProvider, opt.model)}
                          className="w-full p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg hover:border-[var(--brand)]/30 hover:bg-[var(--brand)]/5 transition-all text-left group"
                        >
                          <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">{opt.name}</div>
                          <div className="text-[10px] text-[var(--text-muted)] mt-1 uppercase tracking-widest">{opt.provider} • {opt.model}</div>
                        </button>
                      ))}
                    </div>
                    
                    <button 
                      onClick={() => setShowModelSwitch(false)} 
                      className="btn btn-secondary w-full"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {isInstallable && !isInstalled && (
                <InstallPrompt onInstall={installApp} onDismiss={dismissInstallPrompt} />
              )}

              <CustomAlertDialog isOpen={isAlertDialogOpen} onClose={handleAlertDialogClose} {...alertDialogProps} />

              <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onSuccess={() => {
                  setShowAuthModal(false);
                  setIsAuthTransitioning(false);
                  setShowWelcomeModal(true);
                }}
              />
            </>
          )}
        </>
      )}

      <WelcomeModal isOpen={showWelcomeModal} onClose={() => setShowWelcomeModal(false)} />

      {/* 4. Support Modals (Legal Pages) - Rendered over everything else */}
      {showAboutPage && <AboutPage onClose={() => setShowAboutPage(false)} />}
      {showTermsPage && <TermsPage onClose={() => setShowTermsPage(false)} />}
      {showPrivacyPage && <PrivacyPage onClose={() => setShowPrivacyPage(false)} />}
      {showAPIDocsPage && <APIDocsPage onClose={() => setShowAPIDocsPage(false)} />}
      {showUsageGuidePage && <UsageGuidePage onClose={() => setShowUsageGuidePage(false)} />}
      {showCompliancePage && <CompliancePage onClose={() => setShowCompliancePage(false)} />}
      {showDisclaimerPage && <DisclaimerPage isOpen={showDisclaimerPage} onClose={() => setShowDisclaimerPage(false)} />}
      {showBlogPage && <BlogPage onClose={() => setShowBlogPage(false)} />}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <Analytics />
    </div>
  );

}

function AppWithProviders() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export default AppWithProviders;
