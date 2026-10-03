import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BriefForm from './BriefForm';

const OTHER_GUIDELINES_PLACEHOLDER =
  "Anything else the ad should follow - e.g. no people in the shot, avoid the color red, include a 'Limited Time' badge";

function renderBriefForm(onSubmit = vi.fn()) {
  return render(
    <BriefForm
      onSubmit={onSubmit}
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

  describe('Other Guidelines field', () => {
    it('renders the label and placeholder', () => {
      renderBriefForm();

      expect(screen.getByText('Other Guidelines')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(OTHER_GUIDELINES_PLACEHOLDER)).toBeInTheDocument();
    });

    it('comes after Competitor References', () => {
      renderBriefForm();

      const competitor = screen.getByPlaceholderText('URLs or descriptions of competitor ads you like...');
      const other = screen.getByPlaceholderText(OTHER_GUIDELINES_PLACEHOLDER);
      expect(competitor.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('passes the typed value to onSubmit', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      renderBriefForm(onSubmit);

      await user.type(screen.getByPlaceholderText('e.g. Nike'), 'Acme Coffee');
      await user.type(
        screen.getByPlaceholderText('The key marketing message for this campaign...'),
        'Wake up better'
      );
      await user.type(screen.getByPlaceholderText('e.g. Air Max 2026'), 'Dark Roast Beans');
      await user.type(screen.getByPlaceholderText(OTHER_GUIDELINES_PLACEHOLDER), 'No people in the shot');
      await user.click(screen.getByRole('button', { name: 'Generate Ad Images' }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit.mock.calls[0][0]).toMatchObject({
        brandName: 'Acme Coffee',
        campaignMessage: 'Wake up better',
        otherGuidelines: 'No people in the shot',
      });
    });
  });
});
