'use client';

import { useState, useEffect } from 'react';

interface RateLimitStatus {
    limits: {
        perSecond: number;
        perDay: number;
    };
    usage: {
        perSecond: number;
        perDay: number;
    };
    remaining: {
        perSecond: number;
        perDay: number;
    };
}

export default function RateLimitStatus() {
    const [status, setStatus] = useState<RateLimitStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = async () => {
        try {
            const response = await fetch('/api/user/rate-limit-status');
            if (!response.ok) {
                throw new Error('Failed to fetch rate limit status');
            }
            const data = await response.json();
            setStatus(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch rate limit status:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="bg-white shadow-md rounded p-6 mt-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-24 bg-gray-200 rounded"></div>
                        <div className="h-24 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white shadow-md rounded p-6 mt-6">
                <h3 className="text-lg font-semibold mb-4 text-red-600">Error Loading Rate Limits</h3>
                <p className="text-sm text-gray-600">{error}</p>
            </div>
        );
    }

    if (!status) return null;

    const getPercentage = (used: number, limit: number) => {
        return Math.min((used / limit) * 100, 100);
    };

    const getColorClass = (percentage: number) => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 70) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="bg-white shadow-md rounded p-6 mt-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Email Rate Limit Status</h3>
                <button
                    onClick={fetchStatus}
                    className="text-sm text-blue-600 hover:text-blue-800"
                >
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Per Second Limit */}
                <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Per Second</h4>
                    <div className="flex items-baseline mb-2">
                        <span className="text-3xl font-bold">{status.usage.perSecond}</span>
                        <span className="text-gray-500 ml-2">/ {status.limits.perSecond}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                            className={`h-2 rounded-full transition-all duration-300 ${getColorClass(
                                getPercentage(status.usage.perSecond, status.limits.perSecond)
                            )}`}
                            style={{
                                width: `${getPercentage(status.usage.perSecond, status.limits.perSecond)}%`,
                            }}
                        ></div>
                    </div>
                    <p className="text-sm text-gray-500">
                        {status.remaining.perSecond} emails remaining this second
                    </p>
                </div>

                {/* Per Day Limit */}
                <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Per Day</h4>
                    <div className="flex items-baseline mb-2">
                        <span className="text-3xl font-bold">{status.usage.perDay}</span>
                        <span className="text-gray-500 ml-2">/ {status.limits.perDay}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                            className={`h-2 rounded-full transition-all duration-300 ${getColorClass(
                                getPercentage(status.usage.perDay, status.limits.perDay)
                            )}`}
                            style={{
                                width: `${getPercentage(status.usage.perDay, status.limits.perDay)}%`,
                            }}
                        ></div>
                    </div>
                    <p className="text-sm text-gray-500">
                        {status.remaining.perDay.toLocaleString()} emails remaining today
                    </p>
                </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                    <strong>Note:</strong> Rate limits reset automatically. Per-second limits reset every
                    second, and daily limits reset at midnight UTC.
                </p>
            </div>
        </div>
    );
}
