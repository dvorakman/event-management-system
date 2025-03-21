"use client";

import { useRef, useState, useEffect } from "react";
import { Scene, Fog, PerspectiveCamera, Vector3, Color } from "three";
import ThreeGlobe from "three-globe";
import { useThree, Canvas, extend } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import countries from "~/data/globe.json";

// Extend Three.js with ThreeGlobe
declare module "@react-three/fiber" {
  interface ThreeElements {
    threeGlobe: ThreeElements["mesh"] & {
      new (): ThreeGlobe;
    };
  }
}

extend({ ThreeGlobe: ThreeGlobe });

// Simple direct globe component
export function SimpleGlobe() {
  // Sample data for the globe
  const sampleArcs = [
    {
      startLat: 40.7128,
      startLng: -74.006,
      endLat: 51.5074,
      endLng: -0.1278,
      color: "#4299e1",
      arcAlt: 0.5,
      order: 0,
    },
    {
      startLat: 35.6762,
      startLng: 139.6503,
      endLat: -33.8688,
      endLng: 151.2093,
      color: "#3182ce",
      arcAlt: 0.7,
      order: 1,
    },
    {
      startLat: 48.8566,
      startLng: 2.3522,
      endLat: 55.7558,
      endLng: 37.6173,
      color: "#2b6cb0",
      arcAlt: 0.4,
      order: 2,
    },
  ];

  return (
    <div className="h-full w-full">
      <Canvas
        scene={new Scene()}
        camera={new PerspectiveCamera(50, 1.2, 180, 1800)}
      >
        <WebGLRendererConfig />
        <ambientLight color="#ffffff" intensity={0.6} />
        <directionalLight
          color="#ffffff"
          position={new Vector3(-400, 100, 400)}
        />
        <directionalLight
          color="#9ae6ff"
          position={new Vector3(-200, 500, 200)}
        />
        <pointLight
          color="#ffffff"
          position={new Vector3(-200, 500, 200)}
          intensity={0.8}
        />
        <DirectGlobe data={sampleArcs} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minDistance={300}
          maxDistance={300}
          autoRotateSpeed={1}
          autoRotate={true}
          minPolarAngle={Math.PI / 3.5}
          maxPolarAngle={Math.PI - Math.PI / 3}
        />
      </Canvas>
    </div>
  );
}

// WebGL renderer configuration
function WebGLRendererConfig() {
  const { gl, size } = useThree();

  useEffect(() => {
    gl.setPixelRatio(window.devicePixelRatio);
    gl.setSize(size.width, size.height);
    gl.setClearColor(0xffaaff, 0);
  }, [gl, size]);

  return null;
}

// Type definition for arc data
type ArcData = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  arcAlt: number;
  order: number;
};

// The internal globe with direct data
function DirectGlobe({ data }: { data: ArcData[] }) {
  const globeRef = useRef<ThreeGlobe | null>(null);
  const groupRef = useRef<React.RefObject<unknown>>();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize globe
  useEffect(() => {
    if (!globeRef.current && groupRef.current) {
      globeRef.current = new ThreeGlobe();
      (groupRef.current as any).add(globeRef.current);
      setIsInitialized(true);
    }
  }, []);

  // Setup globe when initialized
  useEffect(() => {
    if (!globeRef.current || !isInitialized) return;

    // Style the globe
    const globeMaterial = globeRef.current.globeMaterial() as {
      color: Color;
      emissive: Color;
      emissiveIntensity: number;
      shininess: number;
    };
    globeMaterial.color = new Color("#111111");
    globeMaterial.emissive = new Color("#000000");
    globeMaterial.emissiveIntensity = 0.1;
    globeMaterial.shininess = 0.9;

    // Add country polygons - updated settings for better white dots
    globeRef.current
      .hexPolygonsData(countries.features)
      .hexPolygonResolution(3) // Higher resolution for more detailed landmass
      .hexPolygonMargin(0.35) // Smaller margin for denser white dots
      .showAtmosphere(true)
      .atmosphereColor("#ffffff")
      .atmosphereAltitude(0.1)
      .hexPolygonColor(() => "rgba(255,255,255,0.85)"); // High opacity for better visibility

    // Add arcs
    globeRef.current
      .arcsData(data)
      .arcStartLat((d) => d.startLat)
      .arcStartLng((d) => d.startLng)
      .arcEndLat((d) => d.endLat)
      .arcEndLng((d) => d.endLng)
      .arcColor((e) => e.color)
      .arcAltitude((e) => e.arcAlt)
      .arcStroke(() => [0.32, 0.28, 0.3][Math.round(Math.random() * 2)] || 0.3)
      .arcDashLength(0.9)
      .arcDashInitialGap((e) => e.order)
      .arcDashGap(15)
      .arcDashAnimateTime(() => 2000);

    // Add points - with fewer and less prominent points
    const points = data.flatMap((arc) => [
      { lat: arc.startLat, lng: arc.startLng, color: arc.color, size: 1 },
      { lat: arc.endLat, lng: arc.endLng, color: arc.color, size: 1 },
    ]);

    globeRef.current
      .pointsData(points)
      .pointColor((e) => e.color)
      .pointsMerge(false) // Don't merge points to keep them distinct
      .pointAltitude(0.0)
      .pointRadius(2); // Reduced from 3 to keep points less prominent
  }, [isInitialized, data]);

  return <group ref={groupRef as any} />;
}
