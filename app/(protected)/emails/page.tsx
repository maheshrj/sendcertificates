'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Plus, Edit, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmailTemplateModal } from '@/app/components/EmailTemplateModal';

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    createdAt: string;
    updatedAt: string;
}

export default function EmailTemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
    const [user, setUser] = useState<any>(null);

    // Check authentication
    useEffect(() => {
        fetch('/api/me')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!data) {
                    router.push('/login');
                } else {
                    setUser(data);
                }
            });
    }, [router]);

    // Fetch templates
    const fetchTemplates = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/email-templates');
            if (response.ok) {
                const data = await response.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchTemplates();
        }
    }, [user]);

    const handleCreate = () => {
        setSelectedTemplate(null);
        setIsModalOpen(true);
    };

    const handleEdit = (template: EmailTemplate) => {
        setSelectedTemplate(template);
        setIsModalOpen(true);
    };

    const handleDelete = async (template: EmailTemplate) => {
        if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/email-templates/${template.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchTemplates();
            } else {
                alert('Failed to delete template');
            }
        } catch (error) {
            console.error('Error deleting template:', error);
            alert('Failed to delete template');
        }
    };

    const handleSave = () => {
        fetchTemplates();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Mail className="h-8 w-8 text-blue-600" />
                            Email Templates
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Create and manage reusable email templates for your certificates
                        </p>
                    </div>
                    <Button
                        onClick={handleCreate}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Template
                    </Button>
                </div>

                {/* Templates List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No email templates yet
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Create your first email template to use when sending certificates
                        </p>
                        <Button
                            onClick={handleCreate}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Template
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {templates.map((template) => (
                            <div
                                key={template.id}
                                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {template.name}
                                        </h3>
                                        <div className="space-y-1">
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Subject:</span> {template.subject}
                                            </p>
                                            <p className="text-sm text-gray-600 line-clamp-2">
                                                <span className="font-medium">Body:</span> {template.body}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                                            <Clock className="h-3 w-3" />
                                            Updated {formatDate(template.updatedAt)}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(template)}
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(template)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <EmailTemplateModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                template={selectedTemplate}
                onSave={handleSave}
            />
        </main>
    );
}
