import type { Product } from '../types';

interface ProductFormProps {
  product: Product;
  index: number;
  canRemove: boolean;
  onChange: (index: number, product: Product) => void;
  onRemove: (index: number) => void;
}

export default function ProductForm({
  product,
  index,
  canRemove,
  onChange,
  onRemove,
}: ProductFormProps) {
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
      </div>
    </div>
  );
}
