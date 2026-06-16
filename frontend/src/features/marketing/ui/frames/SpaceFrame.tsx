import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { spaces } from "../../model/landingContent";
import { spaceOrbits } from "../../model/orbits";
import { swapMotion } from "../../lib/swapMotion";
import { OrbitSvg } from "../OrbitSvg";
import { FrameReveal } from "../primitives/FrameReveal";

type SpaceFrameProps = {
  active: boolean;
};

export function SpaceFrame({ active }: SpaceFrameProps) {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<(typeof spaces)[number]>(spaces[0]);

  return (
    <section className="mn-frame mn-frame-dark mn-space" aria-label="Простір">
      <OrbitSvg
        active={active}
        className="mn-orbit mn-orbit-space"
        paths={spaceOrbits}
        dots={[{ pathId: "mn-space-orbit-a", durationSeconds: 28, beginSeconds: -9 }]}
      />
      <div className="mn-space-primary">
        <AnimatePresence mode="wait">
          <motion.img key={selected.id} src={selected.image} alt={selected.title} {...swapMotion(reduceMotion)} />
        </AnimatePresence>
      </div>
      <FrameReveal active={active} className="mn-space-copy" delay={0.1}>
        <h2><span>Простір для</span><i>фокусу.</i></h2>
      </FrameReveal>
      <div className="mn-space-options" aria-label="Вибір простору клубу">
        {spaces.map((space, index) => (
          <button className={space.id === selected.id ? "active" : ""} key={space.id} type="button" onClick={() => setSelected(space)}>
            <img src={space.image} alt="" />
            <span>0{index + 1}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
