'use client';

import { useState } from 'react';
import BatchProgress from '@/app/components/BatchProgress';

export default function BatchProgressDemo() {
    const [batchId, setBatchId] = useState('');
    const [showProgress, setShowProgress] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (batchId.trim()) {
            setShowProgress(true);
        }
    };

    const handleComplete = () => {
        alert('Batch processing complete! 🎉');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="mx-auto max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        📊 Real-Time Batch Progress Demo
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Test the real-time progress updates with Server-Sent Events
                    </p>
                </div>

                {/* Input Form */}
                <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="batchId" className="block text-sm font-medium text-gray-700">
                                Enter Batch ID
                            </label>
                            <input
                                type="text"
                                id="batchId"
                                value={batchId}
                                onChange={(e) => setBatchId(e.target.value)}
                                placeholder="e.g., cmkvjqbsw0001l12xa6xss4x7"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                            />
                        </div>
                        <button
                            type="submit"
                            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Show Progress
                        </button>
                        {showProgress && (
                            <button
                                type="button"
                                onClick={() => setShowProgress(false)}
                                className="ml-2 rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
                            >
                                Hide Progress
                            </button>
                        )}
                    </form>
                </div>

                {/* Progress Display */}
                {showProgress && batchId && (
                    <BatchProgress batchId={batchId} onComplete={handleComplete} />
                )}

                {/* Instructions */}
                <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
                    <h2 className="mb-3 text-lg font-semibold text-blue-900">
                        How to Use:
                    </h2>
                    <ol className="list-inside list-decimal space-y-2 text-sm text-blue-800">
                        <li>Get a batch ID from your database</li>
                        <li>Enter the batch ID in the input field above</li>
                        <li>Click "Show Progress" to see real-time updates</li>
                        <li>Watch the progress bar update every 2 seconds</li>
                        <li>Get an alert when the batch is complete</li>
                    </ol>

                    <div className="mt-4 rounded bg-blue-100 p-3">
                        <p className="text-xs font-mono text-blue-900">
                            <strong>Example Batch ID:</strong> cmkvjqbsw0001l12xa6xss4x7
                        </p>
                    </div>
                </div>

                {/* Technical Details */}
                <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
                    <h2 className="mb-3 text-lg font-semibold text-gray-900">
                        Technical Details:
                    </h2>
                    <ul className="space-y-2 text-sm text-gray-600">
                        <li>✅ <strong>SSE Endpoint:</strong> /api/batch-progress/[batchId]</li>
                        <li>✅ <strong>Update Interval:</strong> 2 seconds</li>
                        <li>✅ <strong>Auto-reconnect:</strong> On connection loss</li>
                        <li>✅ <strong>Auto-close:</strong> When batch completes</li>
                        <li>✅ <strong>Data:</strong> Total, completed, failed, percentage, status</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
