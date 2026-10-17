import { useCallback, useRef } from "react";

// react-slick marks off-screen slides aria-hidden="true" but leaves the buttons
// inside them focusable, so keyboard users tab into slides they can't see (and
// Lighthouse flags "[aria-hidden] elements contain focusable descendants").
// `inert` takes those slides out of the tab order as well.

/**
 * const { wrapRef, inertProps } = useInertHiddenSlides();
 * <div ref={wrapRef}><Slider {...settings} {...inertProps}>…</Slider></div>
 */
export function useInertHiddenSlides() {
  const wrapRef = useRef(null);
  const sync = useCallback(() => {
    wrapRef.current?.querySelectorAll(".slick-slide").forEach((slide) => {
      slide.inert = slide.getAttribute("aria-hidden") === "true";
    });
  }, []);
  // onInit runs after mount, onReInit after every update (incl. slide changes).
  return { wrapRef, inertProps: { onInit: sync, onReInit: sync } };
}
