"use client";

import dynamic from 'next/dynamic';
import type { COBEOptions } from 'cobe';

// Import the Globe component with dynamic import and disable SSR
const Globe = dynamic(() => import('~/components/ui/globe').then(mod => mod.Globe), {
  ssr: false,
});

export function GlobeWrapper() {
  // Set up the globe configuration matching COBEOptions interface
  const globeConfig: COBEOptions = {
    width: 800,
    height: 800,
    onRender: () => {
      // This is intentionally empty as the rendering is handled by the Globe component
    },
    devicePixelRatio: 2,
    phi: 0,
    theta: 0.3,
    dark: 1,
    diffuse: 0.4,
    mapSamples: 16000,
    mapBrightness: 1.2,
    baseColor: [0.1, 0.2, 0.5], // Dark blue for oceans
    markerColor: [1, 1, 1],
    glowColor: [0.3, 0.4, 0.9],
    markers: [
      // Markers for various cities
      { location: [40.7128, -74.006], size: 0.05 }, // New York
      { location: [51.5074, -0.1278], size: 0.05 }, // London
      { location: [35.6762, 139.6503], size: 0.05 }, // Tokyo
      { location: [-33.8688, 151.2093], size: 0.05 }, // Sydney
      { location: [48.8566, 2.3522], size: 0.05 }, // Paris
      { location: [37.7749, -122.4194], size: 0.05 }, // San Francisco
      { location: [19.4326, -99.1332], size: 0.05 }, // Mexico City
      { location: [-22.9068, -43.1729], size: 0.05 }, // Rio de Janeiro
      { location: [25.276987, 55.296249], size: 0.05 }, // Dubai
      { location: [52.52, 13.405], size: 0.05 }, // Berlin
      { location: [41.9028, 12.4964], size: 0.05 }, // Rome
    ],
  };

  return (
    <div className="h-full w-full">
      <Globe config={globeConfig} className="h-full w-full" />
    </div>
  );
}
