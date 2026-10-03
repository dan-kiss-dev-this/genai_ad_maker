import { CampaignBrief, GenerateRequest } from '../types/index.js';

/** A brief that passes validation, with every optional text field left empty. */
export function validBrief(overrides: Partial<CampaignBrief> = {}): CampaignBrief {
  return {
    brandName: 'Acme Coffee',
    campaignMessage: 'Wake up better',
    campaignGoal: 'awareness',
    targetAudience: 'Urban professionals aged 25-40',
    targetRegion: 'North America',
    toneStyle: 'bold',
    ctaText: 'Shop now',
    colorPalette: ['#1A1A1A', '#D4A373'],
    brandGuidelines: '',
    competitorReferences: '',
    products: [{ name: 'Dark Roast Beans', description: 'Single-origin whole beans' }],
    ...overrides,
  };
}

/** A `POST /api/generate` body with no uploaded assets and no missing assets. */
export function generateRequest(
  overrides: Partial<CampaignBrief> = {}
): GenerateRequest {
  return {
    brief: validBrief(overrides),
    assets: [],
    missingAssets: [],
  };
}
