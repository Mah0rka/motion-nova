import type { OrbitPath } from "../ui/OrbitSvg";


function ellipse(cx: number, cy: number, rx: number, ry: number, rotation = 0): string {
  const rad = (rotation * Math.PI) / 180;
  const round = (n: number) => Math.round(n);
  const dx = round(2 * rx * Math.cos(rad));
  const dy = round(2 * rx * Math.sin(rad));
  const x0 = round(cx - rx * Math.cos(rad));
  const y0 = round(cy - rx * Math.sin(rad));
  return `M${x0} ${y0} a${rx} ${ry} ${rotation} 1 0 ${dx} ${dy} a${rx} ${ry} ${rotation} 1 0 ${-dx} ${-dy}`;
}

export const manifestoOrbits: readonly OrbitPath[] = [
  {
    id: "mn-manifest-orbit-a",
    d: "M770 397 C936 129 1321 91 1592 235 C1780 336 1777 659 1522 804 C1243 962 906 815 813 606 C768 505 735 456 770 397 Z"
  },
  {
    id: "mn-manifest-orbit-b",
    className: "mn-orbit-line-muted",
    d: "M-171 710 C214 507 596 472 928 301 C1207 158 1454 111 1732 205 C1510 349 1264 438 1050 527 C787 637 472 742 171 766 C24 778 -92 756 -171 710 Z"
  }
];

export const spaceOrbits: readonly OrbitPath[] = [
  {
    id: "mn-space-orbit-a",
    d: "M-76 779 C177 555 467 701 777 540 C1072 387 1251 165 1627 193 C1772 204 1831 313 1742 401 C1555 587 1254 584 950 688 C645 793 269 942 -76 779 Z"
  },
  {
    id: "mn-space-orbit-b",
    className: "mn-orbit-line-muted",
    d: "M165 118 C466 231 708 206 946 128 C1178 53 1384 55 1691 186"
  }
];

export const formatOrbits: readonly OrbitPath[] = [
  {
    id: "mn-format-orbit-a",
    className: "mn-orbit-line mn-orbit-line-strong",
    d: ellipse(410, 410, 357, 357)
  },
  {
    id: "mn-format-orbit-b",
    className: "mn-orbit-line-muted",
    d: ellipse(410, 410, 286, 286)
  }
];

export const locationOrbits: readonly OrbitPath[] = [
  {
    id: "mn-location-orbit-loop",
    className: "mn-orbit-line mn-orbit-line-strong",
    d: "M-85 765 C225 566 530 650 820 450 C1094 260 1368 258 1662 120 C1830 43 1819 758 1500 840 C1188 920 896 733 602 722 C315 711 108 904 -85 765 Z"
  }
];

export const rhythmOrbits: readonly OrbitPath[] = [
  {
    id: "mn-rhythm-orbit-a",
    className: "mn-orbit-line mn-orbit-line-strong",
    d: ellipse(853.5, 468, 467, 313, -11.5)
  },
  {
    id: "mn-rhythm-orbit-b",
    d: ellipse(933, 519, 371, 205)
  }
];

export const finaleOrbits: readonly OrbitPath[] = [
  {
    id: "mn-finale-orbit-a",
    className: "mn-orbit-line mn-orbit-line-strong",
    d: ellipse(500, 500, 410, 250)
  },
  {
    id: "mn-finale-orbit-b",
    d: ellipse(500, 500, 370, 370)
  }
];
