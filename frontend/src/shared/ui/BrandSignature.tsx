import brandLogo from "../../assets/logo/logo.png";

export function BrandSignature() {
  return (
    <div className="brand-signature">
      <img className="brand-logo" src={brandLogo} alt="Логотип Motion Nova" />
      <div className="brand-copy">
        <span className="brand-title" aria-label="Motion Nova">
          <b>MOTION</b>
          <b>NOVA</b>
        </span>
      </div>
    </div>
  );
}
