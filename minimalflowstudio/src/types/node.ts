export type NodeType = 
  | 'rectangle' 
  | 'rounded' 
  | 'circle' 
  | 'diamond' 
  | 'triangle' 
  | 'parallelogram' 
  | 'cylinder' 
  | 'image';

export type PinDirection = 'N' | 'E' | 'S' | 'W';

export interface MagneticPin {
  id: PinDirection;
  x: number;
  y: number;
  direction: PinDirection;
}

export interface NodeText {
  content: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  align: 'left' | 'center' | 'right';
  paddingX: number;
  paddingY: number;
  isPlaceholder?: boolean;
}

export interface NodeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface FlowNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  style: NodeStyle;
  text: NodeText;
  src?: string; // Khusus NodeType image (dataURL / SVG)
}
