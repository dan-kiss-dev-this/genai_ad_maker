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

export interface AssetUpload {
  type: 'logo' | 'product' | 'reference';
  productIndex?: number;
  url: string;
  key: string;
}

export interface MissingAsset {
  type: 'logo' | 'product' | 'reference';
  productIndex?: number;
  description: string;
}

export interface GenerateRequest {
  brief: CampaignBrief;
  assets: AssetUpload[];
  missingAssets: MissingAsset[];
}

export type AspectRatio = '1:1' | '9:16' | '16:9';

export interface AspectRatioConfig {
  ratio: AspectRatio;
  width: number;
  height: number;
  label: string;
}

export const ASPECT_RATIOS: AspectRatioConfig[] = [
  { ratio: '1:1', width: 1080, height: 1080, label: 'Standard Feed Post' },
  { ratio: '9:16', width: 1080, height: 1920, label: 'Stories / Reels' },
  { ratio: '16:9', width: 1920, height: 1080, label: 'Landscape / Carousel' },
];

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
  generationLog: GenerationLogEntry[];
}

export interface GenerationLogEntry {
  timestamp: string;
  type: 'missing-asset' | 'hero-image';
  aspectRatio?: AspectRatio;
  prompt: string;
  inputImageRefs: string[];
  requestedDimensions: { width: number; height: number };
  status: 'success' | 'error';
  error?: string;
  durationMs: number;
}
