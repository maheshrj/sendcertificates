'use client';

import { useState } from 'react';
import { ResendConfirmationModal } from './ResendConfirmationModal';

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

interface BounceData {
  batch: {
    id: string;
    name: string;
    totalInCSV: number;
    totalSent: number;
    totalFailed: number;
    analysisStatus: string;
    createdAt: string;
  };
  failedEmails: {
    technical: Array<{
      id: string;
      email: string;
      reason: string;
      retryCount: number;
      errorDetails: string;
      canResend: boolean;
    }>;
    compliance: Array<{
      email: string;
      reason: string;
      date: string;
    }>;
  };
  certificates: {
    total: number;
    success: number;
    failed: number;
    pending: number;
  };
}

export function BounceAnalysis({ batches = [] }: BounceAnalysisProps) {
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bounceData, setBounceData] = useState<BounceData | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [resending, setResending] = useState(false);

  // Resend Modal State
  const [isResendModalOpen, setIsResendModalOpen] = useState(false);

  const handleAnalyze = async () => {
    if (!selectedBatch) {
      setError('Please select a batch');
      return;
    }

    setIsLoading(true);
    setError(null);
    setBounceData(null);
    setSelectedEmails([]); // Reset selection

    try {
      const res = await fetch(`/api/analytics/bounce-results/${selectedBatch}`);
      if (!res.ok) throw new Error('Failed to fetch bounce data');
      const data = await res.json();
      setBounceData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze bounces');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (!bounceData) return;
    if (selectedEmails.length === bounceData.failedEmails.technical.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(bounceData.failedEmails.technical.map(f => f.email));
    }
  };

  const handleToggleEmail = (email: string) => {
    setSelectedEmails(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const handleResend = () => {
    if (selectedEmails.length === 0) {
      alert('Please select emails to resend');
      return;
    }
    setIsResendModalOpen(true);
  };

  const confirmResend = async () => {
    if (!bounceData || !selectedBatch) return;

    setResending(true);
    try {
      // Map selected emails back to IDs
      // Note: We use emails for selection state but need IDs for API
      const targetIds = bounceData.failedEmails.technical
        .filter(f => selectedEmails.includes(f.email))
        .map(f => f.id);

      if (targetIds.length === 0) {
        throw new Error('No valid certificates selected for resend');
      }

      const res = await fetch(`/api/batches/${selectedBatch}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          failedCertificateIds: targetIds,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to resend');
      }

      const result = await res.json();

      // Close modal
      setIsResendModalOpen(false);

      alert(`✅ Resend Successful!

New Batch: ${result.message}

The certificates are now being generated and will be sent shortly.`);

      setSelectedEmails([]);
      // Refresh the data
      handleAnalyze();
    } catch (error: any) {
      alert(`❌ Resend Failed\n\n${error.message}`);
    } finally {
      setResending(false);
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
              setBounceData(null);
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

      {/* Results Section */}
      {bounceData && (
        <div className="mt-8 space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500">Total in CSV</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">{bounceData.batch.totalInCSV}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500">Successfully Sent</div>
              <div className="mt-2 text-2xl font-bold text-green-600">{bounceData.batch.totalSent}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500">Failed</div>
              <div className="mt-2 text-2xl font-bold text-red-600">{bounceData.batch.totalFailed}</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500">Pending</div>
              <div className="mt-2 text-2xl font-bold text-yellow-600">{bounceData.certificates.pending}</div>
            </div>
          </div>

          {/* Technical Failures */}
          {bounceData.failedEmails.technical.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <div className="px-4 py-3 bg-blue-50 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  🔧 Technical Failures ({bounceData.failedEmails.technical.length}) - Can Resend
                </h3>
              </div>
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={selectedEmails.length === bounceData.failedEmails.technical.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="ml-2 text-gray-700">Select All</span>
                  </label>
                  <button
                    onClick={handleResend}
                    disabled={selectedEmails.length === 0 || resending}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {resending ? 'Resending...' : `Resend Selected (${selectedEmails.length})`}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Select</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Retries</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bounceData.failedEmails.technical.map((failed) => (
                        <tr key={failed.email} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selectedEmails.includes(failed.email)}
                              onChange={() => handleToggleEmail(failed.email)}
                              className="h-4 w-4 text-blue-600 rounded"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{failed.email}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                              {failed.reason}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">{failed.retryCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Compliance Failures */}
          {bounceData.failedEmails.compliance.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <div className="px-4 py-3 bg-red-50 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  🚫 Compliance Failures ({bounceData.failedEmails.compliance.length}) - Cannot Resend
                </h3>
              </div>
              <div className="p-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bounceData.failedEmails.compliance.map((failed, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">{failed.email}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                              {failed.reason}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {new Date(failed.date).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* No Failures */}
          {bounceData.failedEmails.technical.length === 0 && bounceData.failedEmails.compliance.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">✅</div>
              <h3 className="text-lg font-semibold text-gray-900">No Failed Emails</h3>
              <p className="text-sm text-gray-600">All emails in this batch were sent successfully!</p>
            </div>
          )}
        </div>
      )}

      <ResendConfirmationModal
        open={isResendModalOpen}
        onOpenChange={setIsResendModalOpen}
        onConfirm={confirmResend}
        count={selectedEmails.length}
        batchName={bounceData?.batch.name || 'Batch'}
        isResending={resending}
      />
    </div>
  );
}