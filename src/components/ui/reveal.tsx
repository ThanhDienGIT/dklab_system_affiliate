"use client";
import { m as motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/* Dung `m` (ban rut gon) + LazyMotion o MotionProvider: giam ~30KB JS so voi `motion` */
/** Hien dan khi cuon toi (IntersectionObserver). Chi chay 1 lan; tat khi nguoi dung chon giam chuyen dong. */
export function Reveal({ children, delay = 0, y = 24, className, as = "div" }: {
  children: ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "section" | "li" | "article";
}) {
  const reduce = useReducedMotion();
  const M = motion[as];
  if (reduce) return <M className={className}>{children}</M>;
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </M>
  );
}

/** Danh sach con xuat hien lan luot (stagger) */
export function RevealGroup({ children, className, stagger = 0.06 }: { children: ReactNode; className?: string; stagger?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  );
}
export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={{ hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}>
      {children}
    </motion.div>
  );
}
