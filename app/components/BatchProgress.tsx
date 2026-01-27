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

    useEffect(() => {
        if (!batchId) return;

        const eventSource = new EventSource(`/api/batch-progress/${batchId}`);

        eventSource.onopen = () => {
            setIsConnected(true);
            setError(null);
        };

        eventSource.onmessage = (event) => {
            try {
                const data: ProgressData = JSON.parse(event.data);

                if ('error' in data) {
                    setError((data as any).error);
                    eventSource.close();
                    return;
                }

                setProgress(data);

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
            // Don't show error immediately, just close and maybe retry logic could go here
            // But for now let's just mark disconnected
            eventSource.close();
        };

        return () => {
            eventSource.close();
            setIsConnected(false);
        };
    }, [batchId, onComplete]);

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
                        {isProcessing ? 'In Progress' : isFailed ? 'Failed' : 'Completed'}
                    </span>
                    <span className="text-gray-500">{progress.percentage}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                        className={`h-full transition-all duration-500 ease-out ${isComplete ? 'bg-green-500' : isFailed ? 'bg-red-500' : 'bg-blue-600'
                            }`}
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
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            {/* Status Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    {isConnected && isProcessing && (
                        <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">
                        {isComplete ? '✅ Complete!' : isFailed ? '❌ Failed' : '📧 Sending Certificates...'}
                    </h3>
                </div>
                <span className="text-sm text-gray-500">
                    {progress.completed} / {progress.total}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                        className={`h-full transition-all duration-500 ease-out ${isComplete
                            ? 'bg-green-500'
                            : isFailed
                                ? 'bg-red-500'
                                : 'bg-blue-600'
                            }`}
                        style={{ width: `${progress.percentage}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                    <span>{progress.percentage}% complete</span>
                    {progress.failed > 0 && (
                        <span className="text-red-600">{progress.failed} failed</span>
                    )}
                </div>
            </div>

            {/* Status Message */}
            <div className="text-sm text-gray-600">
                {isComplete && (
                    <p className="text-green-600">
                        Successfully sent {progress.completed} certificates!
                    </p>
                )}
                {isFailed && (
                    <p className="text-red-600">
                        Batch processing failed. {progress.completed} sent, {progress.failed} failed.
                    </p>
                )}
                {isProcessing && (
                    <p>
                        Processing batch... {progress.completed} sent, {progress.total - progress.completed} remaining.
                    </p>
                )}
            </div>
        </div>
    );
}
