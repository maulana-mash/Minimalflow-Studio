import type { FlowNode } from './node';
import type { FlowConnector } from './connector';

export type WorkspacePresetKey = 
  | '16:9_landscape' 
  | '9:16_portrait' 
  | 'a4_landscape' 
  | 'a4_portrait' 
  | 'square';

export interface FlowWorkspace {
  preset: string;
  orientation: 'landscape' | 'portrait';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasState {
  pan: { x: number; y: number };
  zoom: number;
  gridSize: number;
  workspace: FlowWorkspace;
}

export interface FlowDocument {
  version: string;
  canvas: CanvasState;
  theme: 'light' | 'dark';
  nodes: Record<string, FlowNode>;
  edges: Record<string, FlowConnector>;
}

export interface FlowProjectItem {
  id: string;
  name: string;
  updatedAt: number;
  document: FlowDocument;
}

export interface FlowProjectsStorage {
  activeId: string;
  projects: Record<string, FlowProjectItem>;
}

export type UIMode = 
  | 'IDLE' 
  | 'PANNING' 
  | 'DRAGGING_NODE' 
  | 'RESIZING_NODE' 
  | 'PIN_DOWN' 
  | 'DRAWING_WIRE' 
  | 'DRAGGING_HANDLE' 
  | 'EDITING_TEXT';

export interface UIState {
  mode: UIMode;
  selectedType: 'node' | 'edge' | null;
  selectedId: string | null;
  hoveredNodeId: string | null;
  activePin: { nodeId: string; pin: string } | null;
  draftWire: { x1: number; y1: number; x2: number; y2: number } | null;
  pendingPinSource: { nodeId: string; pin: string } | null;
  dragStartPos: { x: number; y: number };
  nodeInitialPos: { x: number; y: number };
  handleInitialOffset: { dx: number; dy: number };
  resizeStart: { x: number; y: number; w: number; h: number; corner: string; nodeId: string | null };
  clipboardNode: FlowNode | null;
  contextMenuPos: { x: number; y: number; targetType: 'node' | 'edge' | 'canvas' | null; targetId: string | null };
  lastClickTime: number;
  lastClickNodeId: string | null;
  history: {
    past: string[];
    future: string[];
  };
}
