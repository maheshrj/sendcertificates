// components/FeedbackDialog.tsx
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog';
  
  interface FeedbackDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    message: string | null;
  }
  
  export function FeedbackDialog({ isOpen, onOpenChange, message }: FeedbackDialogProps) {
    if (!message) return null;
  
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }