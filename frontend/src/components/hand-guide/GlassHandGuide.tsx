import { memo, useEffect, useId, useState, type CSSProperties, type RefObject } from "react";
import type { KeyHint } from "../keyboardLayouts";
import { fingerGuidance, fingers, type HandSide } from "./fingerMapping";
import { measureKeyboard, type KeyboardGeometry } from "./handGeometry";
import handArtwork from "../../assets/hand-guide/glass-left-hand.png";
import "./glass-hand-guide.css";

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function useKeyboardGeometry(keyboard: RefObject<HTMLDivElement | null>, layout: string) {
  const [geometry, setGeometry] = useState<KeyboardGeometry | null>(null);
  // The containing keyboard's ref is attached after its children's layout effects.
  useEffect(() => {
    const element = keyboard.current?.querySelector<HTMLElement>(".keyboard-keys");
    if (!element) return;
    let disposed = false;
    const measure = () => {
      if (!disposed) setGeometry(measureKeyboard(element));
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    // Also observe key size: container width can stay constant while key metrics change.
    element.querySelectorAll<HTMLElement>("[data-key-code]").forEach(key => observer?.observe(key));
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure);
    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [keyboard, layout]);
  return geometry;
}

/** Regions of the artwork are separate so only the instructed finger moves or lights up.
 * Artwork pixels describe anatomy; every fingertip is fitted to measured physical keys. */
const artworkFingers = {
  little: { tip: [150, 290], base: [172, 710], path: "M 107 711 C 100 651 83 603 67 557 C 49 512 52 480 62 404 L 91 310 C 107 262 134 241 161 249 C 194 255 202 282 191 314 L 166 407 C 154 459 175 527 214 567 L 242 604 L 234 717 Z" },
  ring: { tip: [313, 263], base: [316, 656], path: "M 245 661 C 251 589 239 496 218 428 C 205 382 221 336 244 290 C 257 251 278 220 313 220 C 348 219 367 243 362 281 L 348 360 C 336 417 346 480 371 522 L 397 554 L 392 659 Z" },
  middle: { tip: [494, 250], base: [483, 648], path: "M 397 652 C 412 574 420 487 414 420 C 407 373 417 332 427 285 C 433 240 452 205 489 204 C 529 201 548 227 550 271 L 554 349 C 559 403 544 445 543 487 L 547 534 Q 550 552 570 556 L 562 655 Z" },
  index: { tip: [681, 263], base: [653, 668], path: "M 565 671 C 580 590 596 509 608 438 C 601 397 610 352 619 313 C 628 253 642 219 678 220 C 714 220 733 246 735 287 L 746 371 C 754 412 740 450 731 485 C 721 538 726 607 735 665 Z" },
  thumb: { tip: [961, 665], base: [747, 1014], path: "M 695 1001 C 736 939 779 866 808 814 C 842 752 867 673 914 628 C 943 603 976 599 995 618 C 1020 641 1004 674 991 705 C 977 755 945 801 923 850 C 893 909 865 968 831 1003 L 797 1045 Z" },
} as const;
const palmOutline = "M 107 700 C 147 701 177 715 233 701 C 249 673 268 651 313 646 C 347 643 367 651 395 646 C 422 629 449 622 483 626 C 521 630 542 640 566 646 C 600 649 622 648 654 650 C 689 646 714 649 734 661 C 742 728 741 799 756 852 C 775 873 787 859 806 833 L 922 849 C 892 928 849 987 813 1022 C 752 1078 674 1121 623 1181 C 594 1215 600 1271 602 1330 L 609 1536 L 110 1536 C 130 1446 168 1339 185 1252 C 197 1188 209 1162 186 1126 C 132 1045 108 864 107 700 Z";

function GlassHand({ side, geometry, nextKey, id, animate }: {
  side: HandSide; geometry: KeyboardGeometry; nextKey: KeyHint | null; id: string; animate: boolean;
}) {
  const anchor = geometry.keys[side === "left" ? "KeyD" : "KeyK"];
  const neighbour = geometry.keys[side === "left" ? "KeyS" : "KeyL"];
  if (!anchor || !neighbour) return null;
  const direction = side === "left" ? 1 : -1;
  const scaleX = Math.abs(anchor.x - neighbour.x) / 181;
  const scaleY = anchor.width / 215;
  const originX = anchor.x - 494 * scaleX * direction;
  const originY = anchor.y - 250 * scaleY;
  const guidance = fingerGuidance(nextKey);
  const toSource = (x: number, y: number): [number, number] => [(x - originX) / scaleX * direction, (y - originY) / scaleY];
  return <g className="glass-hand" data-hand={side}
    transform={`translate(${originX} ${originY}) scale(${scaleX * direction} ${scaleY})`}>
    <defs>
      <image id={`${id}-art`} href={handArtwork} width="1024" height="1536" />
      <clipPath id={`${id}-palm`}><path d={palmOutline} /></clipPath>
      <linearGradient id={`${id}-fade`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="white" stopOpacity="0" /><stop offset=".13" stopColor="white" />
        <stop offset=".65" stopColor="white" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${id}-finger-fade`} x1="0" x2="0" y1="0" y2="1">
        <stop offset=".72" stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" />
      </linearGradient>
      <mask id={`${id}-palm-mask`} maskUnits="userSpaceOnUse" x="0" y="620" width="1024" height="916">
        <rect y="620" width="1024" height="916" fill={`url(#${id}-fade)`} />
      </mask>
    </defs>
    <g clipPath={`url(#${id}-palm)`} mask={`url(#${id}-palm-mask)`} className="glass-palm-art">
      <use href={`#${id}-art`} />
    </g>
    {fingers.filter(finger => finger.hand === side).map(finger => {
      const source = artworkFingers[finger.kind];
      const home = geometry.keys[finger.home];
      const space = geometry.keys.Space;
      const isPrimary = guidance?.finger.id === finger.id;
      const isShift = guidance?.shiftFinger?.id === finger.id;
      const active = isPrimary || isShift;
      const targetCode = isPrimary ? nextKey!.code : isShift ? guidance!.shiftCode! : null;
      const target = targetCode ? geometry.keys[targetCode] : null;
      const restingTip = finger.kind === "thumb"
        ? toSource(space.x + (side === "left" ? -.23 : .23) * space.width, space.y + space.height * .12)
        : toSource(home.x, home.y + home.height * .1);
      // Hold the fingertip on the expected key until the typing state advances.
      // Thumbs already rest inside Space, so they need no sideways reach to its centre.
      const tip = target && finger.kind !== "thumb"
        ? toSource(target.x, target.y + target.height * .1)
        : restingTip;
      // Rotate at the knuckle and change length along the finger's own axis.
      // Keeping its cross-section intact avoids flattening diagonal reaches.
      const sourceAngle = Math.atan2(source.tip[1] - source.base[1], source.tip[0] - source.base[0]) * 180 / Math.PI;
      const sourceLength = Math.hypot(source.tip[0] - source.base[0], source.tip[1] - source.base[1]);
      const pose = (point: readonly number[]) => ({
        angle: Math.atan2(point[1] - source.base[1], point[0] - source.base[0]) * 180 / Math.PI,
        scale: Math.hypot(point[0] - source.base[0], point[1] - source.base[1]) / sourceLength,
      });
      const resting = pose(restingTip);
      const destination = pose(tip);
      const moving = active && animate && Math.hypot(tip[0] - restingTip[0], tip[1] - restingTip[1]) > 1;
      return <g key={finger.id} data-finger={finger.id} data-active={active ? "true" : undefined}
        data-target-key={target ? targetCode : undefined}
        className="glass-finger" style={{ "--finger-color": finger.color } as CSSProperties}>
        <defs>
          <clipPath id={`${id}-${finger.kind}`}><path d={source.path} /></clipPath>
          <mask id={`${id}-${finger.kind}-fade`} maskUnits="userSpaceOnUse" x="0" y={finger.kind === "thumb" ? 590 : 190} width="1024" height={finger.kind === "thumb" ? 460 : source.base[1] - 165}>
            <rect x="0" y={finger.kind === "thumb" ? 590 : 190} width="1024" height={finger.kind === "thumb" ? 460 : source.base[1] - 165} fill={`url(#${id}-finger-fade)`} />
          </mask>
        </defs>
        <g transform={`translate(${source.base[0]} ${source.base[1]})`}>
          <g className="glass-finger-rotation" transform={`rotate(${destination.angle})`}>
            {moving && <animateTransform key={`${targetCode}-rotation`} attributeName="transform" type="rotate"
              from={String(resting.angle)} to={String(destination.angle)} dur="280ms" repeatCount="1"
              calcMode="spline" keyTimes="0;1" keySplines=".25 .1 .25 1" />}
            <g className="glass-finger-reach" transform={`scale(${destination.scale} 1)`}>
              {moving && <animateTransform key={`${targetCode}-reach`} attributeName="transform" type="scale"
                from={`${resting.scale} 1`} to={`${destination.scale} 1`} dur="280ms" repeatCount="1"
                calcMode="spline" keyTimes="0;1" keySplines=".25 .1 .25 1" />}
              <g transform={`rotate(${-sourceAngle}) translate(${-source.base[0]} ${-source.base[1]})`}>
                <g className="glass-finger-surface" clipPath={`url(#${id}-${finger.kind})`} mask={`url(#${id}-${finger.kind}-fade)`}>
                  <use className="glass-finger-art" href={`#${id}-art`} />
                  <path className="glass-finger-tint" d={source.path} fill={finger.color} />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>;
    })}
  </g>;
}

/** Decorative only: no input listeners, focus targets, or writes to the typing session. */
export const GlassHandGuide = memo(function GlassHandGuide({ keyboard, layout, nextKey }: {
  keyboard: RefObject<HTMLDivElement | null>; layout: string; nextKey: KeyHint | null;
}) {
  const geometry = useKeyboardGeometry(keyboard, layout);
  const reduced = useReducedMotion();
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const anchor = geometry?.keys.KeyD;
  const height = geometry && anchor ? Math.max(geometry.height, anchor.y + anchor.width * (1286 / 215)) : 0;
  return <div className="glass-hand-guide" data-testid="glass-hand-guide" aria-hidden="true"
    style={{ pointerEvents: "none" }}>
    {geometry && <svg className="glass-hands" width="100%" height={height} viewBox={`0 0 ${geometry.width} ${height}`}
      focusable="false" aria-hidden="true" data-motion={reduced || geometry.width < 560 ? "reduced" : "full"}>
      <GlassHand side="left" geometry={geometry} nextKey={nextKey} id={`${id}-left`} animate={!reduced && geometry.width >= 560} />
      <GlassHand side="right" geometry={geometry} nextKey={nextKey} id={`${id}-right`} animate={!reduced && geometry.width >= 560} />
    </svg>}
  </div>;
});
