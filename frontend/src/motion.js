import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Staggered entrance for the page currently rendered inside `scope`.
 * Re-runs when `deps` change (route, filter, list) and reverts cleanly.
 */
export function usePageMotion(scope, deps = []) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root || reduced()) return;

      const blocks = Array.from(root.children).filter(
        (el) =>
          !el.classList.contains("busy-bar") &&
          !el.classList.contains("ant-modal-root"),
      );
      if (blocks.length) {
        gsap.fromTo(
          blocks,
          { y: 14, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.4,
            ease: "power2.out",
            stagger: 0.03,
            clearProps: "transform,opacity,visibility",
          },
        );
      }

      const tiles = root.querySelectorAll(
        ".bento > *, .course-grid > *, .stats > *, .quiz-grid > *, .mod-list > *, .lesson-item",
      );
      if (tiles.length) {
        gsap.fromTo(
          tiles,
          { y: 16, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.42,
            ease: "power3.out",
            delay: 0.06,
            stagger: { each: 0.025, from: "start" },
            clearProps: "transform,opacity,visibility",
          },
        );
      }
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  );
}

/** Counts numeric stat values up from zero. */
export function useCountUp(scope, deps = []) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root || reduced()) return;
      root.querySelectorAll(".stat strong, .tile-figure").forEach((el) => {
        const raw = (el.textContent || "").trim();
        const target = Number(raw.replace(/[^\d.-]/g, ""));
        if (!raw || !Number.isFinite(target) || target <= 0) return;
        const box = { value: 0 };
        gsap.to(box, {
          value: target,
          duration: 1.1,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = Math.round(box.value).toLocaleString("vi-VN");
          },
          onComplete: () => {
            el.textContent = raw;
          },
        });
      });
    },
    { scope, dependencies: deps },
  );
}
