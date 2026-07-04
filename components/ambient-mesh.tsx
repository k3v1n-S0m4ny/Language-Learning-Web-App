import type { CSSProperties } from "react";

// Per-language ambient gradient mesh (glass redesign, Phase 0). Fixed, low-opacity
// blurred blobs tinted from the active-language accents (--accent/-2/-3, set on
// <html> by [data-lang]). Sits behind all content. Drift only animates when the
// OS allows motion — the `mesh-drift` keyframe is defined solely inside a
// prefers-reduced-motion:no-preference block, so reduced-motion users get a
// static mesh with no code branch here. Purely decorative → aria-hidden.
//
// No "use client": this renders identical markup on server and client.

type Blob = {
  bg: string;
  opacity: number;
  size: string;
  position: CSSProperties;
  delay: string;
};

const BLOBS: Blob[] = [
  {
    bg: "var(--accent)",
    opacity: 0.22,
    size: "48vw",
    position: { top: "-12%", left: "-8%" },
    delay: "0s",
  },
  {
    bg: "var(--accent-2)",
    opacity: 0.16,
    size: "42vw",
    position: { top: "28%", right: "-12%" },
    delay: "-8s",
  },
  {
    bg: "var(--accent-3)",
    opacity: 0.14,
    size: "52vw",
    position: { bottom: "-18%", left: "18%" },
    delay: "-16s",
  },
];

export function AmbientMesh() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {BLOBS.map((blob, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: blob.size,
            height: blob.size,
            ...blob.position,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${blob.bg} 0%, transparent 70%)`,
            opacity: blob.opacity,
            filter: "blur(64px)",
            willChange: "transform",
            animation: `mesh-drift 26s ease-in-out ${blob.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}
