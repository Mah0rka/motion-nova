export function swapMotion(reduceMotion: boolean | null) {
  return {
    initial: { opacity: 0, scale: reduceMotion ? 1 : 1.035 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: reduceMotion ? 1 : 0.985 },
    transition: { duration: reduceMotion ? 0 : 0.38, ease: [0.2, 0.7, 0.15, 1] as const }
  };
}
