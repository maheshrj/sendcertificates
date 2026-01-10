"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TemplateCanvas } from "@/app/components/TemplateCanvas";
import { Navbar } from "@/app/components/Navbar";
import { PlaceholderEditor } from "@/app/components/PlaceholderEditor";
import { AddPlaceholderModal } from "@/app/components/AddPlaceholderModal";
import { Template, Placeholder, PlaceholderStyle, Signature } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AddSignatureModal } from "@/app/components/AddSignatureModal";
import TemplatePreviewModal from "@/app/components/TemplatePreviewModal";
import { FeedbackDialog } from '@/app/components/FeedbackDialog';

interface EditTemplatePageProps {
  params: Promise<{ id: string }>
}



export default function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { id } = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<Partial<Template>>({
    name: "",
    placeholders: [],
    signatures: [],
    qrPlaceholders: [],
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string | null>(null);
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null);
  const [isAddSignatureModalOpen, setIsAddSignatureModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedQRPlaceholder, setSelectedQRPlaceholder] = useState<string | null>(null);

  useEffect(() => {
    // Check if the user is authenticated
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
    const fetchTemplate = async () => {
      try {
        const res = await fetch(`/api/templates/${id}`);
        if (res.ok) {
          const data = await res.json();
          setTemplate(data);
        } else {
          setDialogMessage('Failed to load template');
          setIsDialogOpen(true);
        }
      } catch (error) {
        console.error(error);
        setDialogMessage('Error loading template');
        setIsDialogOpen(true);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [id]);

  const handleAddQRPlaceholder = () => {
    if (!template.imageUrl) {
      setDialogMessage('Please upload an image before adding QR codes.');
      setIsDialogOpen(true);
      return;
    }
  
    const newQRPlaceholder = {
      id: Math.random().toString(),
      position: { x: 50, y: 50 },
      style: { Width: 200, Height: 200 },
    };
  
    setTemplate((prev) => ({
      ...prev,
      qrPlaceholders: [...(prev.qrPlaceholders || []), newQRPlaceholder],
    }));
  };
  

  const handleQRPlaceholderMove = (id: string, position: { x: number; y: number }) => {
    setTemplate((prev) => ({
      ...prev,
      qrPlaceholders: (prev.qrPlaceholders || []).map((qr) =>
        qr.id === id ? { ...qr, position } : qr
      ),
    }));
  };
  
  const handleQRPlaceholderResize = (id: string, style: { Width: number; Height: number }) => {
    setTemplate((prev) => ({
      ...prev,
      qrPlaceholders: (prev.qrPlaceholders || []).map((qr) =>
        qr.id === id ? { ...qr, style } : qr
      ),
    }));
  };
  
  const handleQRPlaceholderDelete = (id: string) => {
    setTemplate((prev) => ({
      ...prev,
      qrPlaceholders: prev.qrPlaceholders?.filter((qr) => qr.id !== id) || [],
    }));
    if (selectedQRPlaceholder === id) {
      setSelectedQRPlaceholder(null);
    }
  };

  const handleSignatureDelete = (id: string) => {
    setTemplate((prev) => ({
      ...prev,
      signatures: prev.signatures?.filter((signature) => signature.id !== id) || [],
    }));
    if (selectedSignature === id) {
      setSelectedSignature(null);
    }
  };

  const handleAddSignature = (name: string, width: number, height: number, imageUrl?: string) => {
    if (!template.imageUrl) {
      setDialogMessage('Please upload an image before adding signatures.');
      setIsDialogOpen(true);
      return;
    }

    const newSignature: Signature = {
      id: Math.random().toString(),
      name,
      position: { x: 50, y: 50 },
      style: { Width: width, Height: height },
      imageUrl: imageUrl || "",
    };

    setTemplate((prev) => ({
      ...prev,
      signatures: [...(prev.signatures || []), newSignature],
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setDialogMessage('Please upload an image file.');
      setIsDialogOpen(true);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setDialogMessage('Please upload an image smaller than 5MB.');
      setIsDialogOpen(true);
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const { imageUrl } = await response.json();
      setTemplate((prev) => ({
        ...prev,
        imageUrl,
      }));
    } catch (error) {
      console.error("Error uploading image:", error);
      setDialogMessage('Failed to upload image.');
      setIsDialogOpen(true);
    } finally {
      setUploading(false);
    }
  };

  const handleAddPlaceholder = (name: string, style: PlaceholderStyle) => {
    if (!template.imageUrl) {
      setDialogMessage('Please upload an image before adding placeholders.');
      setIsDialogOpen(true);
      return;
    }

    const newPlaceholder: Placeholder = {
      id: Math.random().toString(),
      name,
      position: { x: 50, y: 50 },
      style
    };
    setTemplate((prev) => ({
      ...prev,
      placeholders: [...(prev.placeholders || []), newPlaceholder],
    }));
    setSelectedPlaceholder(newPlaceholder.id);
  };

  const handlePlaceholderUpdate = (id: string, updates: Partial<Placeholder>) => {
    setTemplate((prev) => ({
      ...prev,
      placeholders: prev.placeholders?.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  };

  const handlePlaceholderDelete = (id: string) => {
    setTemplate((prev) => ({
      ...prev,
      placeholders: prev.placeholders?.filter((p) => p.id !== id),
    }));
    setSelectedPlaceholder(null);
  };

  const handleSave = async () => {
    if (!template.name || !template.imageUrl) {
      setDialogMessage('Please enter a name and upload an image before saving.');
      setIsDialogOpen(true);
      return;
    }

    if (template.placeholders?.length === 0) {
      setDialogMessage('Please add at least one placeholder before saving.');
      setIsDialogOpen(true);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error || "An unknown error occurred";
        throw new Error(errorMessage);
      }

      router.push("/templates");
    } catch (error) {
      if (error instanceof Error) {
        setDialogMessage(error.message);
      } else {
        setDialogMessage('An unknown error occurred');
      }
      setIsDialogOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const selectedPlaceholderData = template.placeholders?.find(
    (p) => p.id === selectedPlaceholder
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <p className="text-lg text-gray-600">Loading template...</p>
        </main>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      
        <main className="flex-grow w-full mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="container mx-auto">
            <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">
                Edit Template
              </h1>
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
                <Button 
                  onClick={() => setShowPreview(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  disabled={!template.imageUrl}
                >
                  Preview Template
                </Button>
                <Button
                  onClick={handleAddQRPlaceholder}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  disabled={!template.imageUrl}
                >
                  Add QR
                </Button>
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  disabled={!template.imageUrl}
                >
                  Add Placeholder
                </Button>
                <Button
                  onClick={() => setIsAddSignatureModalOpen(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  disabled={!template.imageUrl}
                >
                  Add Signature
                </Button>
                <Button 
                  onClick={handleSave} 
                  variant="default" 
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  onClick={() => router.push("/templates")} 
                  variant="outline" 
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Template Name</label>
              <Input
                type="text"
                value={template.name}
                onChange={(e) => setTemplate((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter template name"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">
                Update Template Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="mt-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              {uploading && <p className="text-blue-500 mt-2">Uploading...</p>}
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
              <TemplateCanvas
                imageUrl={template.imageUrl}
                placeholders={template.placeholders || []}
                signatures={template.signatures || []}
                qrPlaceholders={template.qrPlaceholders || []}
                onPlaceholderMove={(id, position) => {
                  setTemplate((prev) => ({
                    ...prev,
                    placeholders: (prev.placeholders || []).map((placeholder) =>
                      placeholder.id === id ? { ...placeholder, position } : placeholder
                    ),
                  }));
                }}
                onSignatureMove={(id, position) => {
                  setTemplate((prev) => ({
                    ...prev,
                    signatures: (prev.signatures || []).map((signature) =>
                      signature.id === id ? { ...signature, position } : signature
                    ),
                  }));
                }}
                onSignatureResize={(id, style) => {
                  setTemplate((prev) => ({
                    ...prev,
                    signatures: (prev.signatures || []).map((signature) =>
                      signature.id === id ? { ...signature, style } : signature
                    ),
                  }));
                }}
                onQRPlaceholderMove={handleQRPlaceholderMove}
                onQRPlaceholderResize={handleQRPlaceholderResize}
                onQRPlaceholderDelete={handleQRPlaceholderDelete}
                onSignatureDelete={handleSignatureDelete}
                onPlaceholderSelect={setSelectedPlaceholder}
                onSignatureSelect={setSelectedSignature}
                onQRPlaceholderSelect={setSelectedQRPlaceholder}
                selectedPlaceholderId={selectedPlaceholder}
                selectedSignatureId={selectedSignature}
                selectedQRPlaceholderId={selectedQRPlaceholder}
              />
              </div>

              <div className="w-full lg:w-80 mt-6 lg:mt-0">
                {selectedPlaceholderData ? (
                  <PlaceholderEditor
                    placeholder={selectedPlaceholderData}
                    onUpdate={handlePlaceholderUpdate}
                    onDelete={handlePlaceholderDelete}
                  />
                ) : (
                  <Card className="p-4 text-center text-gray-500">
                    Select a placeholder to edit its properties
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>

        <AddPlaceholderModal
          open={isAddModalOpen}
          onOpenChange={setIsAddModalOpen}
          onAdd={handleAddPlaceholder}
        />
        <AddSignatureModal
          open={isAddSignatureModalOpen}
          onOpenChange={setIsAddSignatureModalOpen}
          onAdd={handleAddSignature}
        />
        <TemplatePreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          template={template}
        />
        <FeedbackDialog 
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          message={dialogMessage}
        />
      
    </DndProvider>
  );
}

