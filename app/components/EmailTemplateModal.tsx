'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    createdAt: string;
    updatedAt: string;
}

interface EmailTemplateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template?: EmailTemplate | null;
    onSave: () => void;
}

export function EmailTemplateModal({ open, onOpenChange, template, onSave }: EmailTemplateModalProps) {
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (template) {
            setName(template.name);
            setSubject(template.subject);
            setBody(template.body);
        } else {
            setName('');
            setSubject('');
            setBody('');
        }
        setError('');
    }, [template, open]);

    const handleSave = async () => {
        setError('');

        // Validation
        if (!name.trim()) {
            setError('Template name is required');
            return;
        }
        if (!subject.trim()) {
            setError('Email subject is required');
            return;
        }
        if (!body.trim()) {
            setError('Email body is required');
            return;
        }

        setIsSaving(true);

        try {
            const url = template
                ? `/api/email-templates/${template.id}`
                : '/api/email-templates';

            const method = template ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, subject, body }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save template');
            }

            onSave();
            onOpenChange(false);
        } catch (err: any) {
            setError(err.message || 'Failed to save template');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {template ? 'Edit Email Template' : 'Create Email Template'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">Template Name *</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Course Completion Email"
                            maxLength={100}
                        />
                        <p className="text-xs text-gray-500">{name.length}/100 characters</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subject">Email Subject *</Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="e.g., Congratulations on completing {{Course}}!"
                            maxLength={200}
                        />
                        <p className="text-xs text-gray-500">{subject.length}/200 characters</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="body">Email Body *</Label>
                        <Textarea
                            id="body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Dear {{Name}},&#10;&#10;Congratulations on completing the {{Course}} certification!&#10;&#10;Your certificate is attached to this email."
                            rows={10}
                            maxLength={5000}
                            className="font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500">{body.length}/5000 characters</p>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                        <strong>Tip:</strong> Use placeholders like {`{{Name}}`}, {`{{Course}}`}, {`{{Email}}`}, etc.
                        These will be replaced with actual values from your CSV file.
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isSaving ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
