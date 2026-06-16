import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { Swiper as SwiperInstance } from "swiper";
import { A11y, EffectCreative, Keyboard, Mousewheel } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { useAuthStore } from "../../auth";
import { landingFrames } from "../model/landingContent";
import { MotionNovaLogo } from "../ui/MotionNovaLogo";
import { PlansModal } from "../ui/PlansModal";
import { HeroFrame } from "../ui/frames/HeroFrame";
import { ManifestoFrame } from "../ui/frames/ManifestoFrame";
import { SpaceFrame } from "../ui/frames/SpaceFrame";
import { FormatsFrame } from "../ui/frames/FormatsFrame";
import { LocationsFrame } from "../ui/frames/LocationsFrame";
import { RhythmFrame } from "../ui/frames/RhythmFrame";
import { FinaleFrame } from "../ui/frames/FinaleFrame";

export function HomePage() {
  const swiperRef = useRef<SwiperInstance | null>(null);
  const reduceMotion = useReducedMotion();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [activeFrame, setActiveFrame] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPlansOpen, setIsPlansOpen] = useState(false);

  const primaryTarget = isAuthenticated ? "/dashboard" : "/login";
  const primaryLabel = isAuthenticated ? "Відкрити кабінет" : "Записатися на пробне";
  const greetingLabel = user?.first_name ? `Привіт, ${user.first_name}` : "Мій кабінет";

  const isDarkFrame = activeFrame === 1 || activeFrame === 3 || activeFrame === 5;

  function goToFrame(index: number) {
    swiperRef.current?.slideTo(index);
    setIsMenuOpen(false);
  }

  function openPlans() {
    setIsMenuOpen(false);
    setIsPlansOpen(true);
  }

  return (
    <main className="motion-nova-page">
      <header className={isDarkFrame ? "mn-header mn-header-dark" : "mn-header"}>
        <button className="mn-brand-button" type="button" onClick={() => goToFrame(0)} aria-label="На початок">
          <MotionNovaLogo dark={isDarkFrame} compact />
        </button>

        <nav className="mn-frame-nav" aria-label="Навігація лендингом">
          {landingFrames.map((frame, index) => (
            <button
              className={index === activeFrame ? "mn-frame-nav-link active" : "mn-frame-nav-link"}
              key={frame.id}
              type="button"
              onClick={() => goToFrame(index)}
            >
              {frame.label}
            </button>
          ))}
        </nav>

        <div className="mn-header-actions">
          <Link className="mn-session-link" to={primaryTarget}>
            {isAuthenticated ? greetingLabel : "Увійти"}
          </Link>
          <button
            className="mn-menu-button"
            type="button"
            aria-label="Відкрити меню"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen ? (
          <motion.div
            className="mn-drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.aside
              className="mn-drawer"
              role="dialog"
              aria-modal="true"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.2, 0.7, 0.15, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mn-drawer-head">
                <MotionNovaLogo />
                <button className="mn-menu-button" type="button" aria-label="Закрити меню" onClick={() => setIsMenuOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <nav className="mn-drawer-nav" aria-label="Мобільна навігація">
                {landingFrames.map((frame, index) => (
                  <button key={frame.id} type="button" onClick={() => goToFrame(index)}>
                    <span>0{index + 1}</span>
                    {frame.label}
                  </button>
                ))}
              </nav>
              <div className="mn-drawer-foot">
                <Link className="mn-drawer-login" to={primaryTarget}>
                  {isAuthenticated ? greetingLabel : "Увійти"}
                </Link>
                {isAuthenticated ? (
                  <Link className="mn-primary-action" to={primaryTarget}>
                    {primaryLabel} <ArrowUpRight size={16} />
                  </Link>
                ) : (
                  <button className="mn-primary-action" type="button" onClick={openPlans}>
                    Абонементи <ArrowUpRight size={16} />
                  </button>
                )}
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Swiper
        className="mn-presentation"
        modules={[A11y, EffectCreative, Keyboard, Mousewheel]}
        direction="vertical"
        effect="creative"
        speed={reduceMotion ? 0 : 1050}
        creativeEffect={{
          prev: { translate: [0, "-14%", -1], opacity: 0.28, scale: 1.02 },
          next: { translate: [0, "100%", 0], opacity: 1, scale: 1 }
        }}
        keyboard={{ enabled: true }}
        mousewheel={{ forceToAxis: true, thresholdDelta: 18 }}
        resistanceRatio={0}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        onSlideChange={(swiper) => setActiveFrame(swiper.activeIndex)}
      >
        <SwiperSlide>
          <HeroFrame active={activeFrame === 0} goToFrame={goToFrame} />
        </SwiperSlide>
        <SwiperSlide>
          <ManifestoFrame active={activeFrame === 1} />
        </SwiperSlide>
        <SwiperSlide>
          <SpaceFrame active={activeFrame === 2} />
        </SwiperSlide>
        <SwiperSlide>
          <FormatsFrame active={activeFrame === 3} />
        </SwiperSlide>
        <SwiperSlide>
          <LocationsFrame active={activeFrame === 4} />
        </SwiperSlide>
        <SwiperSlide>
          <RhythmFrame active={activeFrame === 5} />
        </SwiperSlide>
        <SwiperSlide>
          <FinaleFrame
            active={activeFrame === 6}
            primaryTarget={primaryTarget}
            primaryLabel={primaryLabel}
            onOpenPlans={isAuthenticated ? undefined : openPlans}
          />
        </SwiperSlide>
      </Swiper>

      <PlansModal open={isPlansOpen} onClose={() => setIsPlansOpen(false)} />
    </main>
  );
}
