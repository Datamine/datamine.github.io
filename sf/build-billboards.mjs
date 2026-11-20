import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { BILLBOARD_ADS } from '../billboards/catalog.js';

const billboardDirectory = new URL('../billboards/', import.meta.url);
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Preserve raster bytes; never read a PNG as UTF-8 or mislabel it as SVG. */
export function billboardDataURL(file, bytes) {
  const extension = extname(file).toLowerCase();
  if (extension === '.svg') {
    const svg = bytes.toString('utf8');
    if (!/<svg\b/.test(svg))
      throw new Error(
        'Billboard ' +
          file +
          ' is not an SVG. Change its catalog filename to match the image format.',
      );
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  if (extension === '.png') {
    if (!bytes.subarray(0, 8).equals(pngSignature))
      throw new Error(
        'Billboard ' +
          file +
          ' is not a PNG. Change its catalog filename to match the image format.',
      );
    return 'data:image/png;base64,' + bytes.toString('base64');
  }
  throw new Error('Billboard ' + file + ': use an .svg or .png file.');
}

export async function readBillboardAssets(ads = BILLBOARD_ADS, directory = billboardDirectory) {
  const ids = new Set(),
    files = new Set();
  for (const ad of ads) {
    if (!ad.id || ids.has(ad.id)) throw new Error('Billboard catalog IDs must be unique: ' + ad.id);
    if (typeof ad.file !== 'string' || basename(ad.file) !== ad.file || /[\\/#?]/.test(ad.file))
      throw new Error(
        'Billboard ' + ad.id + ': put the image directly in billboards/ and use its filename.',
      );
    ids.add(ad.id);
    files.add(ad.file);
  }
  return Object.fromEntries(
    await Promise.all(
      [...files].map(async (file) => {
        let bytes;
        try {
          bytes = await readFile(new URL(encodeURIComponent(file), directory));
        } catch (error) {
          throw new Error(
            'Cannot read billboard ' +
              file +
              '. Check billboards/catalog.js and the billboards/ directory.',
            { cause: error },
          );
        }
        return [file, billboardDataURL(file, bytes)];
      }),
    ),
  );
}
