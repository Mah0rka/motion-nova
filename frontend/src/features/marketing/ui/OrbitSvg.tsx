import { motion } from "motion/react";

export type OrbitPath = {
  id: string;
  d: string;
  className?: string;
};

type OrbitDot = {
  pathId: string;
  durationSeconds: number;
  beginSeconds?: number;
  radius?: number;
  className?: string;
};

type OrbitSvgProps = {
  active: boolean;
  className: string;
  paths: readonly OrbitPath[];
  dots?: readonly OrbitDot[];
  viewBox?: string;
};

export function OrbitSvg({ active, className, paths, dots = [], viewBox = "0 0 1600 900" }: OrbitSvgProps) {
  return (
    <svg className={className} viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true">
      {paths.map((path, index) => (
        <motion.path
          key={path.id}
          id={path.id}
          d={path.d}
          className={path.className}
          initial={false}
          animate={{ pathLength: active ? 1 : 0, opacity: active ? 1 : 0 }}
          transition={{ duration: 1.15, delay: index * 0.12, ease: [0.18, 0.7, 0.12, 1] }}
        />
      ))}
      {active
        ? dots.map((dot, index) => (
          <circle key={`${dot.pathId}-${index}`} className={dot.className ?? "mn-orbit-dot"} r={dot.radius ?? 5}>
            <animateMotion
              dur={`${dot.durationSeconds}s`}
              begin={`${dot.beginSeconds ?? 0}s`}
              repeatCount="indefinite"
              path={paths.find((path) => path.id === dot.pathId)?.d}
            />
          </circle>
        ))
        : null}
    </svg>
  );
}
