import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

import { contacts, marketingAssets } from "../../model/landingContent";
import { finaleOrbits } from "../../model/orbits";
import { OrbitSvg } from "../OrbitSvg";
import { FrameReveal } from "../primitives/FrameReveal";

type FinaleFrameProps = {
  active: boolean;
  primaryTarget: string;
  primaryLabel: string;
  onOpenPlans?: () => void;
};

export function FinaleFrame({ active, primaryTarget, primaryLabel, onOpenPlans }: FinaleFrameProps) {
  return (
    <section className="mn-frame mn-frame-dark mn-finale" aria-label="Старт">
      <OrbitSvg
        active={active}
        className="mn-final-orbit"
        viewBox="0 0 1000 1000"
        paths={finaleOrbits}
        dots={[
          { pathId: "mn-finale-orbit-a", durationSeconds: 21, beginSeconds: -4 },
          { pathId: "mn-finale-orbit-b", durationSeconds: 25, beginSeconds: -16 }
        ]}
      />
      <FrameReveal active={active} className="mn-final-content" delay={0.1}>
        <img src={marketingAssets.logoWhite} alt="Motion Nova" />
        <h2><span>Start your</span><i>orbit.</i></h2>
        <p>Обери клуб і заплануй перше тренування.</p>
        {onOpenPlans ? (
          <button className="mn-primary-action" type="button" onClick={onOpenPlans}>Абонементи <ArrowUpRight size={16} /></button>
        ) : (
          <Link className="mn-primary-action" to={primaryTarget}>{primaryLabel} <ArrowUpRight size={16} /></Link>
        )}
      </FrameReveal>
      <dl className="mn-final-contacts" aria-label="Контактна інформація">
        {contacts.map((contact) => (
          <div className="mn-contact" key={contact.id}>
            <dt>{contact.label}</dt>
            <dd>{contact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
