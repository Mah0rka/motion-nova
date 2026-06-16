import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { marketingAssets, rhythmItems } from "../../model/landingContent";
import { rhythmOrbits } from "../../model/orbits";
import { OrbitSvg } from "../OrbitSvg";
import { FrameReveal } from "../primitives/FrameReveal";

type RhythmFrameProps = {
  active: boolean;
};

export function RhythmFrame({ active }: RhythmFrameProps) {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<(typeof rhythmItems)[number]>(rhythmItems[0]);

  return (
    <section className="mn-frame mn-frame-light mn-rhythm" aria-label="Ритм">
      <FrameReveal active={active} className="mn-rhythm-heading" delay={0.06}>
        <h2><span>Твій ритм.</span><i>Одна система.</i></h2>
        <p>Чотири складові. Один ритм.<br />Повна підтримка твого прогресу.</p>
      </FrameReveal>
      <OrbitSvg active={active} className="mn-orbit mn-rhythm-orbit" paths={rhythmOrbits} />
      <motion.div className="mn-rhythm-main" animate={{ scale: selected.id === "recovery" ? 1.025 : 1 }} transition={{ duration: 0.35 }}>
        <img src={marketingAssets.rhythmMain} alt="Людина після тренування" />
      </motion.div>
      <div className="mn-rhythm-nodes">
        {rhythmItems.map((item) => (
          <motion.button
            className={item.id === selected.id ? "mn-rhythm-node active" : "mn-rhythm-node"}
            key={item.id}
            type="button"
            onClick={() => setSelected(item)}
            whileHover={reduceMotion ? undefined : { scale: 1.035 }}
            style={{ "--mn-x": item.point.x, "--mn-y": item.point.y } as React.CSSProperties}
          >
            <img src={item.image} alt="" />
            <span><b>{item.title}</b><p>{item.note}</p></span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
