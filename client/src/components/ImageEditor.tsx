import { useState } from 'react';
import type { GeneratedImage } from '../types';

interface ImageEditorProps {
  image: GeneratedImage;
  onRegenerate: (prompt: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

export default function ImageEditor({
  image,
  onRegenerate,
  onClose,
  isLoading,
}: ImageEditorProps) {
  const [editedPrompt, setEditedPrompt] = useState(image.prompt);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRegenerate(editedPrompt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title !mb-0">✏️ Edit & Regenerate</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current image */}
          <div>
            <p className="label">Current Image</p>
            <img
              src={image.url}
              alt="Current"
              className="w-full rounded-xl border border-gray-100"
            />
            <span className="inline-block mt-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              {image.aspectRatio}
            </span>
          </div>

          {/* Prompt editor */}
          <form onSubmit={handleSubmit} className="flex flex-col">
            <p className="label">Edit Prompt</p>
            <textarea
              className="textarea-field flex-1 min-h-[200px]"
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={isLoading || editedPrompt === image.prompt}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Regenerating...
                  </>
                ) : (
                  'Regenerate'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
