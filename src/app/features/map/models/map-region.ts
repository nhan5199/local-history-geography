export interface MapRegion {
  id: string;
  name: string;
  type: 'Phường' | 'Xã';
  path: string;
  cx: number;
  cy: number;
  bounds?: [number, number, number, number];
}
