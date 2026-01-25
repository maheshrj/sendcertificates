'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface Batch {
  id: string;
  name: string;
  creatorId: string;
  progress: number;
  createdAt: Date;
}

interface BounceAnalysisProps {
  batches: Batch[];
}

export function BounceAnalysis({ batches = [] }: BounceAnalysisProps) {
  const router = useRouter();
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!selectedBatch) {
      setError('Please select a batch');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Redirect to results page with batch ID
      router.push(`/analytics/bounce-results/${selectedBatch}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze bounces');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Bounce Analysis</h2>
          <p className="mt-1 text-sm text-gray-500">
            Analyze bounced emails for a specific batch
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="batch-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Batch
          </label>
          <select
            id="batch-select"
            className="block w-full rounded-md border-gray-300 shadow-sm p-4 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={selectedBatch}
            onChange={(e) => {
              setSelectedBatch(e.target.value);
              setError(null);
            }}
          >
            <option value="">Select a batch</option>
            {Array.isArray(batches) && batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !selectedBatch}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isLoading || !selectedBatch
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : (
              'Analyze Bounces'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 