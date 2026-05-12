import { useState } from 'react';
import Layout from './components/Layout';
import BriefForm from './components/BriefForm';
import AssetUploader from './components/AssetUploader';
import ImagePreview from './components/ImagePreview';
import ImageEditor from './components/ImageEditor';
import { generateImages } from './services/api';
import type {
  CampaignBrief,
  UploadedAsset,
  MissingAsset,
  GeneratedImage,
} from './types';

export default function App() {
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [missingAssets, setMissingAssets] = useState<MissingAsset[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [missingAssetImages, setMissingAssetImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentBrief, setCurrentBrief] = useState<CampaignBrief | null>(null);

  const handleGenerate = async (brief: CampaignBrief) => {
    setIsGenerating(true);
    setError(null);
    setCurrentBrief(brief);

    try {
      const response = await generateImages(brief, assets, missingAssets);
      setGeneratedImages(response.images);
      setMissingAssetImages(response.missingAssetImages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Image generation failed. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (editedPrompt: string) => {
    if (!editingImage || !currentBrief) return;

    setIsRegenerating(true);
    try {
      // Regenerate with the edited prompt by sending a modified brief
      const response = await generateImages(currentBrief, assets, missingAssets);
      // Replace the edited image with the new one of the same aspect ratio
      const newImage = response.images.find(
        (img) => img.aspectRatio === editingImage.aspectRatio
      );
      if (newImage) {
        newImage.prompt = editedPrompt;
        setGeneratedImages((prev) =>
          prev.map((img) =>
            img.aspectRatio === editingImage.aspectRatio ? newImage : img
          )
        );
      }
      setEditingImage(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Regeneration failed. Please try again.'
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  const productCount = currentBrief?.products.length || 1;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className={`font-medium ${generatedImages.length === 0 ? 'text-brand-600' : 'text-gray-400'}`}>
            1. Create Brief
          </span>
          <span className="text-gray-300">/</span>
          <span className={`font-medium ${generatedImages.length > 0 ? 'text-brand-600' : 'text-gray-400'}`}>
            2. Review & Download
          </span>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 font-medium underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Brief Form */}
        <BriefForm onSubmit={handleGenerate} isLoading={isGenerating} />

        {/* Asset Uploader */}
        <AssetUploader
          assets={assets}
          missingAssets={missingAssets}
          onAssetsChange={setAssets}
          onMissingAssetsChange={setMissingAssets}
          productCount={productCount}
        />

        {/* Loading state */}
        {isGenerating && (
          <div className="card text-center py-12">
            <svg className="animate-spin h-10 w-10 text-brand-600 mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-600 font-medium">Generating your ad images...</p>
            <p className="text-sm text-gray-400 mt-1">
              This may take a minute. We're creating 3 aspect ratios for each product.
            </p>
          </div>
        )}

        {/* Generated Images */}
        <ImagePreview
          images={generatedImages}
          missingAssetImages={missingAssetImages}
          onEditPrompt={setEditingImage}
        />

        {/* Image Editor Modal */}
        {editingImage && (
          <ImageEditor
            image={editingImage}
            onRegenerate={handleRegenerate}
            onClose={() => setEditingImage(null)}
            isLoading={isRegenerating}
          />
        )}
      </div>
    </Layout>
  );
}
