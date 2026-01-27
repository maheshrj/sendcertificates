'use client';

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Template } from '@/app/types';
import { useState, useEffect } from 'react';


interface EmailPreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template: Template;
    sampleData: Record<string, string>;
    emailSubject?: string;
    emailBody?: string;
    onConfirm: () => void;
}

export function EmailPreviewModal({
    open,
    onOpenChange,
    template,
    sampleData,
    emailSubject,
    emailBody,
    onConfirm
}: EmailPreviewModalProps) {
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [loadingImage, setLoadingImage] = useState(false);
    const [activeTab, setActiveTab] = useState<'certificate' | 'email'>('certificate');

    // Generate certificate preview
    useEffect(() => {
        if (open && template && sampleData && !previewImage) {
            generatePreview();
        }
    }, [open, template, sampleData]);

    const generatePreview = async () => {
        setLoadingImage(true);
        try {
            // Map sample data to placeholders
            const placeholders = template.placeholders.map(p => ({
                ...p,
                previewValue: sampleData[p.name] || `{{${p.name}}}`
            }));

            const response = await fetch('/api/templates/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: template.imageUrl,
                    width: template.width || 800, // Default fallback
                    height: template.height || 600,
                    placeholders,
                    signatures: template.signatures,
                    qrPlaceholders: template.qrPlaceholders
                })
            });

            if (response.ok) {
                const data = await response.json();
                setPreviewImage(data.previewUrl);
            } else {
                console.error('Failed to generate preview image');
            }
        } catch (error) {
            console.error('Error generating preview:', error);
        } finally {
            setLoadingImage(false);
        }
    };

    // Helper to replace variables in text
    const substituteVariables = (text: string) => {
        let result = text;
        Object.entries(sampleData).forEach(([key, value]) => {
            // Replace {{Key}} and {{key}} case-insensitively potentially, but usually accurate case is best
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
        return result;
    };

    const subjectPreview = substituteVariables(emailSubject || '(No Subject)');
    const bodyPreview = substituteVariables(emailBody || '(No Body)');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Preview Batch</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-2">
                    <div className="flex space-x-4 border-b mb-4">
                        <button
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'certificate'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setActiveTab('certificate')}
                        >
                            Certificate Preview
                        </button>
                        <button
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'email'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setActiveTab('email')}
                        >
                            Email Preview
                        </button>
                    </div>

                    <div className="min-h-[300px]">
                        {activeTab === 'certificate' ? (
                            <div className="flex justify-center items-center bg-gray-100 rounded-lg p-4 min-h-[300px]">
                                {loadingImage ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        <p className="text-sm text-gray-500">Generating preview...</p>
                                    </div>
                                ) : previewImage ? (
                                    <img
                                        src={previewImage}
                                        alt="Certificate Preview"
                                        className="max-w-full h-auto shadow-md rounded border"
                                    />
                                ) : (
                                    <div className="text-gray-400">Failed to load preview</div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Subject</label>
                                    <div className="p-3 bg-gray-50 rounded border text-sm font-medium text-gray-900">
                                        {subjectPreview}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Body</label>
                                    <div className="p-4 bg-white rounded border border-gray-200 text-sm whitespace-pre-wrap min-h-[200px] shadow-sm">
                                        {bodyPreview}
                                    </div>
                                </div>

                                <div className="bg-blue-50 p-3 rounded text-xs text-blue-700">
                                    <span className="font-semibold">Note:</span> This preview uses data from the first row of your CSV file.
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex justify-between sm:justify-between items-center pt-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                    >
                        Back to Edit
                    </Button>
                    <Button onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">
                        Generate Certificates
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
