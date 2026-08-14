/**
 * Lightweight 3D hero — floating emerald/cocoa shapes. Enhances the landing
 * hero without dominating it. Respects prefers-reduced-motion (renders static)
 * and avoids WebGL entirely when the preference is set or on small screens.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

function Floaters() {
  const group = useRef<THREE.Group>(null);
  const shapes = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const palette = [
          "#10B981",
          "#0F766E",
          "#34D399",
          "#5C4B41",
          "#8B7A6E",
          "#10B981",
          "#2D221E",
        ];
        const x = (i % 3) * 1.6 - 1.6 + (i % 2) * 0.4;
        const y = ((i * 37) % 5) - 2.2;
        const z = -2 - (i % 4) * 0.9;
        return {
          position: [x, y, z] as [number, number, number],
          color: palette[i % palette.length],
          kind: i % 3,
          scale: 0.5 + (i % 4) * 0.18,
          speed: 0.00035 + (i % 5) * 0.00009,
        };
      }),
    [],
  );

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = state.clock.elapsedTime * 0.06;
    shapes.forEach((s, i) => {
      const child = group.current!.children[i];
      if (child) {
        child.position.y = s.position[1] + Math.sin(state.clock.elapsedTime * 0.5 + i * 1.7) * 0.22;
        child.rotation.x = state.clock.elapsedTime * 0.08 + i;
        child.rotation.z = state.clock.elapsedTime * 0.05 + i * 0.6;
      }
    });
  });

  return (
    <group ref={group}>
      {shapes.map((s, i) => (
        <mesh key={i} position={s.position} scale={s.scale}>
          {s.kind === 0 ? (
            <icosahedronGeometry args={[1, 0]} />
          ) : s.kind === 1 ? (
            <octahedronGeometry args={[1, 0]} />
          ) : (
            <torusGeometry args={[0.85, 0.28, 16, 32]} />
          )}
          <meshStandardMaterial
            color={s.color}
            roughness={0.5}
            metalness={0.12}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function HeroScene() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(pointer: fine)");
    const check = () => setEnabled(!mq.matches && fine.matches && window.innerWidth >= 768);
    check();
    mq.addEventListener("change", check);
    fine.addEventListener("change", check);
    window.addEventListener("resize", check);
    return () => {
      mq.removeEventListener("change", check);
      fine.removeEventListener("change", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden md:block"
      style={{
        background:
          "radial-gradient(42rem 28rem at 72% 18%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 65%)",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[4, 6, 5]} intensity={1.1} />
        <pointLight position={[-5, -3, -4]} intensity={0.5} color="#10B981" />
        <Floaters />
      </Canvas>
    </div>
  );
}
