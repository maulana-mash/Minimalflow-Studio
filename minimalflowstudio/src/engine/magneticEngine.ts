import type { FlowNode, MagneticPin, PinDirection } from '../types';
import { rotatePoint } from './canvasRenderer';

export function getNodePinCoordinates(node: FlowNode, pin: PinDirection): { x: number; y: number } {
  const { x, y, width: w, height: h, type, rotation = 0 } = node;
  let localP = { x: w / 2, y: h / 2 };

  switch (pin) {
    case "N": 
      localP = { x: w / 2, y: 0 }; 
      break;
    case "S": 
      localP = { x: w / 2, y: h }; 
      break;
    case "E": {
      if (type === "triangle") localP = { x: w * 0.75, y: h / 2 };
      else if (type === "parallelogram") localP = { x: w - Math.min(w * 0.2, 28) / 2, y: h / 2 };
      else localP = { x: w, y: h / 2 };
      break;
    }
    case "W": {
      if (type === "triangle") localP = { x: w * 0.25, y: h / 2 };
      else if (type === "parallelogram") localP = { x: Math.min(w * 0.2, 28) / 2, y: h / 2 };
      else localP = { x: 0, y: h / 2 };
      break;
    }
  }

  const rotP = rotatePoint(localP.x, localP.y, w / 2, h / 2, rotation);
  return { x: x + rotP.x, y: y + rotP.y };
}

export function getNodePinNormal(pin: PinDirection, rotation = 0): { x: number; y: number } {
  const baseNormals: Record<PinDirection, { x: number; y: number }> = {
    N: { x: 0, y: -1 },
    E: { x: 1, y: 0 },
    S: { x: 0, y: 1 },
    W: { x: -1, y: 0 }
  };
  const n = baseNormals[pin] || { x: 0, y: 0 };
  return rotatePoint(n.x, n.y, 0, 0, rotation);
}

export function getAllNodePins(node: FlowNode): MagneticPin[] {
  const directions: PinDirection[] = ['N', 'E', 'S', 'W'];
  return directions.map(dir => {
    const coords = getNodePinCoordinates(node, dir);
    return {
      id: dir,
      x: coords.x,
      y: coords.y,
      direction: dir
    };
  });
}
