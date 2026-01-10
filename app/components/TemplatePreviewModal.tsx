import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Template } from '@/app/types';

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: Partial<Template>;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  isOpen,
  onClose,
  template,
}) => {
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initialData: Record<string, string> = {};
      template.placeholders?.forEach((placeholder) => {
        initialData[placeholder.id] = '';
      });
      setPreviewData(initialData);
      setPreviewUrl(null);
    }
  }, [isOpen, template.placeholders]);

  const handleInputChange = (placeholderId: string, value: string) => {
    setPreviewData((prev) => ({
      ...prev,
      [placeholderId]: value
    }));
  };

  const generatePreview = async () => {
    setIsGenerating(true);
    try {
      const previewTemplateData: Template = {
        ...template as Template,
        imageUrl: template.imageUrl || '/image.png',
        width: 800,
        height: 600,
        placeholders: template.placeholders?.map((placeholder) => ({
          ...placeholder,
          previewValue: previewData[placeholder.id] || placeholder.name
        })) || []
      };

      const response = await fetch('/api/templates/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(previewTemplateData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const { previewUrl } = await response.json();
      setPreviewUrl(previewUrl);
    } catch (error) {
      alert('Error generating preview');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPreview = () => {
    if (!previewUrl) {
      alert('No preview available to download');
      return;
    }

    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = 'template-preview.png';
    link.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Preview Template</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Enter Preview Data</h3>
            {template.placeholders?.map((placeholder) => (
              <div key={placeholder.id} className="space-y-2">
                <Label htmlFor={placeholder.id}>{placeholder.name}</Label>
                <Input
                  id={placeholder.id}
                  placeholder={`Enter ${placeholder.name}`}
                  value={previewData[placeholder.id] || ''}
                  onChange={(e) => handleInputChange(placeholder.id, e.target.value)}
                />
              </div>
            ))}
            <Button 
              onClick={generatePreview}
              disabled={isGenerating}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              {isGenerating ? 'Generating Preview...' : 'Generate Preview'}
            </Button>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4">Preview</h3>
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Generated Template Preview" 
                className="max-w-full h-auto"
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                <p className="text-gray-500">No preview available</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={downloadPreview} disabled={!previewUrl} className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'>
            Download Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplatePreviewModal;
