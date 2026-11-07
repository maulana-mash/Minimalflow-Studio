import type { NodeType, WorkspacePresetKey } from '../types';

export const WORKSPACE_PRESETS: Record<string, { w: number; h: number; name: string }> = {
  "16:9_landscape": { w: 1600, h: 900, name: "16:9 Landscape" },
  "9:16_portrait":  { w: 900, h: 1600, name: "9:16 Portrait" },
  "a4_landscape":   { w: 1414, h: 1000, name: "A4 Landscape" },
  "a4_portrait":    { w: 1000, h: 1414, name: "A4 Portrait" },
  "square":         { w: 1200, h: 1200, name: "Persegi (Square)" }
};

export function screenToWorld(
  clientX: number,
  clientY: number,
  svgRect: DOMRect,
  pan: { x: number; y: number },
  zoom: number
): { x: number; y: number } {
  return {
    x: Math.round((clientX - svgRect.left - pan.x) / zoom),
    y: Math.round((clientY - svgRect.top - pan.y) / zoom)
  };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  pan: { x: number; y: number },
  zoom: number
): { x: number; y: number } {
  return {
    x: worldX * zoom + pan.x,
    y: worldY * zoom + pan.y
  };
}

export function rotatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  angleDeg: number
): { x: number; y: number } {
  if (!angleDeg) return { x: px, y: py };
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos
  };
}

export function getShapePath(type: NodeType, w: number, h: number): string {
  switch (type) {
    case "rectangle":
      return `M 0 0 H ${w} V ${h} H 0 Z`;
    case "rounded": {
      const r = Math.min(w, h) / 2;
      return `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
    }
    case "circle": {
      const rx = w / 2, ry = h / 2;
      return `M 0 ${ry} A ${rx} ${ry} 0 1 0 ${w} ${ry} A ${rx} ${ry} 0 1 0 0 ${ry} Z`;
    }
    case "diamond":
      return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`;
    case "triangle":
      return `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`;
    case "parallelogram": {
      const skew = Math.min(w * 0.2, 28);
      return `M ${skew} 0 L ${w} 0 L ${w - skew} ${h} L 0 ${h} Z`;
    }
    case "cylinder": {
      const ry = Math.min(h * 0.16, 16);
      const rx = w / 2;
      return `M 0 ${ry} A ${rx} ${ry} 0 0 1 ${w} ${ry} V ${h - ry} A ${rx} ${ry} 0 0 1 0 ${h - ry} Z M 0 ${ry} A ${rx} ${ry} 0 0 0 ${w} ${ry}`;
    }
    default:
      return `M 0 0 H ${w} V ${h} H 0 Z`;
  }
}
