// types/index.ts
export type Position = {
    x: number;
    y: number;
  };

export interface Style {
  Width: number;
  Height: number;
}
  
export interface QRPlaceholder {
  id: string;
  position: Position;
  style: Style;
}

  

export interface EmailConfig {
    customDomain?: string | null;
    customEmail?: string | null;
    isVerified?: boolean;
    defaultSubject: string;
    defaultMessage: string;
    emailHeading: string;
    supportEmail?: string | null;
  }

// Test
export interface PlaceholderStyle {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  fontWeight: string;
  textAlign: 'left' | 'center' | 'right';
}
  
export interface Placeholder {
  id: string;
  name: string;
  position: { x: number; y: number };
  style: PlaceholderStyle;
}

export interface InvalidEmail {
  id: string;
  email: string;
  reason: string;
  createdAt: string;
}

export interface Signature {
  id: string;
  name: string;
  position: Position;
  style: Style;
  imageUrl: string;
}
  
export type Template = {
  id: string;
  name: string;
  imageUrl: string;
  width: number; 
  height: number; 
  placeholders: Placeholder[];
  signatures: Signature[]; 
  qrPlaceholders: QRPlaceholder[];
};

  
export type Certificate = {
  id: string;
  templateId: string;
  uniqueIdentifier: string;
  data: Record<string, string>;
  generatedImageUrl: string;
  createdAt: Date;
};