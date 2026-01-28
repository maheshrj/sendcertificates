'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Template } from '@/app/types';
import { Pencil, Trash2, Eye, Wand2 } from 'lucide-react';
import TemplatePreviewModal from '@/app/components/TemplatePreviewModal';

export default function TemplatesPage() {
  const [user, setUser] = useState<any>(null);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const router = useRouter();
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);


  function TemplatesPageSkeleton() {
    return (
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 animate-pulse">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div className="h-6 w-32 bg-gray-300 rounded"></div>
            <div className="h-10 w-24 bg-blue-300 rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded shadow space-y-2">
                <div className="w-full h-48 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                <div className="flex space-x-2 mt-4">
                  <div className="h-8 w-16 bg-blue-300 rounded"></div>
                  <div className="h-8 w-16 bg-red-300 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

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
  }, []);

  useEffect(() => {
    if (user) {
      fetch('/api/templates')
        .then((res) => res.json())
        .then(setTemplates)
        .catch((err) => {
          console.error('Error fetching templates:', err);
          alert('Failed to load templates');
        });
    }
  }, [user]);

  if (!user || templates === null) {
    return <TemplatesPageSkeleton />;
  }

  const handleDelete = async (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setTemplates((prev) => (prev ? prev.filter((t) => t.id !== templateId) : []));
      } else {
        alert('Failed to delete template');
      }
    }
  };

  const handleUseTemplate = (templateId: string) => {
    router.push(`/generate?templateId=${templateId}`);
  };

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">My Templates</h1>
          <Link href="/templates/new">
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              New Template
            </button>
          </Link>
        </div>
        {templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="bg-white p-4 rounded shadow">
                <img
                  src={template.imageUrl}
                  alt={template.name}
                  className="w-full h-48 object-contain rounded bg-gray-50"
                />
                <h2 className="text-lg text-gray-600 font-semibold mt-2">{template.name}</h2>
                <p className="text-gray-600">
                  Placeholders: {template.placeholders.length}
                </p>
                <div className="mt-4 flex space-x-2">
                  <Link href={`/templates/${template.id}/edit`}>
                    <button className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors">
                      <Pencil size={20} />
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="p-2 text-green-500 hover:bg-green-50 rounded-full transition-colors"
                  >
                    <Eye size={20} />
                  </button>
                  <button
                    onClick={() => handleUseTemplate(template.id)}
                    className="p-2 text-purple-500 hover:bg-purple-50 rounded-full transition-colors"
                  >
                    <Wand2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-700">You have no templates yet.</p>
        )}
      </div>
      {previewTemplate && (
        <TemplatePreviewModal
          isOpen={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          template={previewTemplate}
        />
      )}
    </main>
  );
}
