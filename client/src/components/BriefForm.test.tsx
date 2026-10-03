import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BriefForm from './BriefForm';

function renderBriefForm() {
  return render(
    <BriefForm
      onSubmit={vi.fn()}
      isLoading={false}
      assets={[]}
      missingAssets={[]}
      onAssetsChange={vi.fn()}
      onMissingAssetsChange={vi.fn()}
      error={null}
      onDismissError={vi.fn()}
      generatedPreviews={{}}
      generatingPreview={null}
      onGeneratePreview={vi.fn()}
      onDismissPreview={vi.fn()}
      onAcceptPreview={vi.fn()}
    />
  );
}

describe('BriefForm', () => {
  it('renders the Guidelines & References card', () => {
    renderBriefForm();

    expect(screen.getByRole('heading', { name: /Guidelines & References/ })).toBeInTheDocument();
  });
});
