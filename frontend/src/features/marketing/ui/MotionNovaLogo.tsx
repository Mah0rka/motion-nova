import { marketingAssets } from "../model/landingContent";

type MotionNovaLogoProps = {
  dark?: boolean;
  compact?: boolean;
};

export function MotionNovaLogo({ dark = false, compact = false }: MotionNovaLogoProps) {
  return (
    <span className={compact ? "mn-brand mn-brand-compact" : "mn-brand"}>
      <img src={dark ? marketingAssets.logoBlack : marketingAssets.logoWhite} alt="" />
      <span className="mn-wordmark" aria-label="Motion Nova">
        <b>MOTION</b>
        <b>NOVA</b>
      </span>
    </span>
  );
}
