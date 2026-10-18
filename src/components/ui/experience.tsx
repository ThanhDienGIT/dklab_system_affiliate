"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LazyMotion, domAnimation } from "motion/react";
import NextTopLoader from "nextjs-toploader";
import type Lenis from "lenis";

/**
 * Lop "cam giac muot" cho toan site:
 * - LazyMotion: Motion chi tai bo tinh nang DOM (~15KB) thay vi ca goi.
 * - NextTopLoader: thanh tien trinh 2px khi chuyen trang (bao hieu da bam, khong de nguoi dung bam lai).
 * - Lenis: cuon muot co quan tinh, CHI tren desktop co chuot (mobile da muot san, Lenis lam mat cam giac native).
 *   Tu tat o /admin, khi bat "giam chuyen dong", va khi modal khoa cuon.
 */
export function Experience({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <NextTopLoader color="#a8834a" height={2} showSpinner={false} shadow={false} crawlSpeed={160} speed={260} easing="cubic-bezier(.22,1,.36,1)" zIndex={1600} />
      <SmoothScroll />
      {children}
    </LazyMotion>
  );
}

function SmoothScroll() {
  const path = usePathname();
  const off = path.startsWith("/admin");
  const ref = useRef<Lenis | null>(null);

  useEffect(() => {
    if (off) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    let alive = true;
    let mo: MutationObserver | null = null;
    // tai dong Lenis sau khi trang da tuong tac duoc -> khong chen vao JS khoi dong
    void import("lenis").then(({ default: L }) => {
      if (!alive) return;
      const lenis = new L({
        lerp: 0.13, smoothWheel: true, autoRaf: true, anchors: true, allowNestedScroll: true, stopInertiaOnNavigate: true,
        prevent: (n) => n.hasAttribute("data-lenis-prevent") || n.getAttribute("role") === "dialog",
      });
      ref.current = lenis;
      // Radix Dialog (react-remove-scroll) gan data-scroll-locked len body khi mo modal -> dung Lenis
      const sync = () => (document.body.hasAttribute("data-scroll-locked") ? lenis.stop() : lenis.start());
      mo = new MutationObserver(sync);
      mo.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked"] });
    });
    return () => { alive = false; mo?.disconnect(); ref.current?.destroy(); ref.current = null; };
  }, [off]);

  // Doi trang: xoa quan tinh cu de khong "troi" tiep sau khi Next da cuon len dau / khoi phuc vi tri
  useEffect(() => {
    const l = ref.current;
    // stop() + start() = reset noi bo (dong bo vi tri dich voi vi tri that, xoa van toc)
    if (l && !l.isStopped && !document.body.hasAttribute("data-scroll-locked")) { l.stop(); l.start(); }
  }, [path]);
  return null;
}
