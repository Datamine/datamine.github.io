import { BILLBOARD_ADS } from '../billboards/catalog.js';

// Normal art is editable in billboards/. The hidden layer stays here so edits
// to ordinary advertisements never change the sunglasses quest.
const billboardAssetURL = (name) =>
  new URL('../billboards/' + encodeURIComponent(name), import.meta.url).href;
const REVEALED_BILLBOARD_MESSAGES = Object.freeze({
  'ts-cola': 'CONSUME',
  'ts-broadway': 'CONFORM',
  'ts-market': 'OBEY',
  'ts-think': 'DO NOT\nQUESTION',
  'ts-moonshot': 'STAY\nASLEEP',
  'ts-night': 'SUBMIT',
  'ai-openai': 'BUY',
  'ai-anthropic': "DON'T\nTHINK",
  'ai-xai': 'BELIEVE',
  'beach-getaway': 'OBEY',
  'green-bank-roof': 'OBEY',
});
export const BILLBOARD_ART = Object.freeze(
  BILLBOARD_ADS.map((ad) =>
    Object.freeze({
      ...ad,
      message: REVEALED_BILLBOARD_MESSAGES[ad.id],
      src: billboardAssetURL(ad.file),
    }),
  ),
);

/** The hidden layer is stark typography, generated once per equipment change.
 * It occupies the same atlas cells and uses the same UVs as the colorful ads. */
export function drawRevealedBillboard(ctx, art, x, y, size = 256) {
  const pad = size * 0.045,
    lines = art.message.split('\n'),
    lineHeight = (size * 0.67) / lines.length;
  ctx.fillStyle = '#f1f0e9';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#111512';
  ctx.fillRect(x + pad, y + pad, size - pad * 2, size * 0.035);
  ctx.fillRect(x + pad, y + size - pad - size * 0.035, size - pad * 2, size * 0.035);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.min(size * 0.37, lineHeight)}px Impact, 'Arial Black', sans-serif`;
  for (const [i, line] of lines.entries())
    ctx.fillText(
      line,
      x + size / 2,
      y + size / 2 + (i - (lines.length - 1) / 2) * lineHeight,
      size * 0.89,
    );
}
