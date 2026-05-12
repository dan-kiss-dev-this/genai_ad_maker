import axios from 'axios';
import type {
  CampaignBrief,
  UploadedAsset,
  MissingAsset,
  GenerateResponse,
} from '../types';

const api = axios.create({
  baseURL: '/api',
});

export async function uploadAssets(
  files: File[],
  assetType: 'logo' | 'product' | 'reference',
  productIndex?: number
): Promise<UploadedAsset[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  formData.append('assetType', assetType);
  if (productIndex !== undefined) {
    formData.append('productIndex', String(productIndex));
  }

  const { data } = await api.post<{ assets: UploadedAsset[] }>(
    '/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data.assets;
}

export async function generateImages(
  brief: CampaignBrief,
  assets: UploadedAsset[],
  missingAssets: MissingAsset[]
): Promise<GenerateResponse> {
  const { data } = await api.post<GenerateResponse>('/generate', {
    brief,
    assets,
    missingAssets,
  });
  return data;
}

export async function getImageUrl(s3Key: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/images/${s3Key}`);
  return data.url;
}
