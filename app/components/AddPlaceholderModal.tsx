import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlaceholderStyle } from '@/app/types';

interface AddPlaceholderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, style: PlaceholderStyle) => void;
}

export function AddPlaceholderModal({ open, onOpenChange, onAdd }: AddPlaceholderModalProps) {
  const [name, setName] = useState('');
  const [style, setStyle] = useState<PlaceholderStyle>({
    fontFamily: 'Arial',
    fontSize: 30,
    fontColor: '#000000',
    fontWeight: 'normal',
    textAlign: 'center'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), style);
      setName('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Placeholder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="placeholder-name">Placeholder Name</Label>
            <Input
              id="placeholder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter placeholder name"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="font-family">Font Family</Label>
            <Select
              value={style.fontFamily}
              onValueChange={(value) => setStyle(prev => ({ ...prev, fontFamily: value }))}
            >
              <SelectTrigger id="font-family">
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
            <Label htmlFor="font-size">Font Size</Label>
            <Input
              id="font-size"
              type="number"
              value={style.fontSize}
              onChange={(e) => setStyle(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
              min="8"
              max="72"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="font-color">Font Color</Label>
            <div className="flex gap-2">
              <Input
                id="font-color"
                type="color"
                value={style.fontColor}
                onChange={(e) => setStyle(prev => ({ ...prev, fontColor: e.target.value }))}
                className="w-16 h-10 p-1"
              />
              <Input
                type="text"
                value={style.fontColor}
                onChange={(e) => setStyle(prev => ({ ...prev, fontColor: e.target.value }))}
                className="flex-1"
                placeholder="#000000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="font-weight">Font Weight</Label>
            <Select
              value={style.fontWeight}
              onValueChange={(value) => setStyle(prev => ({ ...prev, fontWeight: value }))}
            >
              <SelectTrigger id="font-weight">
                <SelectValue placeholder="Select font weight" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="text-align">Text Align</Label>
            <Select
              value={style.textAlign}
              onValueChange={(value: 'left' | 'center' | 'right') => 
                setStyle(prev => ({ ...prev, textAlign: value }))
              }
            >
              <SelectTrigger id="text-align">
                <SelectValue placeholder="Select text alignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit"
            className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'
            >Add Placeholder</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}