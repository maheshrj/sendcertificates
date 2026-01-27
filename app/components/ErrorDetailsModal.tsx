'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { categorizeError, FailureType } from '@/app/lib/batch-utils';
import { AlertCircle, Ban, CheckCircle2, Wifi, Server, HelpCircle, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ErrorDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    error: string;
    email: string;
    id: string; // Certificate ID
    onRetry: (id: string) => void;
}

export function ErrorDetailsModal({
    open,
    onOpenChange,
    error,
    email,
    id,
    onRetry
}: ErrorDetailsModalProps) {
    const errorInfo = categorizeError(error);
    const [copied, setCopied] = useState(false);

    const copyError = () => {
        navigator.clipboard.writeText(error);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getIcon = () => {
        switch (errorInfo.type) {
            case FailureType.AWS_COMPLIANCE: return <Ban className="h-6 w-6 text-red-600" />;
            case FailureType.VALIDATION: return <AlertCircle className="h-6 w-6 text-orange-500" />;
            case FailureType.NETWORK: return <Wifi className="h-6 w-6 text-yellow-500" />;
            case FailureType.SYSTEM: return <Server className="h-6 w-6 text-yellow-500" />;
            default: return <HelpCircle className="h-6 w-6 text-gray-500" />;
        }
    };

    const getColorClass = () => {
        switch (errorInfo.type) {
            case FailureType.AWS_COMPLIANCE: return 'bg-red-50 border-red-200 text-red-800';
            case FailureType.VALIDATION: return 'bg-orange-50 border-orange-200 text-orange-800';
            case FailureType.NETWORK: case FailureType.SYSTEM: return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            default: return 'bg-gray-50 border-gray-200 text-gray-800';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Delivery Failure Details
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Header Card */}
                    <div className={`p-4 rounded-lg border flex items-start gap-3 ${getColorClass()}`}>
                        <div className="mt-1">{getIcon()}</div>
                        <div>
                            <h3 className="font-medium text-lg">{errorInfo.displayName}</h3>
                            <p className="text-sm opacity-90 mt-1">{errorInfo.description}</p>
                        </div>
                    </div>

                    {/* Email Info */}
                    <div className="grid grid-cols-4 gap-2 text-sm">
                        <span className="font-medium text-gray-500 col-span-1">Recipient:</span>
                        <span className="col-span-3 font-medium select-all">{email}</span>

                        <span className="font-medium text-gray-500 col-span-1">Status:</span>
                        <span className="col-span-3">
                            {errorInfo.canResend ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Resendable
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                    <Ban className="w-3 h-3 mr-1" />
                                    Permanent Failure
                                </span>
                            )}
                        </span>
                    </div>

                    {/* Technical Error */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Technical Error Log
                            </label>
                            <button
                                onClick={copyError}
                                className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors"
                            >
                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <div className="bg-slate-950 text-slate-50 p-3 rounded-md text-xs font-mono break-all max-h-32 overflow-y-auto">
                            {error}
                        </div>
                    </div>
                </div>

                <DialogFooter className="sm:justify-between">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                    {errorInfo.canResend && (
                        <Button
                            type="button"
                            onClick={() => {
                                onRetry(id);
                                onOpenChange(false);
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Retry This Email
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
