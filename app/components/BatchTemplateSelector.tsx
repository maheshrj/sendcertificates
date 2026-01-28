
import { useState, useEffect } from 'react';
import { Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface BatchTemplateData {
    id: string;
    name: string;
    templateId?: string | null;
    cc?: string | null;
    bcc?: string | null;
    subject?: string | null;
    message?: string | null;
    emailTemplateId?: string | null;
    emailTemplate?: {
        id: string;
        name: string;
        subject: string;
        body: string;
    } | null;
}

interface BatchTemplateSelectorProps {
    onSelect: (template: BatchTemplateData) => void;
    onSave: (name: string) => Promise<void>;
}

export function BatchTemplateSelector({ onSelect, onSave }: BatchTemplateSelectorProps) {
    const [templates, setTemplates] = useState<BatchTemplateData[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');
    const [issaving, setIsSaving] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchTemplates = async () => {
        try {
            const res = await fetch('/api/batch-templates');
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch (err) {
            console.error('Failed to fetch batch templates', err);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleSelect = (id: string) => {
        setSelectedId(id);
        const tmpl = templates.find(t => t.id === id);
        if (tmpl) {
            onSelect(tmpl);
        }
    };

    const handleSaveSubmit = async () => {
        if (!saveName.trim()) return;
        setIsSaving(true);
        await onSave(saveName); // Wait for parent to save
        setIsSaving(false);
        setIsDialogOpen(false);
        setSaveName('');
        fetchTemplates(); // Refresh list
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            const res = await fetch(`/api/batch-templates/${id}`, { method: 'DELETE' }); // We need to create this route or handle it
            if (res.ok) {
                setTemplates(prev => prev.filter(t => t.id !== id));
                if (selectedId === id) setSelectedId('');
            }
        } catch (err) {
            console.error('Failed to delete', err);
        }
    };

    return (
        <div className="flex items-end gap-2 mb-6">
            <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Load Saved Configuration (Optional)
                </label>
                <select
                    value={selectedId}
                    onChange={(e) => handleSelect(e.target.value)}
                    className="w-full p-2 border border-gray-300 text-black rounded focus:outline-blue-500 bg-white"
                >
                    <option value="">-- Start Fresh --</option>
                    {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.name}
                        </option>
                    ))}
                </select>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="mb-[1px]">
                        <Save className="w-4 h-4 mr-2" />
                        Save Current as Template
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Batch Configuration</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="templateName">Template Name</Label>
                        <Input
                            id="templateName"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            placeholder="e.g. Monthly Newsletter"
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveSubmit} disabled={issaving || !saveName.trim()}>
                            {issaving ? 'Saving...' : 'Save Template'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
