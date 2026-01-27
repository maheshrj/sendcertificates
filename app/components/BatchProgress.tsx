'use client';

import { useEffect, useState } from 'react';

interface BatchProgressProps {
    batchId: string;
    onComplete?: () => void;
    variant?: 'full' | 'compact';
    onClick?: () => void;
}

interface ProgressData {
    batchId: string;
    total: number;
    completed: number;
    failed: number;
    percentage: number;
    status: string;
}

export default function BatchProgress({ batchId, onComplete, variant = 'full', onClick }: BatchProgressProps) {
    const [progress, setProgress] = useState<ProgressData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Analytics State
    const [startTime, setStartTime] = useState<number | null>(null);
    const [lastActivity, setLastActivity] = useState<number>(Date.now());
    const [isStalled, setIsStalled] = useState(false);
    const [etr, setEtr] = useState<string | null>(null);
    const [history, setHistory] = useState<Array<{ time: number; completed: number }>>([]);

    // Check for stalled state periodically
    useEffect(() => {
        if (!progress || progress.status === 'completed' || progress.status === 'failed') {
            setIsStalled(false);
            return;
        }

        const stallCheckInterval = setInterval(() => {
            const now = Date.now();
            // detailed stall check: if > 45s since last activity
            if (now - lastActivity > 45000) {
                setIsStalled(true);
            } else {
                setIsStalled(false);
            }
        }, 5000);

        return () => clearInterval(stallCheckInterval);
    }, [progress, lastActivity]);

    useEffect(() => {
        if (!batchId) return;

        const eventSource = new EventSource(`/api/batch-progress/${batchId}`);

        eventSource.onopen = () => {
            setIsConnected(true);
            setError(null);
            setStartTime(Date.now());
            setLastActivity(Date.now());
        };

        eventSource.onmessage = (event) => {
            try {
                const data: ProgressData = JSON.parse(event.data);

                if ('error' in data) {
                    setError((data as any).error);
                    eventSource.close();
                    return;
                }

                setProgress(prev => {
                    // Start timer on first non-zero progress if not already started
                    if (!startTime && data.completed > 0) setStartTime(Date.now());

                    // Detect activity
                    if (!prev || prev.completed !== data.completed || prev.failed !== data.failed) {
                        setLastActivity(Date.now());
                        setIsStalled(false);
                    }
                    return data;
                });

                // Update ETR
                const now = Date.now();
                setHistory(prev => {
                    const newHistory = [...prev, { time: now, completed: data.completed }];
                    // Keep last 30 seconds of history for rolling average
                    const windowStart = now - 30000;
                    return newHistory.filter(h => h.time > windowStart);
                });

                // Call onComplete when batch is done
                if (data.status === 'completed' || data.status === 'completed_with_errors' || data.status === 'failed') {
                    eventSource.close();
                    setIsConnected(false);
                    if (onComplete) {
                        onComplete();
                    }
                }
            } catch (err) {
                console.error('Failed to parse SSE data:', err);
            }
        };

        eventSource.onerror = () => {
            setIsConnected(false);
            eventSource.close();
        };

        return () => {
            eventSource.close();
            setIsConnected(false);
        };
    }, [batchId, onComplete]);

    // Calculate ETR Effect
    useEffect(() => {
        if (!progress || history.length < 2) return;

        const latest = history[history.length - 1];
        const oldest = history[0];

        const timeDiff = (latest.time - oldest.time) / 1000; // seconds
        const completedDiff = latest.completed - oldest.completed;

        if (timeDiff > 5 && completedDiff > 0) {
            const speed = completedDiff / timeDiff; // items per second
            const remaining = progress.total - progress.completed;
            const secondsRemaining = remaining / speed;

            if (secondsRemaining > 60) {
                setEtr(`~${Math.ceil(secondsRemaining / 60)} min remaining`);
            } else {
                setEtr(`~${Math.ceil(secondsRemaining)} sec remaining`);
            }
        }
    }, [history, progress]);


    if (error) {
        if (variant === 'compact') {
            return <div className="text-xs text-red-500">Error loading progress</div>;
        }
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-600">{error}</p>
            </div>
        );
    }

    if (!progress) {
        if (variant === 'compact') {
            return (
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                    <span>Loading...</span>
                </div>
            );
        }
        return (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                    <p className="text-sm text-gray-600">Connecting...</p>
                </div>
            </div>
        );
    }

    const isComplete = progress.status === 'completed' || progress.status === 'completed_with_errors';
    const isFailed = progress.status === 'failed';
    const isProcessing = !isComplete && !isFailed;

    if (variant === 'compact') {
        return (
            <div className="w-full min-w-[140px] cursor-pointer group" onClick={onClick}>
                <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`font-medium ${isProcessing ? 'text-blue-600' : isFailed ? 'text-red-600' : 'text-green-600'}`}>
                        {isStalled ? (
                            <span className="flex items-center text-amber-600">
                                <span className="h-2 w-2 rounded-full bg-amber-500 mr-1 animate-pulse"></span>
                                Stalled
                            </span>
                        ) : isProcessing ? 'In Progress' : isFailed ? 'Failed' : 'Completed'}
                    </span>
                    <span className="text-gray-500">{progress.percentage}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                        className={`h-full transition-all duration-500 ease-out ${isComplete ? 'bg-green-500' : isFailed ? 'bg-red-500' : isStalled ? 'bg-amber-400' : 'bg-blue-600'}`}
                        style={{ width: `${progress.percentage}%` }}
                    ></div>
                </div>
                <div className="text-[10px] text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click for details
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            {/* Status Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    {isConnected && isProcessing && !isStalled && (
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                        </div>
                    )}
                    {isStalled && (
                        <div className="relative flex h-3 w-3">
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            {isComplete ? '✅ Complete!' :
                                isFailed ? '❌ Failed' :
                                    isStalled ? <span className="text-amber-600">⚠️ Stalled</span> :
                                        '📧 Sending Certificates...'}
                        </h3>
                        {isProcessing && etr && !isStalled && (
                            <p className="text-xs text-gray-500 font-medium mt-0.5">Estimated time: {etr}</p>
                        )}
                        {isStalled && (
                            <p className="text-xs text-amber-600 font-medium mt-0.5">No progress for over 45s</p>
                        )}
                    </div>
                </div>
                <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    {progress.completed} / {progress.total}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="h-4 w-full overflow-hidden rounded-full bg-gray-100 border border-gray-200 relative">
                    {/* Background Pattern for 'Active' feel */}
                    {isProcessing && !isStalled && (
                        <div className="absolute inset-0 w-full h-full opacity-30"
                            style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}>
                        </div>
                    )}
                    <div
                        className={`h-full transition-all duration-500 ease-out shadow-sm ${isComplete ? 'bg-green-500' :
                                isFailed ? 'bg-red-500' :
                                    isStalled ? 'bg-amber-500' :
                                        'bg-blue-600'
                            }`}
                        style={{ width: `${progress.percentage}%` }}
                    >
                    </div>
                </div>
                <div className="flex justify-between text-sm text-gray-600 font-medium">
                    <span>{progress.percentage}% complete</span>
                    {progress.failed > 0 && (
                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded">{progress.failed} failed</span>
                    )}
                </div>
            </div>

            {/* Status Message */}
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-100">
                {isComplete && (
                    <p className="text-green-700 flex items-center">
                        <span className="mr-2">🎉</span> Successfully sent {progress.completed} certificates!
                    </p>
                )}
                {isFailed && (
                    <p className="text-red-700 flex items-center">
                        <span className="mr-2">🚨</span> Batch processing failed. {progress.completed} sent, {progress.failed} failed.
                    </p>
                )}
                {isProcessing && (
                    <p className="flex items-center">
                        <span className="mr-2">🚀</span> Processing batch... {progress.completed} sent, {progress.total - progress.completed} remaining.
                    </p>
                )}
            </div>
        </div>
    );
}
