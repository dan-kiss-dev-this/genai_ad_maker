import { useState } from 'react';
import Layout from './components/Layout';
import BriefForm from './components/BriefForm';
import ImagePreview from './components/ImagePreview';
import ImageEditor from './components/ImageEditor';
import { generateImages, generateMissingAsset } from './services/api';
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
  const [generatedPreviews, setGeneratedPreviews] = useState<Record<string, GeneratedImage>>({});
  const [generatingPreview, setGeneratingPreview] = useState<string | null>(null);

  const handleGeneratePreview = async (slotKey: string, missingAsset: MissingAsset) => {
    setGeneratingPreview(slotKey);
    try {
      const image = await generateMissingAsset(missingAsset, currentBrief?.brandName || 'preview');
      setGeneratedPreviews((prev) => ({ ...prev, [slotKey]: image }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview generation failed.');
    } finally {
      setGeneratingPreview(null);
    }
  };

  const handleDismissPreview = (slotKey: string) => {
    setGeneratedPreviews((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  };

  const handleAcceptPreview = (slotKey: string, slot: { type: 'logo' | 'product' | 'reference'; productIndex?: number }) => {
    const preview = generatedPreviews[slotKey];
    if (!preview) return;
    const newAsset: UploadedAsset = {
      type: slot.type,
      productIndex: slot.productIndex,
      url: preview.url,
      key: preview.s3Key,
      originalName: preview.missingAssetDescription || 'Generated asset',
    };
    setAssets((prev) => [...prev, newAsset]);
    setMissingAssets((prev) => prev.filter((m) => !(m.type === slot.type && m.productIndex === slot.productIndex)));
    handleDismissPreview(slotKey);
  };

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

        {/* Brief Form */}
        <BriefForm
          onSubmit={handleGenerate}
          isLoading={isGenerating}
          assets={assets}
          missingAssets={missingAssets}
          onAssetsChange={setAssets}
          onMissingAssetsChange={setMissingAssets}
          error={error}
          onDismissError={() => setError(null)}
          generatedPreviews={generatedPreviews}
          generatingPreview={generatingPreview}
          onGeneratePreview={handleGeneratePreview}
          onDismissPreview={handleDismissPreview}
          onAcceptPreview={handleAcceptPreview}
        />

        {/* Loading overlay */}
        {isGenerating && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(26, 26, 26, 0.9)' }}>
            <svg className="animate-spin h-16 w-16 mb-6" viewBox="0 0 24 24" style={{ color: '#ec1000' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-xl font-bold text-white">Generating your ad images...</p>
            <p className="text-sm text-gray-400 mt-2">
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
