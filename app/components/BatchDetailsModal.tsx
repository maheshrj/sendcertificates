'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { ResendConfirmationModal } from './ResendConfirmationModal';
import { ErrorDetailsModal } from './ErrorDetailsModal';
import { BatchAnalyticsReport } from './reports/BatchAnalyticsReport';
import { generatePDF } from '@/app/lib/pdf-generator';
import { FileText, Download } from 'lucide-react';

interface BatchDetailsModalProps {
    batchId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface BatchDetails {
    batch: {
        id: string;
        name: string;
        progress: number;
        createdAt: string;
        templateId: string;
    };
    stats: {
        total: number;
        completed: number;
        failed: number;
        invalid: number;
        resendable: number;
        excluded: number;
    };
    completed: Array<{
        id: string;
        name: string;
        email: string;
        sentAt: string;
    }>;
    failed: Array<{
        id: string;
        name: string;
        email: string;
        error: string;
        errorType: string;
        errorDisplayName: string;
        errorDescription: string;
        canResend: boolean;
        failedAt: string;
    }>;
    invalid: Array<{
        id: string;
        email: string;
        reason: string;
        createdAt: string;
    }>;
}

export function BatchDetailsModal({ batchId, open, onOpenChange }: BatchDetailsModalProps) {
    const [activeTab, setActiveTab] = useState<'completed' | 'failed' | 'invalid'>('failed');
    const [data, setData] = useState<BatchDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Resend State
    const [isResendModalOpen, setIsResendModalOpen] = useState(false);
    const [pendingResendIds, setPendingResendIds] = useState<string[]>([]);
    const [isResending, setIsResending] = useState(false);

    // Error Details State
    const [selectedErrorItem, setSelectedErrorItem] = useState<BatchDetails['failed'][0] | null>(null);

    // Export State
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (open && batchId) {
            fetchBatchDetails();
        } else {
            setData(null); // Reset on close
        }
    }, [open, batchId]);

    const fetchBatchDetails = async () => {
        if (!batchId) return;

        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`/api/batches/${batchId}/details`);

            if (!res.ok) {
                throw new Error('Failed to fetch batch details');
            }

            const result = await res.json();
            setData(result);

            // Determine default tab
            if (result.stats.failed > 0) {
                setActiveTab('failed');
            } else if (result.stats.invalid > 0) {
                setActiveTab('invalid');
            } else {
                setActiveTab('completed');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = (failedCertIds: string[]) => {
        setPendingResendIds(failedCertIds);
        setIsResendModalOpen(true);
    };

    const handleRetrySingle = (id: string) => {
        // Close error modal if open
        setSelectedErrorItem(null);
        // Open resend confirmation for specific ID
        handleResend([id]);
    };

    const confirmResend = async () => {
        if (!batchId) return;

        try {
            setIsResending(true);
            const response = await fetch(`/api/batches/${batchId}/resend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    failedCertificateIds: pendingResendIds
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to resend certificates');
            }

            const result = await response.json();

            // Success: Close both modals and maybe show a success message?
            // For now, simpler is to close and reset
            setIsResendModalOpen(false);
            onOpenChange(false);

            // Ideally we would trigger a refresh of the parent list here using a callback
            // But just closing will force user to see the new batch in the list anyway (if it auto-refreshes or they reload)

        } catch (err: any) {
            console.error('Resend failed:', err);
            // Optionally show error in the modal, but alert for now is consistent with existing style
            alert(`Resend failed: ${err.message}`);
        } finally {
            setIsResending(false);
        }
    };

    const handleExportPDF = async () => {
        if (!data) return;
        setIsExporting(true);
        try {
            await generatePDF({
                filename: `${data.batch.name.replace(/\s+/g, '_')}_Report.pdf`,
                elementId: 'batch-analytics-report'
            });
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to generate PDF report');
        } finally {
            setIsExporting(false);
        }
    };

    if (!open) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col h-full p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="flex justify-between items-center">
                            <span className="text-xl font-bold">
                                {loading ? 'Loading Batch...' : data?.batch.name || 'Batch Details'}
                            </span>
                            <div className="flex items-center gap-2">
                                {data && (
                                    <>
                                        <span className="text-sm font-normal text-muted-foreground mr-2">
                                            {new Date(data.batch.createdAt).toLocaleString()}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleExportPDF}
                                            disabled={isExporting}
                                            className="h-8"
                                        >
                                            {isExporting ? (
                                                <div className="animate-spin mr-2 h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                            ) : (
                                                <FileText className="w-4 h-4 mr-2" />
                                            )}
                                            Export PDF
                                        </Button>
                                    </>
                                )}
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 pt-0">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : error ? (
                            <div className="bg-red-50 text-red-600 p-4 rounded-md">
                                {error}
                            </div>
                        ) : data ? (
                            <div className="space-y-6">
                                {/* Stats Overview */}
                                <div className="grid grid-cols-5 gap-4">
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <div className="text-xs text-blue-600 font-medium uppercase tracking-wider">Total</div>
                                        <div className="text-2xl font-bold text-blue-700">{data.stats.total}</div>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                        <div className="text-xs text-green-600 font-medium uppercase tracking-wider">Completed</div>
                                        <div className="text-2xl font-bold text-green-700">{data.stats.completed}</div>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                                        <div className="text-xs text-red-600 font-medium uppercase tracking-wider">Failed</div>
                                        <div className="text-2xl font-bold text-red-700">{data.stats.failed}</div>
                                    </div>
                                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                                        <div className="text-xs text-orange-600 font-medium uppercase tracking-wider">Invalid</div>
                                        <div className="text-2xl font-bold text-orange-700">{data.stats.invalid}</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <div className="text-xs text-gray-600 font-medium uppercase tracking-wider">Resendable</div>
                                        <div className="text-2xl font-bold text-gray-700">{data.stats.resendable}</div>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex border-b border-gray-200">
                                    <button
                                        onClick={() => setActiveTab('failed')}
                                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'failed'
                                            ? 'border-red-500 text-red-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        Failed ({data.stats.failed})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('invalid')}
                                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'invalid'
                                            ? 'border-orange-500 text-orange-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        Invalid ({data.stats.invalid})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('completed')}
                                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'completed'
                                            ? 'border-green-500 text-green-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        Completed ({data.stats.completed})
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="min-h-[200px]">
                                    {activeTab === 'completed' && <CompletedTable certificates={data.completed} />}
                                    {activeTab === 'failed' && (
                                        <FailedTable
                                            certificates={data.failed}
                                            onResend={handleResend}
                                            onViewError={setSelectedErrorItem}
                                        />
                                    )}
                                    {activeTab === 'invalid' && <InvalidTable emails={data.invalid} />}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>

            <ResendConfirmationModal
                open={isResendModalOpen}
                onOpenChange={setIsResendModalOpen}
                onConfirm={confirmResend}
                count={pendingResendIds.length > 0 ? pendingResendIds.length : (data?.stats.resendable || 0)}
                batchName={data?.batch.name || 'Batch'}
                isResending={isResending}
            />

            {selectedErrorItem && (
                <ErrorDetailsModal
                    open={!!selectedErrorItem}
                    onOpenChange={(open) => !open && setSelectedErrorItem(null)}
                    error={selectedErrorItem.error}
                    email={selectedErrorItem.email}
                    id={selectedErrorItem.id}
                    onRetry={handleRetrySingle}
                />
            )}

            {data && (
                <BatchAnalyticsReport
                    batchName={data.batch.name}
                    createdAt={data.batch.createdAt}
                    stats={{
                        total: data.stats.total,
                        success: data.stats.completed,
                        failed: data.stats.failed,
                        pending: data.stats.total - (data.stats.completed + data.stats.failed + data.stats.invalid)
                    }}
                    failedEmails={{
                        technical: data.failed.filter(f => f.canResend).map(f => ({
                            email: f.email,
                            reason: f.error,
                            retryCount: 0 // BatchDetails doesn't have retryCount yet, would need API update or ignore
                        })),
                        compliance: data.failed.filter(f => !f.canResend).map(f => ({
                            email: f.email,
                            reason: f.error
                        }))
                    }}
                />
            )}
        </>
    );
}

function CompletedTable({ certificates }: { certificates: any[] }) {
    if (certificates.length === 0) {
        return <div className="text-center py-8 text-gray-500">No completed certificates</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                    <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Sent At</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Download</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {certificates.map((cert) => (
                        <tr key={cert.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{cert.name}</td>
                            <td className="px-4 py-3 text-gray-600">{cert.email}</td>
                            <td className="px-4 py-3 text-gray-500">
                                {new Date(cert.sentAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Sent
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                {cert.downloadUrl ? (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(cert.downloadUrl, '_blank')}
                                        className="h-8 text-xs"
                                    >
                                        <Download className="w-3 h-3 mr-1" />
                                        Download
                                    </Button>
                                ) : (
                                    <span className="text-xs text-gray-400">N/A</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function FailedTable({ certificates, onResend, onViewError }: {
    certificates: BatchDetails['failed'];
    onResend: (ids: string[]) => void;
    onViewError: (item: BatchDetails['failed'][0]) => void;
}) {
    if (certificates.length === 0) {
        return <div className="text-center py-8 text-gray-500">No failed certificates</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                    <tr>
                        <th className="px-4 py-3">Recipient</th>
                        <th className="px-4 py-3">Error</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {certificates.map((cert) => (
                        <tr key={cert.id} className="hover:bg-gray-50 group">
                            <td className="px-4 py-3 text-gray-600 font-medium">{cert.email}</td>
                            <td className="px-4 py-3">
                                <button
                                    className="text-left w-full group-hover:bg-red-50 p-1.5 -ml-1.5 rounded transition-colors"
                                    onClick={() => onViewError(cert)}
                                >
                                    <div className="max-w-xs truncate text-red-600 font-medium hover:text-red-700 underline-offset-2 hover:underline" title={cert.error}>
                                        {cert.error}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                                        Click to view details
                                    </div>
                                </button>
                            </td>
                            <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${cert.canResend
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                    }`}>
                                    {cert.errorDisplayName}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                {cert.canResend ? (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onResend([cert.id])}
                                        className="h-8 text-xs bg-white hover:bg-gray-50"
                                    >
                                        Resend
                                    </Button>
                                ) : (
                                    <span className="text-xs text-gray-400 italic">Cannot resend</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function InvalidTable({ emails }: { emails: any[] }) {
    if (emails.length === 0) {
        return <div className="text-center py-8 text-gray-500">No invalid emails</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                    <tr>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3">Date</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {emails.map((email) => (
                        <tr key={email.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{email.email}</td>
                            <td className="px-4 py-3 text-orange-600">{email.reason}</td>
                            <td className="px-4 py-3 text-gray-500">
                                {new Date(email.createdAt).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
