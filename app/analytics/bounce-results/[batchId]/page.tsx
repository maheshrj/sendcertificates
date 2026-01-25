'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

export default function BounceResultsPage({ params }: { params: { batchId: string } }) {
    const router = useRouter();
    const [data, setData] = useState<BounceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        fetchBounceData();
    }, [params.batchId]);

    const fetchBounceData = async () => {
        try {
            const res = await fetch(`/api/analytics/bounce-results/${params.batchId}`);
            if (!res.ok) throw new Error('Failed to fetch data');
            const result = await res.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching bounce data:', error);
            alert('Failed to load bounce analysis data');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = () => {
        if (!data) return;
        if (selectedEmails.length === data.failedEmails.technical.length) {
            setSelectedEmails([]);
        } else {
            setSelectedEmails(data.failedEmails.technical.map(f => f.email));
        }
    };

    const handleToggleEmail = (email: string) => {
        setSelectedEmails(prev =>
            prev.includes(email)
                ? prev.filter(e => e !== email)
                : [...prev, email]
        );
    };

    const handleResend = async () => {
        if (selectedEmails.length === 0) {
            alert('Please select emails to resend');
            return;
        }

        if (!confirm(`Resend certificates to ${selectedEmails.length} email(s)?`)) {
            return;
        }

        setResending(true);
        try {
            const res = await fetch('/api/analytics/resend-failed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalBatchId: params.batchId,
                    emails: selectedEmails,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to resend');
            }

            const result = await res.json();
            alert(`✅ Resend initiated!\nNew batch: ${result.newBatchName}\nEmails: ${result.emailsToResend}`);
            router.push('/analytics');
        } catch (error: any) {
            console.error('Error resending:', error);
            alert(`Failed to resend: ${error.message}`);
        } finally {
            setResending(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading bounce analysis...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600">Failed to load data</p>
                    <button
                        onClick={() => router.push('/analytics')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Back to Analytics
                    </button>
                </div>
            </div>
        );
    }

    const { batch, failedEmails, certificates } = data;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push('/analytics')}
                        className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
                    >
                        ← Back to Analytics
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Bounce Analysis Results</h1>
                    <p className="mt-2 text-gray-600">
                        Batch: <span className="font-semibold">{batch.name}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                        Created: {new Date(batch.createdAt).toLocaleString()}
                    </p>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm font-medium text-gray-500">Total in CSV</div>
                        <div className="mt-2 text-3xl font-bold text-gray-900">{batch.totalInCSV}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm font-medium text-gray-500">Successfully Sent</div>
                        <div className="mt-2 text-3xl font-bold text-green-600">{batch.totalSent}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm font-medium text-gray-500">Failed</div>
                        <div className="mt-2 text-3xl font-bold text-red-600">{batch.totalFailed}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm font-medium text-gray-500">Pending</div>
                        <div className="mt-2 text-3xl font-bold text-yellow-600">{certificates.pending}</div>
                    </div>
                </div>

                {/* Technical Failures */}
                {failedEmails.technical.length > 0 && (
                    <div className="bg-white rounded-lg shadow mb-8">
                        <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                            <h2 className="text-xl font-semibold text-gray-900">
                                🔧 Technical Failures ({failedEmails.technical.length}) - Can Resend
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                These emails failed due to technical issues and can be resent
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedEmails.length === failedEmails.technical.length}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 text-blue-600 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Select All</span>
                                </label>
                                <button
                                    onClick={handleResend}
                                    disabled={selectedEmails.length === 0 || resending}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {resending ? 'Resending...' : `Resend Selected (${selectedEmails.length})`}
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Select</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retries</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {failedEmails.technical.map((failed) => (
                                            <tr key={failed.email} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedEmails.includes(failed.email)}
                                                        onChange={() => handleToggleEmail(failed.email)}
                                                        className="h-4 w-4 text-blue-600 rounded"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{failed.email}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                                        {failed.reason}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{failed.retryCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Compliance Failures */}
                {failedEmails.compliance.length > 0 && (
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
                            <h2 className="text-xl font-semibold text-gray-900">
                                🚫 AWS Compliance Failures ({failedEmails.compliance.length}) - Cannot Resend
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                These emails are blocked due to bounces, complaints, or unsubscribes
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {failedEmails.compliance.map((failed, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm text-gray-900">{failed.email}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                                                        {failed.reason}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
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
                {failedEmails.technical.length === 0 && failedEmails.compliance.length === 0 && (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <div className="text-6xl mb-4">✅</div>
                        <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Failed Emails</h3>
                        <p className="text-gray-600">All emails in this batch were sent successfully!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
