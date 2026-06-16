import { manifestoOrbits } from "../../model/orbits";
import { OrbitSvg } from "../OrbitSvg";
import { FrameReveal } from "../primitives/FrameReveal";

type ManifestoFrameProps = {
  active: boolean;
};

export function ManifestoFrame({ active }: ManifestoFrameProps) {
  return (
    <section className="mn-frame mn-frame-light mn-manifesto" aria-label="Ідея">
      <OrbitSvg active={active} className="mn-orbit mn-orbit-light" paths={manifestoOrbits} />
      <FrameReveal active={active} className="mn-manifesto-layout" delay={0.08}>
        <p className="mn-side-note">Рух не хаотичний.<br />У нього є власна траєкторія.</p>
        <h2><span>Progress has</span><i>a trajectory.</i></h2>
        <div className="mn-manifesto-body">
          <p>Не короткий сплеск мотивації.</p>
          <p>Не тренування як подвиг.</p>
          <p className="mn-accent-line">Ритм, який залишається з тобою.</p>
        </div>
      </FrameReveal>
    </section>
  );
}
