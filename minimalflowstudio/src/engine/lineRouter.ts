import type { FlowConnector, FlowNode } from '../types';
import { getNodePinCoordinates, getNodePinNormal } from './magneticEngine';

export function simplifyOrthogonalPoints(pts: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (pts.length <= 2) return pts;
  const clean = [pts[0]];

  for (let i = 1; i < pts.length; i++) {
    const prev = clean[clean.length - 1];
    const curr = pts[i];
    if (Math.abs(curr.x - prev.x) < 0.5 && Math.abs(curr.y - prev.y) < 0.5) continue;

    if (clean.length >= 2) {
      const pprev = clean[clean.length - 2];
      // Jika segmen vertikal berturut-turut, gabungkan
      if (Math.abs(pprev.y - prev.y) < 0.5 && Math.abs(prev.y - curr.y) < 0.5) {
        clean[clean.length - 1] = curr;
        continue;
      }
      // Jika segmen horizontal berturut-turut, gabungkan
      if (Math.abs(pprev.x - prev.x) < 0.5 && Math.abs(prev.x - curr.x) < 0.5) {
        clean[clean.length - 1] = curr;
        continue;
      }
    }
    clean.push(curr);
  }
  return clean;
}

export function calculateEdgePath(
  edge: FlowConnector,
  sourceNode: FlowNode,
  targetNode: FlowNode
): { pathD: string; handlePos: { x: number; y: number } } {
  if (!sourceNode || !targetNode) return { pathD: "", handlePos: { x: 0, y: 0 } };

  const P1 = getNodePinCoordinates(sourceNode, edge.source.pin);
  const P2 = getNodePinCoordinates(targetNode, edge.target.pin);
  const n1 = getNodePinNormal(edge.source.pin, sourceNode.rotation || 0);
  const n2 = getNodePinNormal(edge.target.pin, targetNode.rotation || 0);
  const offset = edge.handleOffset || { dx: 0, dy: 0 };

  // 1. STRAIGHT CONNECTOR
  if (edge.type === "straight") {
    const midX = (P1.x + P2.x) / 2;
    const midY = (P1.y + P2.y) / 2;
    const H = { x: midX + offset.dx, y: midY + offset.dy };
    const distToLine = Math.hypot(offset.dx, offset.dy);
    if (distToLine > 4) {
      return {
        pathD: `M ${P1.x} ${P1.y} L ${H.x} ${H.y} L ${P2.x} ${P2.y}`,
        handlePos: H
      };
    }
    return {
      pathD: `M ${P1.x} ${P1.y} L ${P2.x} ${P2.y}`,
      handlePos: { x: midX, y: midY }
    };
  }

  // 2. BEZIER CONNECTOR
  if (edge.type === "bezier") {
    const dist = Math.max(Math.hypot(P2.x - P1.x, P2.y - P1.y) * 0.45, 40);
    const C1base = { x: P1.x + n1.x * dist, y: P1.y + n1.y * dist };
    const C2base = { x: P2.x + n2.x * dist, y: P2.y + n2.y * dist };

    const midBase = {
      x: 0.125 * (P1.x + P2.x) + 0.375 * (C1base.x + C2base.x),
      y: 0.125 * (P1.y + P2.y) + 0.375 * (C1base.y + C2base.y)
    };

    const handlePos = { x: midBase.x + offset.dx, y: midBase.y + offset.dy };
    const C1 = { x: C1base.x + (4 / 3) * offset.dx, y: C1base.y + (4 / 3) * offset.dy };
    const C2 = { x: C2base.x + (4 / 3) * offset.dx, y: C2base.y + (4 / 3) * offset.dy };

    return {
      pathD: `M ${P1.x} ${P1.y} C ${C1.x} ${C1.y}, ${C2.x} ${C2.y}, ${P2.x} ${P2.y}`,
      handlePos
    };
  }

  // 3. STEP / ORTHOGONAL (MANHATTAN) CONNECTOR
  const stub = 20;
  const S1 = { x: P1.x + n1.x * stub, y: P1.y + n1.y * stub };
  const S2 = { x: P2.x + n2.x * stub, y: P2.y + n2.y * stub };

  const isSourceH = Math.abs(n1.x) > Math.abs(n1.y);
  const isTargetH = Math.abs(n2.x) > Math.abs(n2.y);

  let rawPoints: Array<{ x: number; y: number }> = [];
  let handlePos = { x: 0, y: 0 };

  if (isSourceH && isTargetH) {
    let defaultXm = (S1.x + S2.x) / 2;
    if (n1.x > 0 && n2.x > 0) defaultXm = Math.max(S1.x, S2.x) + 24;
    if (n1.x < 0 && n2.x < 0) defaultXm = Math.min(S1.x, S2.x) - 24;

    const xm = defaultXm + offset.dx;
    const ym = (S1.y + S2.y) / 2 + offset.dy;
    handlePos = { x: xm, y: ym };

    rawPoints = [
      P1,
      S1,
      { x: xm, y: S1.y },
      { x: xm, y: S2.y },
      S2,
      P2
    ];
  } else if (!isSourceH && !isTargetH) {
    let defaultYm = (S1.y + S2.y) / 2;
    if (n1.y > 0 && n2.y > 0) defaultYm = Math.max(S1.y, S2.y) + 24;
    if (n1.y < 0 && n2.y < 0) defaultYm = Math.min(S1.y, S2.y) - 24;

    const ym = defaultYm + offset.dy;
    const xm = (S1.x + S2.x) / 2 + offset.dx;
    handlePos = { x: xm, y: ym };

    rawPoints = [
      P1,
      S1,
      { x: S1.x, y: ym },
      { x: S2.x, y: ym },
      S2,
      P2
    ];
  } else if (isSourceH && !isTargetH) {
    const xm = S2.x + offset.dx;
    const ym = S1.y + offset.dy;
    handlePos = { x: xm, y: ym };

    rawPoints = [
      P1,
      S1,
      { x: xm, y: S1.y },
      { x: xm, y: ym },
      { x: S2.x, y: ym },
      S2,
      P2
    ];
  } else {
    const xm = S1.x + offset.dx;
    const ym = S2.y + offset.dy;
    handlePos = { x: xm, y: ym };

    rawPoints = [
      P1,
      S1,
      { x: S1.x, y: ym },
      { x: xm, y: ym },
      { x: xm, y: S2.y },
      S2,
      P2
    ];
  }

  const simplified = simplifyOrthogonalPoints(rawPoints);
  const pathD = simplified.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(" ");

  return { pathD, handlePos };
}
