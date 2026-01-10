// components/PlaceholderEditor.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Placeholder } from '@/app/types';

interface PlaceholderEditorProps {
  placeholder: Placeholder;
  onUpdate: (id: string, updates: Partial<Placeholder>) => void;
  onDelete: (id: string) => void;
}

export function PlaceholderEditor({ placeholder, onUpdate, onDelete }: PlaceholderEditorProps) {
  const handleFontFamilyChange = (value: string) => {
    onUpdate(placeholder.id, { 
      style: { ...placeholder.style, fontFamily: value } 
    });
  };

  const handleFontSizeChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(placeholder.id, {
      style: { ...placeholder.style, fontSize: Number(value) }
    });
  };

  const handleColorChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(placeholder.id, {
      style: { ...placeholder.style, fontColor: value }
    });
  };

  const handleFontWeightChange = (value: string) => {
    onUpdate(placeholder.id, {
      style: { ...placeholder.style, fontWeight: value }
    });
  };

  const handleTextAlignChange = (value: string) => {
    onUpdate(placeholder.id, {
      style: { ...placeholder.style, textAlign: value as 'left' | 'center' | 'right' }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex justify-between items-center">
          <span>{placeholder.name}</span>
          <button
            onClick={() => onDelete(placeholder.id)}
            className="text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`font-family-${placeholder.id}`}>Font Family</Label>
          <Select
            value={placeholder.style.fontFamily}
            onValueChange={handleFontFamilyChange}
          >
            <SelectTrigger id={`font-family-${placeholder.id}`}>
              <SelectValue placeholder="Select font family" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Arial">Arial</SelectItem>
              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
              <SelectItem value="Helvetica">Helvetica</SelectItem>
              <SelectItem value="Courier New">Courier New</SelectItem>
              <SelectItem value="MonteCarlo">MonteCarlo</SelectItem>
              <SelectItem value="AlexBrush">AlexBrush</SelectItem>
              <SelectItem value="Birthstone">Birthstone</SelectItem>
              <SelectItem value="DancingScript">DancingScript</SelectItem>
              <SelectItem value="LibreBaskerville">LibreBaskerville</SelectItem>
              <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
              <SelectItem value="Impact">Impact</SelectItem>
              <SelectItem value="Georgia">Georgia</SelectItem>
              <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
              <SelectItem value="Verdana">Verdana</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`font-size-${placeholder.id}`}>Font Size</Label>
          <Input
            id={`font-size-${placeholder.id}`}
            type="number"
            value={placeholder.style.fontSize}
            onChange={handleFontSizeChange}
            min="8"
            max="72"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`font-color-${placeholder.id}`}>Font Color</Label>
          <div className="flex gap-2">
            <Input
              id={`font-color-${placeholder.id}`}
              type="color"
              value={placeholder.style.fontColor}
              onChange={handleColorChange}
              className="w-16 h-10 p-1"
            />
            <Input
              type="text"
              value={placeholder.style.fontColor}
              onChange={handleColorChange}
              className="flex-1"
              placeholder="#000000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`font-weight-${placeholder.id}`}>Font Weight</Label>
          <Select
            value={placeholder.style.fontWeight}
            onValueChange={handleFontWeightChange}
          >
            <SelectTrigger id={`font-weight-${placeholder.id}`}>
              <SelectValue placeholder="Select font weight" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`text-align-${placeholder.id}`}>Text Align</Label>
          <Select
            value={placeholder.style.textAlign}
            onValueChange={handleTextAlignChange}
          >
            <SelectTrigger id={`text-align-${placeholder.id}`}>
              <SelectValue placeholder="Select text alignment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}