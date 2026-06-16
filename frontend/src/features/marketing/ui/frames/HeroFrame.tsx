import { ArrowUpRight } from "lucide-react";

import { marketingAssets } from "../../model/landingContent";
import { FrameReveal } from "../primitives/FrameReveal";

type HeroFrameProps = {
  active: boolean;
  goToFrame: (index: number) => void;
};

export function HeroFrame({ active, goToFrame }: HeroFrameProps) {
  return (
    <section className="mn-frame mn-frame-dark mn-hero" aria-label="Початок">
      <img className="mn-hero-photo" src={marketingAssets.hero} alt="Спортсменка біжить у залі" />
      <div className="mn-dark-vignette" />
      <FrameReveal active={active} className="mn-hero-copy" delay={0.14}>
        <h1><span>Find your</span><i>orbit.</i></h1>
        <p>Progress has a trajectory.</p>
        <button className="mn-ghost-action" type="button" onClick={() => goToFrame(1)}>
          Почати рух <ArrowUpRight size={17} />
        </button>
      </FrameReveal>
    </section>
  );
}
