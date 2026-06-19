import { useEffect, useLayoutEffect, useRef } from "react";
import "./ParallaxSection.css";

import cashapp from "../assets/logos/cashapp.svg";
import chase from "../assets/logos/chase.svg";
import metamask from "../assets/logos/metamask.svg";
import adp from "../assets/logos/adp.svg";
import citi from "../assets/logos/citi.svg";
import quickbooks from "../assets/logos/quickbooks.svg";
import oracle from "../assets/logos/oracle-netsuite.svg";
import bofa from "../assets/logos/bofa.svg";

/**
 * The design canvas is 1920 x 880. Every coordinate / size below is expressed in
 * that design space and scaled at runtime by the `--u` (unit) custom property,
 * which equals stageWidth / 1920. That keeps the layout pixel-faithful to Figma
 * at any viewport width.
 *
 * `left` / `top` are the center of each badge as a percentage of the canvas.
 * `w` / `h` are the logo's intrinsic size in design px.
 * `speed` is the horizontal parallax travel (design px) at full mouse deflection;
 * a different value per logo gives the layered depth effect. Vertical travel is a
 * gentle fraction of that so the motion stays horizontally dominant.
 */
type Logo = {
  name: string;
  src: string;
  left: number;
  top: number;
  w: number;
  h: number;
  speed: number;
};

const LOGOS: Logo[] = [
  { name: "Cash App", src: cashapp, left: 29.6, top: 26.8, w: 183, h: 40, speed: 60 },
  { name: "Citi", src: citi, left: 60.7, top: 22.7, w: 69, h: 40, speed: 45 },
  { name: "MetaMask", src: metamask, left: 45.9, top: 37.5, w: 117, h: 40, speed: 82 },
  { name: "Intuit QuickBooks", src: quickbooks, left: 78.3, top: 40.7, w: 162, h: 32, speed: 30 },
  { name: "ADP", src: adp, left: 22.8, top: 56.0, w: 88, h: 40, speed: 52 },
  { name: "Chase", src: chase, left: 53.0, top: 59.3, w: 173, h: 32, speed: 38 },
  { name: "Oracle NetSuite", src: oracle, left: 74.3, top: 65.2, w: 110, h: 40, speed: 68 },
  { name: "Bank of America", src: bofa, left: 29.9, top: 74.4, w: 260, h: 26, speed: 24 },
];

const VERTICAL_RATIO = 0.28; // vertical travel relative to horizontal speed
const EASE = 0.09; // lerp factor — lower = smoother / laggier follow

export default function ParallaxSection() {
  const stageRef = useRef<HTMLElement>(null);

  // Keep the unit scale (--u) in sync with the rendered stage width.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const setUnit = () => {
      const u = stage.clientWidth / 1920;
      stage.style.setProperty("--u", String(u));
    };
    setUnit();

    const ro = new ResizeObserver(setUnit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  // Pointer-driven parallax with eased (lerped) follow via requestAnimationFrame.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      target.x = clamp(((e.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
      target.y = clamp(((e.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };

    const tick = () => {
      current.x += (target.x - current.x) * EASE;
      current.y += (target.y - current.y) * EASE;
      stage.style.setProperty("--mx", current.x.toFixed(4));
      stage.style.setProperty("--my", current.y.toFixed(4));
      raf = requestAnimationFrame(tick);
    };

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <section ref={stageRef} className="parallax" style={{ "--u": 1, "--mx": 0, "--my": 0 } as React.CSSProperties}>
      <div className="parallax__stage">
        <h2 className="parallax__heading">Works with the money you&rsquo;ve already got.</h2>

        {LOGOS.map((logo) => (
          <div
            key={logo.name}
            className="badge"
            style={
              {
                left: `${logo.left}%`,
                top: `${logo.top}%`,
                "--sx": logo.speed,
                "--sy": logo.speed * VERTICAL_RATIO,
              } as React.CSSProperties
            }
          >
            <div className="badge__inner">
              <img
                className="badge__logo"
                src={logo.src}
                alt={logo.name}
                draggable={false}
                style={{ "--w": logo.w, "--h": logo.h } as React.CSSProperties}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
