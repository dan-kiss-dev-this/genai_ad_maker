import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { UploadedAsset, MissingAsset } from '../types';
import { uploadAssets } from '../services/api';

interface AssetUploaderProps {
  assets: UploadedAsset[];
  missingAssets: MissingAsset[];
  onAssetsChange: (assets: UploadedAsset[]) => void;
  onMissingAssetsChange: (missing: MissingAsset[]) => void;
  productCount: number;
}

interface AssetSlot {
  type: 'logo' | 'product' | 'reference';
  label: string;
  productIndex?: number;
  maxFiles: number;
}

export default function AssetUploader({
  assets,
  missingAssets,
  onAssetsChange,
  onMissingAssetsChange,
  productCount,
}: AssetUploaderProps) {
  const [uploading, setUploading] = useState<string | null>(null);

  const slots: AssetSlot[] = [
    { type: 'logo', label: 'Brand Logo', maxFiles: 1 },
    ...Array.from({ length: productCount }, (_, i) => ({
      type: 'product' as const,
      label: `Product ${i + 1} Images`,
      productIndex: i,
      maxFiles: 5,
    })),
    { type: 'reference', label: 'Reference / Mood Board Images', maxFiles: 5 },
  ];

  const handleUpload = async (
    files: File[],
    type: 'logo' | 'product' | 'reference',
    productIndex?: number
  ) => {
    const slotKey = `${type}-${productIndex ?? ''}`;
    setUploading(slotKey);
    try {
      const uploaded = await uploadAssets(files, type, productIndex);
      onAssetsChange([...assets, ...uploaded]);
      // Remove any missing asset entry for this slot since files were uploaded
      onMissingAssetsChange(
        missingAssets.filter(
          (m) => !(m.type === type && m.productIndex === productIndex)
        )
      );
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(null);
    }
  };

  const getSlotAssets = (type: string, productIndex?: number) =>
    assets.filter(
      (a) => a.type === type && a.productIndex === productIndex
    );

  const getMissingAsset = (type: string, productIndex?: number) =>
    missingAssets.find(
      (m) => m.type === type && m.productIndex === productIndex
    );

  const updateMissingDescription = (
    type: 'logo' | 'product' | 'reference',
    productIndex: number | undefined,
    description: string
  ) => {
    const existing = missingAssets.filter(
      (m) => !(m.type === type && m.productIndex === productIndex)
    );
    if (description.trim()) {
      existing.push({ type, productIndex, description: description.trim() });
    }
    onMissingAssetsChange(existing);
  };

  const removeAsset = (key: string) => {
    onAssetsChange(assets.filter((a) => a.key !== key));
  };

  return (
    <div className="card">
      <h2 className="section-title">🎨 Assets</h2>
      <div className="space-y-6">
        {slots.map((slot) => {
          const slotKey = `${slot.type}-${slot.productIndex ?? ''}`;
          const slotAssets = getSlotAssets(slot.type, slot.productIndex);
          const missing = getMissingAsset(slot.type, slot.productIndex);
          const isUploading = uploading === slotKey;

          return (
            <AssetSlotSection
              key={slotKey}
              slot={slot}
              slotAssets={slotAssets}
              missingDescription={missing?.description || ''}
              isUploading={isUploading}
              onUpload={(files) => handleUpload(files, slot.type, slot.productIndex)}
              onRemoveAsset={removeAsset}
              onMissingDescriptionChange={(desc) =>
                updateMissingDescription(slot.type, slot.productIndex, desc)
              }
            />
          );
        })}
      </div>
    </div>
  );
}

interface AssetSlotSectionProps {
  slot: AssetSlot;
  slotAssets: UploadedAsset[];
  missingDescription: string;
  isUploading: boolean;
  onUpload: (files: File[]) => void;
  onRemoveAsset: (key: string) => void;
  onMissingDescriptionChange: (desc: string) => void;
}

function AssetSlotSection({
  slot,
  slotAssets,
  missingDescription,
  isUploading,
  onUpload,
  onRemoveAsset,
  onMissingDescriptionChange,
}: AssetSlotSectionProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onUpload(acceptedFiles.slice(0, slot.maxFiles));
    },
    [onUpload, slot.maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    },
    maxFiles: slot.maxFiles,
    disabled: isUploading,
  });

  const hasAssets = slotAssets.length > 0;

  return (
    <div>
      <label className="label">{slot.label}</label>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Uploading...
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            {isDragActive
              ? 'Drop files here...'
              : `Drag & drop or click to upload (max ${slot.maxFiles} file${slot.maxFiles > 1 ? 's' : ''})`}
          </p>
        )}
      </div>

      {/* Uploaded thumbnails */}
      {hasAssets && (
        <div className="flex flex-wrap gap-3 mt-3">
          {slotAssets.map((asset) => (
            <div key={asset.key} className="relative group">
              <img
                src={asset.url}
                alt={asset.originalName || 'Uploaded asset'}
                className="w-20 h-20 rounded-lg object-cover border border-gray-200"
              />
              <button
                type="button"
                onClick={() => onRemoveAsset(asset.key)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs
                           flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Missing asset description */}
      {!hasAssets && (
        <div className="mt-3">
          <p className="text-xs text-gray-400 mb-1">
            No file? Describe the asset and we'll generate it for you:
          </p>
          <textarea
            className="textarea-field text-xs"
            rows={2}
            placeholder="e.g. A sleek silver smartwatch with a round face and leather strap"
            value={missingDescription}
            onChange={(e) => onMissingDescriptionChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
