import type { FlowNode } from '../types';

let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!measureCtx) {
    const canvas = document.createElement('canvas');
    measureCtx = canvas.getContext('2d');
  }
  return measureCtx;
}

export interface TextLayoutResult {
  lines: string[];
  xPos: number;
  startY: number;
  lineHeight: number;
  anchor: 'start' | 'middle' | 'end';
  totalTextHeight: number;
}

export function layoutNodeText(node: FlowNode): TextLayoutResult {
  if (!node.text) {
    return { lines: [], xPos: 0, startY: 0, lineHeight: 14, anchor: "middle", totalTextHeight: 0 };
  }

  const { width, height, text } = node;
  const paddingX = text.paddingX !== undefined ? text.paddingX : 14;
  const paddingY = text.paddingY !== undefined ? text.paddingY : 10;

  // Safe zone reduction berdasarkan geometri shape
  let shapeSafeReduction = 0;
  if (node.type === "parallelogram") shapeSafeReduction = height * 0.28;
  else if (node.type === "diamond") shapeSafeReduction = width * 0.28;
  else if (node.type === "triangle") shapeSafeReduction = width * 0.30;
  else if (node.type === "circle") shapeSafeReduction = width * 0.20;

  const maxWidth = Math.max(20, width - (paddingX * 2) - shapeSafeReduction);
  const lineHeight = text.fontSize * 1.35;

  const ctx = getMeasureContext();
  if (ctx) {
    const fontStyle = text.italic ? "italic " : "";
    const fontWeight = text.bold ? "700 " : "500 ";
    ctx.font = `${fontStyle}${fontWeight}${text.fontSize}px ${text.fontFamily}`;
  }

  function measureTextWidth(str: string): number {
    if (!ctx) return str.length * text.fontSize * 0.6;
    return ctx.measureText(str).width;
  }

  // Pecah kata panjang yang tidak punya spasi per-karakter agar tidak tembus keluar batas chart
  function breakWordIfNeeded(w: string): string[] {
    if (!w) return [""];
    if (measureTextWidth(w) <= maxWidth) return [w];
    const chunks: string[] = [];
    let cur = "";
    for (let i = 0; i < w.length; i++) {
      const ch = w[i];
      if (measureTextWidth(cur + ch) <= maxWidth) {
        cur += ch;
      } else {
        if (cur) chunks.push(cur);
        cur = ch;
      }
    }
    if (cur) chunks.push(cur);
    return chunks.length > 0 ? chunks : [w];
  }

  const content = text.content || "";
  const paragraphs = content.split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    const rawWords = para.split(" ");
    const words: string[] = [];
    for (const rw of rawWords) {
      const broken = breakWordIfNeeded(rw);
      words.push(...broken);
    }

    let currentLine = words[0] || "";
    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + " " + words[i];
      if (measureTextWidth(testLine) <= maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
  }

  let anchor: 'start' | 'middle' | 'end' = "middle";
  let xPos = width / 2;
  if (text.align === "left") {
    anchor = "start";
    xPos = paddingX + (shapeSafeReduction / 2);
  }
  if (text.align === "right") {
    anchor = "end";
    xPos = width - paddingX - (shapeSafeReduction / 2);
  }

  const totalTextHeight = lines.length * lineHeight;
  const availableHeight = height - paddingY * 2;
  const startY = paddingY + (availableHeight - totalTextHeight) / 2 + text.fontSize * 0.85;

  return { lines, xPos, startY, lineHeight, anchor, totalTextHeight };
}
