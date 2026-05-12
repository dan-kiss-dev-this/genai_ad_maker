export interface Product {
  name: string;
  description: string;
}

export interface CampaignBrief {
  brandName: string;
  campaignMessage: string;
  campaignGoal: 'awareness' | 'conversion' | 'engagement';
  targetAudience: string;
  targetRegion: string;
  toneStyle: 'professional' | 'playful' | 'bold' | 'elegant' | 'minimal' | 'edgy';
  ctaText: string;
  colorPalette: string[];
  brandGuidelines: string;
  competitorReferences: string;
  products: Product[];
}

export interface UploadedAsset {
  type: 'logo' | 'product' | 'reference';
  productIndex?: number;
  url: string;
  key: string;
  originalName?: string;
}

export interface MissingAsset {
  type: 'logo' | 'product' | 'reference';
  productIndex?: number;
  description: string;
}

export type AspectRatio = '1:1' | '9:16' | '16:9';

export interface GeneratedImage {
  url: string;
  s3Key: string;
  aspectRatio: AspectRatio;
  prompt: string;
  isMissingAsset?: boolean;
  missingAssetDescription?: string;
}

export interface GenerateResponse {
  sessionId: string;
  images: GeneratedImage[];
  missingAssetImages: GeneratedImage[];
  generationLog: unknown[];
}
