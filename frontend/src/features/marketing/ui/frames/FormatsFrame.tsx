import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { formats } from "../../model/landingContent";
import { formatOrbits } from "../../model/orbits";
import { swapMotion } from "../../lib/swapMotion";
import { OrbitSvg } from "../OrbitSvg";
import { FrameReveal } from "../primitives/FrameReveal";

type FormatsFrameProps = {
  active: boolean;
};

export function FormatsFrame({ active }: FormatsFrameProps) {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<(typeof formats)[number]>(formats[0]);

  return (
    <section className="mn-frame mn-frame-light mn-formats" aria-label="Формати">
      <FrameReveal active={active} className="mn-formats-copy" delay={0.08}>
        <h2><span>Різні форми.</span><i>Один ритм.</i></h2>
        <p>{selected.description}</p>
      </FrameReveal>
      <div className="mn-formats-stage">
        <div className="mn-formats-image-wrap">
          <AnimatePresence mode="wait">
            <motion.img
              key={selected.id}
              src={selected.image}
              alt={selected.title}
              style={{ objectPosition: selected.position }}
              {...swapMotion(reduceMotion)}
            />
          </AnimatePresence>
        </div>
        <OrbitSvg active={active} className="mn-format-orbit" viewBox="0 0 820 820" paths={formatOrbits} />
        <div className="mn-format-points">
          {formats.map((format) => (
            <button
              className={format.id === selected.id ? "active" : ""}
              key={format.id}
              type="button"
              onClick={() => setSelected(format)}
              style={{ "--mn-x": format.point.x, "--mn-y": format.point.y } as React.CSSProperties}
            >
              <span />
              <b>{format.title}</b>
            </button>
          ))}
        </div>
        <strong className="mn-active-format">{selected.title}</strong>
      </div>
    </section>
  );
}
