import { CampaignBrief, MissingAsset, AspectRatioConfig } from '../types/index.js';

export function buildMissingAssetPrompt(missingAsset: MissingAsset): string {
  return `Generate a high-quality, professional product photograph of the following item on a clean, neutral background. The image should be well-lit, detailed, and suitable for use in a marketing advertisement.

Item description: ${missingAsset.description}

Style: Clean product photography, studio lighting, no text or watermarks.`;
}

export function buildHeroImagePrompt(
  brief: CampaignBrief,
  aspectRatio: AspectRatioConfig
): string {
  const productsList = brief.products
    .map((p, i) => `  ${i + 1}. ${p.name}: ${p.description}`)
    .join('\n');

  const colorInfo = brief.colorPalette.length > 0
    ? `Use these brand colors prominently: ${brief.colorPalette.join(', ')}.`
    : '';

  const guidelinesInfo = brief.brandGuidelines
    ? `Brand guidelines: ${brief.brandGuidelines}`
    : '';

  const competitorInfo = brief.competitorReferences
    ? `Competitor references for style inspiration: ${brief.competitorReferences}`
    : '';

  const regionInfo = brief.targetRegion
    ? `Target market/region: ${brief.targetRegion}.`
    : '';

  return `Create a stunning, professional social media advertisement image for ${brief.brandName}.

Campaign Goal: ${brief.campaignGoal}
Target Audience: ${brief.targetAudience}
${regionInfo}
Tone & Style: ${brief.toneStyle}

Products featured:
${productsList}

Campaign Message: "${brief.campaignMessage}"
Call to Action: "${brief.ctaText}"

${colorInfo}
${guidelinesInfo}
${competitorInfo}

Image dimensions: ${aspectRatio.width}x${aspectRatio.height} (${aspectRatio.ratio} aspect ratio, ${aspectRatio.label}).

IMPORTANT LAYOUT INSTRUCTIONS:
- The main visual should feature the product(s) prominently in the center/upper area of the image.
- At the BOTTOM of the image, include a semi-transparent dark bar or banner that spans the full width.
- On this bottom bar, display the brand logo (if provided) on the left side and the campaign message "${brief.campaignMessage}" in large, bold, highly readable white text.
- The call-to-action "${brief.ctaText}" should appear as a button or highlighted text near the campaign message.
- Ensure all text is crisp, legible, and contrasts well against the background.
- The overall design should feel ${brief.toneStyle}, modern, and professional.`.trim();
}
