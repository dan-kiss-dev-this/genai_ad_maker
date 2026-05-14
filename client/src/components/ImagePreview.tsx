import type { GeneratedImage } from '../types';

interface ImagePreviewProps {
  images: GeneratedImage[];
  missingAssetImages: GeneratedImage[];
  onEditPrompt: (image: GeneratedImage) => void;
}

const ratioLabels: Record<string, string> = {
  '1:1': '1:1 — Feed Post',
  '9:16': '9:16 — Stories / Reels',
  '16:9': '16:9 — Landscape',
};

export default function ImagePreview({
  images,
  missingAssetImages,
  onEditPrompt,
}: ImagePreviewProps) {
  const downloadImage = async (image: GeneratedImage) => {
    const response = await fetch(image.url);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = image.s3Key.split('/').pop() || 'image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
    for (const image of [...images, ...missingAssetImages]) {
      await downloadImage(image);
    }
  };

  if (images.length === 0 && missingAssetImages.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Missing Asset Images */}
      {missingAssetImages.length > 0 && (
        <div className="card">
          <h2 className="section-title">🧩 Generated Missing Assets</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {missingAssetImages.map((image, i) => (
              <ImageCard
                key={i}
                image={image}
                label={`Missing Asset: ${image.missingAssetDescription?.slice(0, 40) || 'Asset'}...`}
                onDownload={() => downloadImage(image)}
                onEdit={() => onEditPrompt(image)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hero Images */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title !mb-0">🖼️ Generated Ad Images</h2>
          <button onClick={downloadAll} className="btn-secondary !py-2 !px-4 text-xs">
            Download All
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image, i) => (
            <ImageCard
              key={i}
              image={image}
              label={ratioLabels[image.aspectRatio] || image.aspectRatio}
              onDownload={() => downloadImage(image)}
              onEdit={() => onEditPrompt(image)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ImageCardProps {
  image: GeneratedImage;
  label: string;
  onDownload: () => void;
  onEdit: () => void;
}

function ImageCard({ image, label, onDownload, onEdit }: ImageCardProps) {
  return (
    <div className="group relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50 transition-shadow duration-200 hover:shadow-lg">
      <div className="relative">
        <img
          src={image.url}
          alt={label}
          className="w-full h-auto object-contain"
          loading="lazy"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
          <button
            onClick={onDownload}
            className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-white transition-colors"
          >
            Download
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg bg-brand-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            Edit & Regenerate
          </button>
        </div>
      </div>
      <div className="p-3">
        <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          {label}
        </span>
      </div>
    </div>
  );
}
