import { motion, useReducedMotion } from "motion/react";

type FrameRevealProps = {
  active: boolean;
  className?: string;
  children: React.ReactNode;
  delay?: number;
};

export function FrameReveal({ active, className, children, delay = 0 }: FrameRevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={false}
      animate={active ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0, y: reduceMotion ? 0 : 26 },
        visible: { opacity: 1, y: 0 }
      }}
      transition={{ duration: reduceMotion ? 0 : 0.7, delay, ease: [0.2, 0.7, 0.15, 1] }}
    >
      {children}
    </motion.div>
  );
}
