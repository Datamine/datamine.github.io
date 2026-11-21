// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { navigationRegions } from './navigation.ts';
// One vector-symbol catalog drives the minimap, building beacons and guide.
// Shapes remain code-native: no font glyph dependency or downloaded icon set.
export const PLACE_ICONS = Object.freeze({
  home: {
    label: contentText('wayfinding.module.label-1', {}),
    detail: "John's place",
    color: '#e9c76e',
    path: 'M8 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 21v-3c0-5 16-5 16 0v3M8 20v-3m8 3v-3',
  },
  writing: {
    label: contentText('wayfinding.module.label-2', {}),
    detail: 'City Lights · Essays',
    color: '#a9cfff',
    path: 'M4 20l3-7L17 3l4 4-10 10-7 3M7 13l4 4M3 22h10M15 5l4 4',
  },
  books: {
    label: contentText('wayfinding.module.label-3', {}),
    detail: 'Main Library · Reading list',
    color: '#c7b5f3',
    path: 'M12 6Q8 3 3 5v14q5-2 9 1q4-3 9-1V5q-5-2-9 1v14M6 8l3 1m6 0 3-1M6 12l3 1m6 0 3-1',
  },
  links: {
    label: contentText('wayfinding.module.label-4', {}),
    detail: 'Mazarine Coffee · Web links',
    color: '#f2bd8d',
    path: 'M4 7h12v7a6 6 0 0 1-12 0V7M16 8h2a3 3 0 0 1 0 6h-2M3 21h15M7 2v2m5-2v2',
  },
  press: {
    label: contentText('wayfinding.module.label-5', {}),
    detail: 'The newsstand',
    color: '#f3d9a0',
    path: 'M4 3h15v17H4zM19 8h3v10q0 2-3 2M7 6h9M7 10h4v4H7zM14 10h2m-2 4h2M7 17h9',
  },
  green: {
    label: contentText('wayfinding.module.label-6', {}),
    detail: 'Founding · Financial infrastructure',
    color: '#9cdeb7',
    path: 'M5 19C0 8 12 3 21 3c0 9-5 18-13 15M4 22L17 8M11 14v-4m0 4h5',
  },
  limit: {
    label: contentText('wayfinding.module.label-7', {}),
    detail: 'Founding · Insurance technology',
    color: '#9cdbdf',
    path: 'M12 2l9 4v6c0 6-9 10-9 10S3 18 3 12V6zM9 7v9h7',
  },
  rose: {
    label: contentText('wayfinding.module.label-8', {}),
    detail: 'Founding · Healthy homes',
    color: '#eda7b4',
    path: 'M12 5C4-3-1 11 6 12c-7 4 4 13 6 5c2 8 13-1 6-5c7-1 2-15-6-7ZM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M12 18v5',
  },
  venture: {
    label: contentText('wayfinding.module.label-9', {}),
    detail: 'Venture exchange · Companies',
    color: '#eab9f1',
    path: 'M3 21V4M3 21h18M6 16l5-6 4 2 6-8M16 4h5v5',
  },
  'ai-lab': {
    label: contentText('wayfinding.module.label-10', {}),
    detail: 'SoMa · arithmetic interview & employment',
    color: '#9ddde4',
    path: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v4m6-4v4M9 17v4m6-4v4M3 9h4m-4 6h4m10-6h4m-4 6h4',
  },
  etc: {
    label: contentText('wayfinding.module.label-11', {}),
    detail: 'Curiosity shop · Other corners',
    color: '#b7e0c7',
    path: 'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3zM19 2v4m-2-2h4',
  },
});
const miniPaths = new Map<string | number, Path2D>();
export function placeIcon(id: string | number) {
  return PLACE_ICONS[id as keyof typeof PLACE_ICONS] || PLACE_ICONS.etc;
}
export function iconSVG(id: string) {
  const icon = placeIcon(id);
  return (
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' +
    icon.path +
    '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  );
}
export function drawPlaceIcon(
  c: CanvasRenderingContext2D,
  id: string | number,
  x: number,
  y: number,
  r = 5.5,
) {
  const icon = placeIcon(id);
  if (!miniPaths.has(id)) miniPaths.set(id, new Path2D(icon.path));
  c.save();
  c.shadowColor = icon.color;
  c.shadowBlur = 4;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = '#262920';
  c.fill();
  c.strokeStyle = icon.color;
  c.lineWidth = 0.8;
  c.stroke();
  c.shadowBlur = 0;
  c.translate(x - r * 0.77, y - r * 0.77);
  c.scale((r * 1.54) / 24, (r * 1.54) / 24);
  c.lineWidth = 2.6;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.stroke(miniPaths.get(id)!);
  c.restore();
}
export function drawDestinationFlag(c: CanvasRenderingContext2D, x: number, y: number) {
  c.save();
  c.lineWidth = 1.4;
  c.strokeStyle = '#fff0cd';
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x, y - 12);
  c.stroke();
  c.beginPath();
  c.moveTo(x + 0.7, y - 12);
  c.lineTo(x + 8, y - 10);
  c.lineTo(x + 0.7, y - 6);
  c.closePath();
  c.fillStyle = '#ef4438';
  c.fill();
  c.strokeStyle = '#74291e';
  c.lineWidth = 0.7;
  c.stroke();
  c.beginPath();
  c.arc(x, y, 1.7, 0, Math.PI * 2);
  c.fillStyle = '#ef4438';
  c.fill();
  c.restore();
}

/** An orthographic top-down map: yaw rotates it, pitch never enters the
 * transform. The live player position is its origin, shared by rendering and
 * inverse click coordinates, including beyond the city bounds. */
export function createMinimapProjection(
  size: number,
  width: number,
  height: number,
  yaw: number,
  centerX = size / 2,
  centerY = size / 2,
) {
  const scale = (Math.min(width, height) * 0.96) / (size * Math.SQRT2),
    co = Math.cos(yaw),
    si = Math.sin(yaw);
  const a = (co - si) * scale,
    b = (si + co) * scale,
    c = (-co - si) * scale,
    d = (co - si) * scale,
    det = a * d - b * c;
  return {
    a,
    b,
    c,
    d,
    point: (x: number, y: number) => ({
      x: width / 2 + a * (x - centerX) + c * (y - centerY),
      y: height / 2 + b * (x - centerX) + d * (y - centerY),
    }),
    unproject: (x: number, y: number) => ({
      x: centerX + (d * (x - width / 2) - c * (y - height / 2)) / det,
      y: centerY + (-b * (x - width / 2) + a * (y - height / 2)) / det,
    }),
  };
}
/** Canvas borders and CSS scaling affect pointer positions, including the
 * smaller mobile map and scaled landscape layout. */
export function canvasPixelPoint(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, 'width' | 'height' | 'left' | 'top'>,
  metrics: Pick<
    HTMLCanvasElement,
    | 'offsetWidth'
    | 'offsetHeight'
    | 'clientLeft'
    | 'clientTop'
    | 'clientWidth'
    | 'clientHeight'
    | 'width'
    | 'height'
  >,
) {
  const sx = rect.width / metrics.offsetWidth,
    sy = rect.height / metrics.offsetHeight;
  const x =
    ((clientX - rect.left - metrics.clientLeft * sx) / (metrics.clientWidth * sx)) * metrics.width;
  const y =
    ((clientY - rect.top - metrics.clientTop * sy) / (metrics.clientHeight * sy)) * metrics.height;
  return Number.isFinite(x) &&
    Number.isFinite(y) &&
    x >= 0 &&
    y >= 0 &&
    x <= metrics.width &&
    y <= metrics.height
    ? { x, y }
    : null;
}
/** Downtown destinations can be only a few pixels apart at city scale. Small
 * leader lines retain their geographic anchors while readable badges separate. */
export function layoutMinimapIcons<T extends { x: number; y: number }>(
  anchors: readonly T[],
  width: number,
  height: number,
  spacing = 13,
  centerClearance = 0,
) {
  const pad = 7,
    clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const icons = anchors
    .filter((p) => p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height)
    .map((p) => ({
      ...p,
      anchorX: p.x,
      anchorY: p.y,
      x: clamp(p.x, pad, width - pad),
      y: clamp(p.y, pad, height - pad),
    }));
  for (let step = 0; step < 64; step++) {
    if (step < 48)
      for (const p of icons) {
        p.x += (p.anchorX - p.x) * 0.025;
        p.y += (p.anchorY - p.y) * 0.025;
      }
    for (let i = 0; i < icons.length; i++)
      for (let j = i + 1; j < icons.length; j++) {
        const a = icons[i],
          b = icons[j];
        let dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.hypot(dx, dy);
        if (d >= spacing) continue;
        if (d < 0.001) {
          const angle = (i * 7 + j * 3) * 2.39996;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          d = 1;
        }
        const move = (spacing - d) * 0.51;
        a.x -= (dx / d) * move;
        a.y -= (dy / d) * move;
        b.x += (dx / d) * move;
        b.y += (dy / d) * move;
      }
    for (const [i, p] of icons.entries()) {
      const dx = p.x - width / 2,
        dy = p.y - height / 2,
        distance = Math.hypot(dx, dy);
      if (distance < centerClearance) {
        const angle = distance > 0.001 ? Math.atan2(dy, dx) : i * 2.39996;
        p.x = width / 2 + Math.cos(angle) * centerClearance;
        p.y = height / 2 + Math.sin(angle) * centerClearance;
      }
      p.x = clamp(p.x, pad, width - pad);
      p.y = clamp(p.y, pad, height - pad);
    }
  }
  return icons;
}
export function nearestMinimapIcon<T extends { x: number; y: number }>(
  icons: readonly T[],
  x: number,
  y: number,
  radius = 7,
) {
  let best: T | null = null,
    distance = radius;
  for (const p of icons) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < distance) {
      distance = d;
      best = p;
    }
  }
  return best;
}
// Kept as a compatibility export for existing map consumers.
export { navigationRegions };
