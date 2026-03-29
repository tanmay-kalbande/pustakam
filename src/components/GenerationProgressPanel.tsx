import React from 'react';
import { Loader2, Check, X, XCircle, Brain } from 'lucide-react';

interface GenerationStatus {
    currentModule?: {
        id: string;
        title: string;
        attempt: number;
        progress: number;
        generatedText?: string;
    };
    totalProgress: number;
    status: 'idle' | 'generating' | 'completed' | 'error';
    logMessage?: string;
    totalWordsGenerated?: number;
}

interface GenerationStats {
    startTime: Date;
    totalModules: number;
    completedModules: number;
    failedModules: number;
    averageTimePerModule: number;
    estimatedTimeRemaining: number;
    totalWordsGenerated: number;
    wordsPerMinute: number;
}

interface GenerationProgressPanelProps {
    generationStatus: GenerationStatus;
    stats: GenerationStats;
    onCancel?: () => void;
}

export function GenerationProgressPanel({ generationStatus, stats, onCancel }: GenerationProgressPanelProps) {
    const getStatusInfo = () => {
        switch (generationStatus.status) {
            case 'generating': 
                return { 
                    icon: <Loader2 className="w-4 h-4 text-white/70 animate-spin" />, 
                    title: 'Writing chapters...' 
                };
            case 'completed': 
                return { 
                    icon: <Check className="w-4 h-4 text-white/70" />, 
                    title: 'Book complete' 
                };
            case 'error': 
                return { 
                    icon: <X className="w-4 h-4 text-red-400" />, 
                    title: 'Generation error' 
                };
            default: 
                return { 
                    icon: <Brain className="w-4 h-4 text-white/40" />, 
                    title: 'Getting ready...' 
                };
        }
    };

    const { icon, title } = getStatusInfo();
    const overallProgress = (stats.completedModules / (stats.totalModules || 1)) * 100;

    return (
        <div className="fixed bottom-6 right-6 w-[360px] max-w-[calc(100vw-3rem)] rounded-xl border border-white/10 bg-[#111] shadow-2xl z-50">
            <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {icon}
                        <h3 className="text-sm font-medium text-white/90">{title}</h3>
                    </div>
                    {onCancel && generationStatus.status === 'generating' && (
                        <button 
                            onClick={onCancel} 
                            className="text-white/40 hover:text-white/80 transition-colors" 
                            title="Cancel"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    )}
                </div>
                
                {generationStatus.currentModule && generationStatus.status === 'generating' && (
                    <div className="text-xs text-white/50 truncate pr-4">
                        Current: {generationStatus.currentModule.title}
                    </div>
                )}
                
                <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden mt-1">
                    <div 
                        className="h-full bg-white/40 rounded-full transition-all duration-300" 
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
                
                <div className="flex items-center justify-between text-[10px] text-white/40 uppercase tracking-widest font-mono mt-1">
                    <span>
                        {stats.completedModules} / {stats.totalModules} Chapters
                    </span>
                    <span>
                        {stats.totalWordsGenerated.toLocaleString()} Words
                    </span>
                </div>
            </div>
        </div>
    );
}

export function useGenerationStats(
    totalModules: number,
    completedModules: number,
    failedModules: number,
    startTime: Date,
    totalWordsGenerated: number
): GenerationStats {
    const [stats, setStats] = React.useState<GenerationStats>({
        startTime, totalModules, completedModules, failedModules,
        averageTimePerModule: 0, estimatedTimeRemaining: 0,
        totalWordsGenerated, wordsPerMinute: 0
    });

    React.useEffect(() => {
        const elapsedSeconds = (Date.now() - startTime.getTime()) / 1000;
        const avgTime = completedModules > 0 ? elapsedSeconds / completedModules : 0;
        const remaining = totalModules - completedModules;
        const estimatedRemaining = avgTime * remaining;
        const wpm = elapsedSeconds > 0 ? (totalWordsGenerated / elapsedSeconds) * 60 : 0;

        setStats({
            startTime, totalModules, completedModules, failedModules,
            averageTimePerModule: avgTime,
            estimatedTimeRemaining: estimatedRemaining,
            totalWordsGenerated,
            wordsPerMinute: wpm
        });
    }, [totalModules, completedModules, failedModules, startTime, totalWordsGenerated]);

    return stats;
}
