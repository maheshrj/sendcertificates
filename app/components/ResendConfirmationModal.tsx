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
import { Loader2 } from 'lucide-react';

interface ResendConfirmationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    count: number;
    batchName: string;
    isResending: boolean;
}

export function ResendConfirmationModal({
    open,
    onOpenChange,
    onConfirm,
    count,
    batchName,
    isResending
}: ResendConfirmationModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Resend Failed Certificates?</DialogTitle>
                    <DialogDescription className="space-y-3 pt-2">
                        <p>
                            You are about to resend <strong>{count}</strong> certificate{count !== 1 ? 's' : ''} from batch <strong>"{batchName}"</strong>.
                        </p>
                        <p>
                            This will create a new batch with the same template and settings.
                            Only failed emails eligible for resending (Network/System errors) will be included.
                        </p>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isResending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        disabled={isResending}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isResending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Resending...
                            </>
                        ) : (
                            'Confirm Resend'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
