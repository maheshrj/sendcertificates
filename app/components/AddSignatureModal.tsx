"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, width: number, height: number, imageUrl?: string) => void;
};

export function AddSignatureModal({ open, onOpenChange, onAdd }: Props) {
  const [name, setName] = useState("");
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(50);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
  
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }
  
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB.");
      return;
    }
  
    // Create a temporary URL for the image
    const objectUrl = URL.createObjectURL(file);
    
    // Get image dimensions
    const img = new Image();
    img.onload = async () => {
      console.log('Image loaded with dimensions:', {
        width: img.naturalWidth,
        height: img.naturalHeight
      });
      
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
      
      // Now upload the image
      setUploading(true);
      const formData = new FormData();
      formData.append("image", file);
  
      try {
        const response = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to upload image:", errorText);
          setError("Failed to upload image");
          return;
        }
  
        const { imageUrl } = await response.json();
        setImageUrl(imageUrl);
        setError(null);
      } catch (error) {
        console.error("Error uploading image:", error);
        setError("Error uploading image");
      } finally {
        setUploading(false);
        URL.revokeObjectURL(objectUrl); // Clean up the temporary URL
      }
    };
  
    img.onerror = () => {
      setError("Failed to load image dimensions");
      URL.revokeObjectURL(objectUrl);
    };
  
    img.src = objectUrl;
  };

  const handleAdd = () => {
    setError(null);

    if (!name.trim()) {
      setError("Please provide a name for the signature.");
      return;
    }

    if (!imageUrl) {
      setError("Please upload a signature image before adding.");
      return;
    }

    onAdd(name, width, height, imageUrl);
    // Reset form
    setName("");
    setWidth(100);
    setHeight(50);
    setImageUrl(null);
    setError(null);
    onOpenChange(false);
  };

  const clearForm = () => {
    setName("");
    setWidth(100);
    setHeight(50);
    setImageUrl(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={clearForm}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Signature</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter signature name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Width (px)</label>
            <Input
              type="number"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              placeholder="Enter width"
              min="50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Height (px)</label>
            <Input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              placeholder="Enter height"
              min="50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Upload Signature <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="mt-1 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            <p className="text-sm text-gray-500 mt-1">
              Recommendation: Upload a signature with transparent background for better results.
            </p>
            {uploading && <p className="text-blue-500 mt-2">Uploading...</p>}
            {imageUrl && (
              <div className="mt-2">
                <p className="text-green-500">Image uploaded successfully!</p>
                <img 
                  src={imageUrl} 
                  alt="Preview" 
                  className="mt-2 max-h-32 object-contain"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button onClick={clearForm} variant="outline">
              Cancel
            </Button>
            <Button 
              onClick={handleAdd} 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              disabled={!imageUrl || uploading || !name.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}