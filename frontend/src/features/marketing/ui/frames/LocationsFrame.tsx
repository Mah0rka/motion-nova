import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

import { locations } from "../../model/landingContent";
import { locationOrbits } from "../../model/orbits";
import { swapMotion } from "../../lib/swapMotion";
import { OrbitSvg } from "../OrbitSvg";
import { FrameReveal } from "../primitives/FrameReveal";

type LocationsFrameProps = {
  active: boolean;
};

const mapSrc = ({ lat, lng }: { lat: number; lng: number }) => {
  const d = 0.006;
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
};

export function LocationsFrame({ active }: LocationsFrameProps) {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<(typeof locations)[number]>(locations[0]);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    if (!mapOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMapOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mapOpen]);

  useEffect(() => {
    if (!active) {
      setMapOpen(false);
    }
  }, [active]);

  return (
    <section className="mn-frame mn-frame-dark mn-locations" aria-label="Локації">
      <AnimatePresence mode="wait">
        <motion.img className="mn-location-bg" key={selected.id} src={selected.image} alt={selected.title} {...swapMotion(reduceMotion)} />
      </AnimatePresence>
      <div className="mn-location-overlay" />
      <OrbitSvg active={active} className="mn-orbit mn-orbit-location" paths={locationOrbits} dots={[{ pathId: "mn-location-orbit-loop", durationSeconds: 31, beginSeconds: -5 }]} />
      <FrameReveal active={active} className="mn-location-content" delay={0.08}>
        <h2><span>Обери точку</span><i>старту.</i></h2>
        <p>{selected.note}</p>
      </FrameReveal>
      <div className="mn-location-dots" aria-label="Вибір локації">
        {locations.map((location) => (
          <button
            className={location.id === selected.id ? "active" : ""}
            key={location.id}
            type="button"
            onClick={() => setSelected(location)}
            style={{
              "--mn-x": location.point.x,
              "--mn-y": location.point.y,
              "--mn-xm": location.pointMobile.x,
              "--mn-ym": location.pointMobile.y
            } as React.CSSProperties}
          >
            <i />
            <span>{location.shortTitle}</span>
          </button>
        ))}
      </div>
      <FrameReveal active={active} className="mn-location-readout" delay={0.22}>
        <h3>{selected.title}</h3>
        <address>{selected.address}</address>
        <button type="button" onClick={() => setMapOpen(true)}>Переглянути клуб <ArrowUpRight size={15} /></button>
      </FrameReveal>

      <AnimatePresence>
        {mapOpen ? (
          <motion.div
            className="mn-location-modal"
            role="presentation"
            onClick={() => setMapOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.24 }}
          >
            <motion.div
              className="mn-location-modal-card"
              role="dialog"
              aria-modal="true"
              aria-label={`Карта — ${selected.title}`}
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
              transition={{ duration: reduceMotion ? 0 : 0.26, ease: [0.2, 0.7, 0.15, 1] }}
            >
              <div className="mn-location-modal-map">
                <iframe
                  src={mapSrc(selected.coords)}
                  title={`Карта — ${selected.title}`}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
