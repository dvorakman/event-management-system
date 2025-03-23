"use client";

import dynamic from 'next/dynamic';

// Import the World component with dynamic import and disable SSR
const World = dynamic(() => import('~/components/ui/globe').then(mod => mod.World), {
  ssr: false,
});

// Sample event data for the globe visualization
// REDUCED the total number of locations to minimize blue dots
const SAMPLE_LOCATIONS = [
  { lat: 40.7128, lng: -74.006, color: "#4299e1" }, // New York
  { lat: 51.5074, lng: -0.1278, color: "#3182ce" }, // London
  { lat: 35.6762, lng: 139.6503, color: "#2b6cb0" }, // Tokyo
  { lat: -33.8688, lng: 151.2093, color: "#2c5282" }, // Sydney
  { lat: 48.8566, lng: 2.3522, color: "#2a4365" }, // Paris
  { lat: 37.7749, lng: -122.4194, color: "#4299e1" }, // San Francisco
  { lat: 19.4326, lng: -99.1332, color: "#2b6cb0" }, // Mexico City
  { lat: -22.9068, lng: -43.1729, color: "#2c5282" }, // Rio de Janeiro
  { lat: 25.276987, lng: 55.296249, color: "#2a4365" }, // Dubai
  // Keeping only a few white dots for major capitals
  { lat: 52.52, lng: 13.405, color: "#fff" }, // Berlin
  { lat: 41.9028, lng: 12.4964, color: "#fff" }, // Rome
];

// Define a type for the location data
type LocationData = {
  lat: number;
  lng: number;
  color: string;
};

// Create arc data from the sample locations
function createGlobeData() {
  const data = [];
  let order = 0;

  // Ensure the array bounds are properly checked
  for (let i = 0; i < SAMPLE_LOCATIONS.length; i++) {
    const startLocation = SAMPLE_LOCATIONS[i] as LocationData;

    for (let j = i + 1; j < SAMPLE_LOCATIONS.length; j++) {
      // INCREASED threshold to generate FEWER connections (from 0.7 to 0.85)
      if (Math.random() > 0.85) continue; // Generate only ~15% of possible connections

      const endLocation = SAMPLE_LOCATIONS[j] as LocationData;

      data.push({
        order: order++,
        startLat: startLocation.lat,
        startLng: startLocation.lng,
        endLat: endLocation.lat,
        endLng: endLocation.lng,
        arcAlt: 0.3 + Math.random() * 0.5, // Random arc height
        color: startLocation.color,
      });
    }
  }

  return data;
}

export function GlobeWrapper() {
  // Set up the globe configuration with a dark color
  const globeConfig = {
    // Core globe appearance
    globeColor: "#061941", // Rich dark blue for oceans
    emissive: "rgb(1,10,20)", // Deeper blue emissive color
    emissiveIntensity: 0.06,
    shininess: 0.75,

    // Atmosphere settings
    atmosphereColor: "#5b92f1",
    showAtmosphere: true,
    atmosphereAltitude: 0.15,

    // Hexagon polygon settings (landmass white dots)
    hexPolygonResolution: 3, // Higher resolution for more defined landmasses
    hexPolygonMargin: 0.35, // Larger margin to prevent continents from visually merging
    polygonColor: "rgba(255,255,255,0.8)", // Slightly lower opacity for a softer look

    // Connection points settings
    pointSize: 0.8, // Smaller size for more subtle points
    pointRadius: 1.5, // Smaller radius for less prominent points
    pointsMerge: true, // Merge points to reduce visual clutter

    // Animation
    autoRotate: true,
    autoRotateSpeed: 0.5,
  };

  // Create globe data
  const globeData = createGlobeData();

  return (
    <div className="h-full w-full">
      <World globeConfig={globeConfig} data={globeData} />
    </div>
  );
}
