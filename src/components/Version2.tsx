import { useEffect, useLayoutEffect, useRef } from "react";
import "./Version2.css";

import cashapp from "../assets/logos/cashapp.svg";
import chase from "../assets/logos/chase.svg";
import metamask from "../assets/logos/metamask.svg";
import adp from "../assets/logos/adp.svg";
import citi from "../assets/logos/citi.svg";
import quickbooks from "../assets/logos/quickbooks.svg";
import oracle from "../assets/logos/oracle-netsuite.svg";
import bofa from "../assets/logos/bofa.svg";

/**
 * Version 2 — transform-based horizontal scroll. The scale is capped so the
 * heading's rendered width can never exceed the GPU's max texture size. The
 * track becomes a single in-limit texture, so the transform scroll composites
 * cleanly: crisp text, no shear, no distortion. On large/hi-DPI displays the
 * text is slightly smaller (as big as the GPU can render sharply).
 */
type Logo = {
  name: string;
  src: string;
  left: number;
  top: number;
  w: number;
  h: number;
  /** Mouse-parallax travel (design px) at full deflection — different per logo for depth. */
  speed: number;
};

const LOGOS: Logo[] = [
  { name: "Cash App", src: cashapp, left: 828, top: 330, w: 183, h: 40, speed: 60 },
  { name: "MetaMask", src: metamask, left: 1677, top: 518, w: 117, h: 40, speed: 82 },
  { name: "Chase", src: chase, left: 2461, top: 360, w: 173, h: 32, speed: 40 },
  { name: "Citi", src: citi, left: 3070, top: 510, w: 69, h: 40, speed: 50 },
  { name: "ADP", src: adp, left: 3880, top: 352, w: 88, h: 40, speed: 46 },
  { name: "Bank of America", src: bofa, left: 4560, top: 518, w: 260, h: 26, speed: 30 },
  { name: "Oracle NetSuite", src: oracle, left: 5318, top: 360, w: 110, h: 40, speed: 66 },
  { name: "Intuit QuickBooks", src: quickbooks, left: 6053, top: 512, w: 142, h: 28, speed: 34 },
];

const SCROLL_TAU = 0.07;
const MOUSE_TAU = 0.12;
const VERTICAL_RATIO = 0.28;
const WHEEL_SPEED = 1;
const TRAILING_PAD = 0.08;

/** The GPU's max texture size (px). Layers larger than this clamp and distort.
 * Falls back to a conservative 8192 if WebGL is unavailable. */
function getMaxTextureSize(): number {
  try {
    const gl =
      document.createElement("canvas").getContext("webgl") ||
      document.createElement("canvas").getContext("experimental-webgl");
    const max = gl && (gl as WebGLRenderingContext).getParameter(0x0d33); // MAX_TEXTURE_SIZE
    return typeof max === "number" && max > 0 ? max : 8192;
  } catch {
    return 8192;
  }
}

export default function Version2() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const maxScroll = useRef(0);

  // Scale (--u, capped to the texture limit) + measure scrollable width.
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const maxTexture = getMaxTextureSize();

    // Lay out at scale `u`. Centered on the viewport middle (--cyoff) so logos
    // stay aligned with the text even when `u` is capped. No transform on the
    // heading — it's positioned in plain pixels so it rasterizes crisply.
    const layoutAt = (u: number) => {
      const cy = window.innerHeight / 2;
      section.style.setProperty("--u", String(u));
      section.style.setProperty("--cyoff", `${cy - 440 * u}px`);

      const heading = track.querySelector<HTMLElement>(".v2__heading");
      let headingW = 0;
      if (heading) {
        headingW = heading.offsetWidth;
        heading.style.left = `${3440 * u - headingW / 2}px`;
        heading.style.top = `${cy - heading.offsetHeight / 2}px`;
      }

      const trackLeft = track.getBoundingClientRect().left;
      let maxRight = 0;
      track.querySelectorAll(".v2__heading, .v2badge").forEach((el) => {
        maxRight = Math.max(maxRight, el.getBoundingClientRect().right - trackLeft);
      });
      return { headingW, maxRight };
    };

    const recompute = () => {
      const dpr = window.devicePixelRatio || 1;
      let u = window.innerHeight / 880;
      let { headingW, maxRight } = layoutAt(u);

      // The track layer is bounded by the heading (logos are their own layers).
      // Cap u so the heading device-px width stays within the texture limit.
      const maxCssWidth = (maxTexture * 0.9) / dpr;
      if (headingW > maxCssWidth) {
        u *= maxCssWidth / headingW;
        ({ headingW, maxRight } = layoutAt(u));
      }

      const content = maxRight + window.innerWidth * TRAILING_PAD;
      maxScroll.current = Math.max(0, content - window.innerWidth);
    };

    recompute();
    document.fonts?.ready.then(recompute).catch(() => {});

    const ro = new ResizeObserver(recompute);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  // Input + eased animation loop (transform-based scroll).
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const layer = layerRef.current;
    if (!section || !track || !layer) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let scrollTarget = 0;
    let scrollCurrent = 0;
    let mxT = 0;
    let myT = 0;
    let mx = 0;
    let my = 0;
    let raf = 0;

    const clampScroll = (v: number) => Math.min(maxScroll.current, Math.max(0, v));
    const clamp11 = (v: number) => Math.min(1, Math.max(-1, v));

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      let d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (e.deltaMode === 1) d *= 16;
      else if (e.deltaMode === 2) d *= window.innerWidth;
      scrollTarget = clampScroll(scrollTarget + d * WHEEL_SPEED);
    };

    let dragging = false;
    let dragStartX = 0;
    let dragStartScroll = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      dragStartX = e.clientX;
      dragStartScroll = scrollTarget;
      section.setPointerCapture(e.pointerId);
      section.classList.add("is-dragging");
    };
    const onMove = (e: PointerEvent) => {
      if (dragging) scrollTarget = clampScroll(dragStartScroll - (e.clientX - dragStartX));
      if (!reduceMotion) {
        mxT = clamp11((e.clientX / window.innerWidth - 0.5) * 2);
        myT = clamp11((e.clientY / window.innerHeight - 0.5) * 2);
      }
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      section.releasePointerCapture(e.pointerId);
      section.classList.remove("is-dragging");
    };
    const onLeave = () => {
      mxT = 0;
      myT = 0;
    };

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      scrollCurrent += (scrollTarget - scrollCurrent) * (1 - Math.exp(-dt / SCROLL_TAU));
      mx += (mxT - mx) * (1 - Math.exp(-dt / MOUSE_TAU));
      my += (myT - my) * (1 - Math.exp(-dt / MOUSE_TAU));
      track.style.transform = `translate3d(${-scrollCurrent}px, 0, 0)`;
      layer.style.setProperty("--mx", mx.toFixed(4));
      layer.style.setProperty("--my", my.toFixed(4));
      raf = requestAnimationFrame(tick);
    };

    section.addEventListener("wheel", onWheel, { passive: false });
    section.addEventListener("pointerdown", onDown);
    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerup", onUp);
    section.addEventListener("pointercancel", onUp);
    section.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      section.removeEventListener("wheel", onWheel);
      section.removeEventListener("pointerdown", onDown);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerup", onUp);
      section.removeEventListener("pointercancel", onUp);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <section ref={sectionRef} className="v2" style={{ "--u": 1 } as React.CSSProperties}>
      <div ref={trackRef} className="v2__track">
        <h2 className="v2__heading">Works with the money you&rsquo;ve already got.</h2>

        <div ref={layerRef} className="v2__layer">
          {LOGOS.map((logo) => (
            <div
              key={logo.name}
              className="v2badge"
              style={
                {
                  "--tx": logo.left,
                  "--ty": logo.top,
                  "--sx": logo.speed,
                  "--sy": logo.speed * VERTICAL_RATIO,
                } as React.CSSProperties
              }
            >
              <div className="v2badge__inner">
                <img
                  className="v2badge__logo"
                  src={logo.src}
                  alt={logo.name}
                  draggable={false}
                  style={{ "--w": logo.w, "--h": logo.h } as React.CSSProperties}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
