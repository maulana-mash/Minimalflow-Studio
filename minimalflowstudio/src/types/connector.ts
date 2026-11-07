import type { PinDirection } from './node';

export type LineStyle = 'step' | 'bezier' | 'straight';

export type MarkerType = 'none' | 'arrow';

export interface ConnectorEndpoint {
  nodeId: string;
  pin: PinDirection;
}

export interface ConnectorStyle {
  stroke: string;
  strokeWidth: number; // 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0 px
  dashed: 'solid' | 'dashed';
  markerStart: MarkerType;
  markerEnd: MarkerType;
}

export interface FlowConnector {
  id: string;
  type: LineStyle;
  source: ConnectorEndpoint;
  target: ConnectorEndpoint;
  handleOffset: {
    dx: number;
    dy: number;
  };
  style: ConnectorStyle;
}
