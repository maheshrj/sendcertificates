'use client';

import { useState, useEffect } from 'react';
import { Trash2, Calendar, Clock } from 'lucide-react';

interface ScheduledBatch {
    id: string;
    name: string;
    templateName: string;
    scheduledAt: string;
    status: string;
    createdAt: string;
}

export function ScheduledBatchesList() {
    const [scheduledBatches, setScheduledBatches] = useState<ScheduledBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchScheduledBatches = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/scheduled-batches');
            if (!response.ok) throw new Error('Failed to fetch scheduled batches');
            const data = await response.json();
            setScheduledBatches(data.scheduledBatches || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load scheduled batches');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScheduledBatches();
    }, []);

    const handleCancel = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to cancel the scheduled batch "${name}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/scheduled-batches/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to cancel batch');
            }

            // Refresh the list
            await fetchScheduledBatches();
            alert('Scheduled batch cancelled successfully');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to cancel batch');
        }
    };

    if (loading) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Scheduled Batches</h2>
                <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Scheduled Batches</h2>
                <div className="text-red-600">{error}</div>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Scheduled Batches</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Upcoming certificate batches scheduled for future delivery
                    </p>
                </div>
                <button
                    onClick={fetchScheduledBatches}
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                    Refresh
                </button>
            </div>

            {scheduledBatches.length === 0 ? (
                <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduled batches</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Schedule a batch from the Generate page to see it here.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Batch Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Template
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Scheduled For
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {scheduledBatches.map((batch) => {
                                const scheduledDate = new Date(batch.scheduledAt);
                                const now = new Date();
                                const isPast = scheduledDate < now;

                                return (
                                    <tr key={batch.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{batch.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{batch.templateName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-900">
                                                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                                {scheduledDate.toLocaleString()}
                                            </div>
                                            {isPast && batch.status === 'pending' && (
                                                <div className="text-xs text-orange-600 mt-1">
                                                    Processing soon...
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${batch.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : batch.status === 'processing'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {batch.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {batch.status === 'pending' && (
                                                <button
                                                    onClick={() => handleCancel(batch.id, batch.name)}
                                                    className="text-red-600 hover:text-red-900 flex items-center"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                    Cancel
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
