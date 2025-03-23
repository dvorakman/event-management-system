declare module 'cobe' {
  export interface Marker {
    location: [number, number];
    size: number;
  }

  export interface COBEOptions {
    width: number;
    height: number;
    onRender: (state: Record<string, any>) => void;
    devicePixelRatio?: number;
    phi?: number;
    theta?: number;
    dark?: number;
    diffuse?: number;
    mapSamples?: number;
    mapBrightness?: number;
    baseColor?: [number, number, number];
    markerColor?: [number, number, number];
    glowColor?: [number, number, number];
    markers?: Marker[];
  }

  export interface Globe {
    destroy: () => void;
  }

  function createGlobe(canvas: HTMLCanvasElement | null, options: COBEOptions): Globe;
  
  export default createGlobe;
} 