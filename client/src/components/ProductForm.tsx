import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { Product, UploadedAsset } from '../types';

interface ProductFormProps {
  product: Product;
  index: number;
  canRemove: boolean;
  onChange: (index: number, product: Product) => void;
  onRemove: (index: number) => void;
  slotAssets: UploadedAsset[];
  missingDescription: string;
  isUploading: boolean;
  onUpload: (files: File[]) => void;
  onRemoveAsset: (key: string) => void;
  onMissingDescriptionChange: (desc: string) => void;
}

export default function ProductForm({
  product,
  index,
  canRemove,
  onChange,
  onRemove,
  slotAssets,
  missingDescription,
  isUploading,
  onUpload,
  onRemoveAsset,
  onMissingDescriptionChange,
}: ProductFormProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onUpload(acceptedFiles.slice(0, 5));
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    },
    maxFiles: 5,
    disabled: isUploading,
  });

  const hasAssets = slotAssets.length > 0;

  return (
    <div className="relative rounded-xl p-5" style={{ backgroundColor: '#4a0800', borderColor: '#ec1000', borderWidth: '1px', borderStyle: 'solid' }}>
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="btn-danger absolute top-3 right-3" style={{ color: '#ffffff', backgroundColor: 'rgba(236, 16, 0, 0.4)', borderColor: 'rgba(236, 16, 0, 0.6)' }}
        >
          Remove
        </button>
      )}

      <div className="space-y-4">
        <div>
          <label className="label">Product Name</label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Air Max 2026"
            value={product.name}
            onChange={(e) => onChange(index, { ...product, name: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Product Description</label>
          <textarea
            className="textarea-field"
            rows={3}
            placeholder="Describe the product — features, materials, unique selling points..."
            value={product.description}
            onChange={(e) => onChange(index, { ...product, description: e.target.value })}
          />
        </div>

        {/* Product Images Upload */}
        <div>
          <label className="label">Product Images</label>
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
                  : 'Drag & drop or click to upload (max 5 files)'}
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
                onKeyDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
