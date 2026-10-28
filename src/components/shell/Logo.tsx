// The iynk wordmark: Geist SemiBold outlines respaced by eye (tight on the diagonals of the y, open between the
// stems of n and k), with the tittle of the i drawn as a round LED in the accent. Drawn rather than typeset, so it
// keeps its shape in Hindi and Chinese, where the page's sans is another face. src/app/icon.svg is the same i.
const INK =
  "M2 0V-534H130V0ZM276 150V51H344Q370 51 382.5 43Q395 35 402 16L417 -21H380L189 -534H322L456 -141L584 -534H717L508 56Q490 106 457.5 128Q425 150 367 150ZM771 0V-534H887L892 -384L877 -390Q885 -446 910 -480Q935 -514 971 -530Q1007 -546 1050 -546Q1109 -546 1149.5 -520Q1190 -494 1211 -448.5Q1232 -403 1232 -343V0H1104V-302Q1104 -347 1095 -378Q1086 -409 1065.5 -425.5Q1045 -442 1011 -442Q960 -442 929.5 -406Q899 -370 899 -302V0ZM1336 0V-710H1464V-293L1683 -534H1841L1632 -312L1848 0H1704L1548 -236L1464 -147V0Z";

/** `height` is the drawing's full height (ascender to descender); the x-height is 61% of it. */
export function Logo({ height = 22, className }: { height?: number; className?: string }) {
  return (
    <svg
      viewBox="0 -720 1850 870"
      height={height}
      width={Math.round((height * 1850) / 870)}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={INK} fill="currentColor" />
      <circle cx="66" cy="-655" r="64" fill="var(--accent)" />
    </svg>
  );
}
