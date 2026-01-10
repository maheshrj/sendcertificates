'use client';

import { useState, useEffect } from 'react';
import { FeedbackDialog } from '@/app/components/FeedbackDialog';
import Image from 'next/image';
import { MessageEditor } from './MessageEditor'

export default function EmailConfigForm() {
  const [emailConfig, setEmailConfig] = useState({ 
    defaultSubject: '', 
    defaultMessage: '',
    logoUrl: '',
    emailHeading: '',
    supportEmail: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [variablePreview, setVariablePreview] = useState<string>('');
  const [isFetchingConfig, setIsFetchingConfig] = useState(true); 
  const [subjectPreview, setSubjectPreview] = useState<string>('');
  const [subjectHtml, setSubjectHtml] = useState('');

  // Skeleton loader component
  function EmailConfigSkeleton() {
    return (
      <div className="bg-white shadow-md rounded p-6 animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
        
        <div className="mb-6">
          <div className="block text-sm font-medium text-gray-700 mb-2 h-4 bg-gray-300 w-20"></div>
          <div className="w-48 h-24 bg-gray-200 rounded mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <p className="h-3 bg-gray-200 rounded w-32 mt-2"></p>
        </div>

        <div className="mb-6">
          <div className="block text-sm font-medium text-gray-700 mb-2 h-4 bg-gray-300 w-24"></div>
          <div className="w-full h-8 bg-gray-200 rounded"></div>
        </div>

        <div className="mb-6">
          <div className="block text-sm font-medium text-gray-700 mb-2 h-4 bg-gray-300 w-24"></div>
          <div className="w-full h-8 bg-gray-200 rounded"></div>
        </div>

        <div className="mb-6">
          <div className="block text-sm font-medium text-gray-700 mb-2 h-4 bg-gray-300 w-24"></div>
          <div className="w-full h-8 bg-gray-200 rounded"></div>
        </div>

        <div className="mb-6">
          <div className="block text-sm font-medium text-gray-700 mb-2 h-4 bg-gray-300 w-24"></div>
          <div className="w-full h-24 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 w-3/4 rounded mt-2"></div>
          <div className="h-3 bg-gray-200 w-1/2 rounded mt-2"></div>
        </div>

        <div className="flex justify-end">
          <div className="w-20 h-10 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const previewText = emailConfig.defaultMessage.replace(
      /~([A-Za-z][A-Za-z0-9_]*)~/g,
      (match, variable) => `[${variable}]`
    );
    setVariablePreview(previewText);
  }, [emailConfig.defaultMessage]);

  useEffect(() => {
    const previewText = emailConfig.defaultSubject.replace(
      /~([A-Za-z][A-Za-z0-9_]*)~/g,
      (match, variable) => `[${variable}]`
    );
    setSubjectPreview(previewText);
  }, [emailConfig.defaultSubject]);

  useEffect(() => {
    const fetchEmailConfig = async () => {
      try {
        const response = await fetch('/api/email-config');
        if (response.status === 401) {
          throw new Error('Unauthorized');
        }
        if (!response.ok) {
          throw new Error('Failed to fetch email configuration');
        }
        const data = await response.json();
        setEmailConfig(data);
        if (data.logoUrl) {
          setPreviewUrl(data.logoUrl);
        }
      } catch (error) {
        console.error('Error fetching email configuration:', error);
        setDialogMessage(error instanceof Error ? error.message : 'Failed to load email configuration.');
        setIsDialogOpen(true);
      } finally {
        setIsFetchingConfig(false);
      }
    };

    fetchEmailConfig();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setDialogMessage('Please upload an image file.');
        setIsDialogOpen(true);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setDialogMessage('Image size should be less than 5MB.');
        setIsDialogOpen(true);
        return;
      }

      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const uploadImage = async (): Promise<string> => {
    if (!selectedFile) return emailConfig.logoUrl;

    const formData = new FormData();
    formData.append('image', selectedFile);

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    const data = await response.json();
    return data.imageUrl;
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      const variableRegex = /~([A-Za-z][A-Za-z0-9_]*)~/g;
      const messageVariables = emailConfig.defaultMessage.match(variableRegex) || [];
      const subjectVariables = emailConfig.defaultSubject.match(variableRegex) || [];
      const allVariables = [...messageVariables, ...subjectVariables]
        .map(v => v.slice(1, -1));

      const invalidVariables = allVariables.filter(v => !v.match(/^[A-Za-z][A-Za-z0-9_]*$/));
      
      if (invalidVariables.length > 0) {
        throw new Error(`Invalid variable format: ${invalidVariables.join(', ')}. Variables should contain only letters, numbers, and underscores, and start with a letter.`);
      }

      let logoUrl = emailConfig.logoUrl;
      if (selectedFile) {
        logoUrl = await uploadImage();
      }

      const response = await fetch('/api/email-config', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...emailConfig,
          logoUrl,
        }),
      });

      if (response.status === 401) {
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        throw new Error('Failed to update email configuration');
      }

      const updatedConfig = await response.json();
      setEmailConfig(updatedConfig);
      setDialogMessage('Email configuration updated successfully!');
      setSelectedFile(null);
    } catch (error) {
      console.error('Error updating email configuration:', error);
      setDialogMessage(error instanceof Error ? error.message : 'Failed to update email configuration.');
    } finally {
      setIsLoading(false);
      setIsDialogOpen(true);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (isFetchingConfig) {
    return <EmailConfigSkeleton />;
  }

  return (
    <div className="bg-white shadow-md rounded p-6">
      <h2 className="text-lg font-semibold mb-4">Email Configuration</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Logo
        </label>
        <div className="space-y-4">
          {previewUrl && (
            <div className="relative w-48 h-24">
              <Image
                src={previewUrl}
                alt="Logo preview"
                fill
                className="object-contain"
              />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
          />
          <p className="text-sm text-gray-500">Max file size: 5MB</p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Heading
        </label>
        <input
          type="text"
          value={emailConfig.emailHeading}
          onChange={(e) =>
            setEmailConfig((prev) => ({ ...prev, emailHeading: e.target.value }))
          }
          className="w-full p-2 border border-gray-300 rounded focus:outline-1 focus:outline-blue-500"
          placeholder="Enter email heading"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Support Email
        </label>
        <input
          type="text"
          value={emailConfig.supportEmail}
          onChange={(e) =>
            setEmailConfig((prev) => ({ ...prev, supportEmail: e.target.value }))
          }
          className="w-full p-2 border border-gray-300 rounded focus:outline-1 focus:outline-blue-500"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Subject
        </label>
        <div className="space-y-2">
          <input
            type="text"
            value={emailConfig.defaultSubject}
            onChange={(e) =>
              setEmailConfig((prev) => ({ ...prev, defaultSubject: e.target.value }))
            }
            className="w-full p-2 border border-gray-300 rounded focus:outline-1 focus:outline-blue-500"
            placeholder="Enter subject. Use ~VariableName~ to insert dynamic content"
          />
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">Preview with variables:</p>
            <p>{subjectPreview}</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Message
        </label>
        <div className="space-y-2">
          <MessageEditor
            value={emailConfig.defaultMessage}
            onChange={(html) => 
              setEmailConfig(prev => ({ ...prev, defaultMessage: html }))
            }
          />
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">Preview with variables:</p>
            <p className="whitespace-pre-wrap">{variablePreview}</p>
          </div>
          <p className="text-sm text-gray-500">
            Tip: Use ~VariableName~ to insert dynamic content from your CSV file (e.g., ~Name~, ~Course~)
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>

      <FeedbackDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        message={dialogMessage}
      />
    </div>
  );
}
