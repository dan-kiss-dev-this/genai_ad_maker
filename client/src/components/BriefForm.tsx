import { useState } from 'react';
import type { CampaignBrief, Product } from '../types';
import ProductForm from './ProductForm';

interface BriefFormProps {
  onSubmit: (brief: CampaignBrief) => void;
  isLoading: boolean;
}

const emptyProduct: Product = { name: '', description: '' };

const initialBrief: CampaignBrief = {
  brandName: '',
  campaignMessage: '',
  campaignGoal: 'awareness',
  targetAudience: '',
  targetRegion: '',
  toneStyle: 'professional',
  ctaText: '',
  colorPalette: [],
  brandGuidelines: '',
  competitorReferences: '',
  products: [{ ...emptyProduct }],
};

export default function BriefForm({ onSubmit, isLoading }: BriefFormProps) {
  const [brief, setBrief] = useState<CampaignBrief>(initialBrief);
  const [colorInput, setColorInput] = useState('');

  const updateField = <K extends keyof CampaignBrief>(
    field: K,
    value: CampaignBrief[K]
  ) => {
    setBrief((prev) => ({ ...prev, [field]: value }));
  };

  const handleProductChange = (index: number, product: Product) => {
    const updated = [...brief.products];
    updated[index] = product;
    updateField('products', updated);
  };

  const addProduct = () => {
    updateField('products', [...brief.products, { ...emptyProduct }]);
  };

  const removeProduct = (index: number) => {
    updateField('products', brief.products.filter((_, i) => i !== index));
  };

  const addColor = () => {
    const trimmed = colorInput.trim();
    if (trimmed && !brief.colorPalette.includes(trimmed)) {
      updateField('colorPalette', [...brief.colorPalette, trimmed]);
      setColorInput('');
    }
  };

  const removeColor = (color: string) => {
    updateField('colorPalette', brief.colorPalette.filter((c) => c !== color));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(brief);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Brand & Campaign Info */}
      <div className="card">
        <h2 className="section-title">Brand & Campaign</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Brand Name *</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Nike"
              value={brief.brandName}
              onChange={(e) => updateField('brandName', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Campaign Goal</label>
            <select
              className="select-field"
              value={brief.campaignGoal}
              onChange={(e) => updateField('campaignGoal', e.target.value as CampaignBrief['campaignGoal'])}
            >
              <option value="awareness">Awareness</option>
              <option value="conversion">Conversion</option>
              <option value="engagement">Engagement</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="label">Campaign Message *</label>
            <textarea
              className="textarea-field"
              rows={2}
              placeholder="The key marketing message for this campaign..."
              value={brief.campaignMessage}
              onChange={(e) => updateField('campaignMessage', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">CTA Text</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Shop Now, Learn More"
              value={brief.ctaText}
              onChange={(e) => updateField('ctaText', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Target Audience & Style */}
      <div className="card">
        <h2 className="section-title">Targeting & Style</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Target Audience</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Young professionals aged 25-35"
              value={brief.targetAudience}
              onChange={(e) => updateField('targetAudience', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Target Region / Market</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. US West Coast, UK, APAC"
              value={brief.targetRegion}
              onChange={(e) => updateField('targetRegion', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Tone & Style</label>
            <select
              className="select-field"
              value={brief.toneStyle}
              onChange={(e) => updateField('toneStyle', e.target.value as CampaignBrief['toneStyle'])}
            >
              <option value="professional">Professional</option>
              <option value="playful">Playful</option>
              <option value="bold">Bold</option>
              <option value="elegant">Elegant</option>
              <option value="minimal">Minimal</option>
              <option value="edgy">Edgy</option>
            </select>
          </div>

          <div>
            <label className="label">Color Palette</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field flex-1"
                placeholder="#FF5733 or red"
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addColor();
                  }
                }}
              />
              <button type="button" onClick={addColor} className="btn-secondary !px-4">
                Add
              </button>
            </div>
            {brief.colorPalette.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {brief.colorPalette.map((color) => (
                  <span
                    key={color}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                  >
                    <span
                      className="inline-block w-3 h-3 rounded-full border border-gray-200"
                      style={{ backgroundColor: color }}
                    />
                    {color}
                    <button
                      type="button"
                      onClick={() => removeColor(color)}
                      className="ml-1 text-brand-400 hover:text-brand-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Brand Guidelines & Competitors */}
      <div className="card">
        <h2 className="section-title">Guidelines & References</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Brand Guidelines</label>
            <textarea
              className="textarea-field"
              rows={3}
              placeholder="Any specific brand guidelines, do's and don'ts..."
              value={brief.brandGuidelines}
              onChange={(e) => updateField('brandGuidelines', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Competitor References</label>
            <textarea
              className="textarea-field"
              rows={3}
              placeholder="URLs or descriptions of competitor ads you like..."
              value={brief.competitorReferences}
              onChange={(e) => updateField('competitorReferences', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title !mb-0">Products</h2>
          <button type="button" onClick={addProduct} className="btn-secondary !py-2 !px-4 text-xs">
            + Add Another Product
          </button>
        </div>
        <div className="space-y-4">
          {brief.products.map((product, index) => (
            <ProductForm
              key={index}
              product={product}
              index={index}
              canRemove={brief.products.length > 1}
              onChange={handleProductChange}
              onRemove={removeProduct}
            />
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !brief.brandName || !brief.campaignMessage || !brief.products[0]?.name}
        className="btn-primary w-full !py-4 text-base"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating Images...
          </>
        ) : (
          'Generate Ad Images'
        )}
      </button>
    </form>
  );
}
