"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Popup chuan: Radix Dialog (focus trap, Esc, aria, khoa cuon) + thang z-index dung chung.
 * Overlay/Content dung bien --z-* trong globals.css nen khong bao gio de len/duoi sai lop.
 */
export function Modal({ open, onOpenChange, title, description, children, side, className, hideTitle }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; description?: string; children: ReactNode;
  side?: "left" | "right"; className?: string; hideTitle?: boolean;
}) {
  const drawer = Boolean(side);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 bg-ink/55 backdrop-blur-[2px] data-[state=open]:animate-[fade-up_.25s_both]"
          style={{ zIndex: drawer ? "var(--z-drawer-overlay)" : "var(--z-modal-overlay)" }}
        />
        <Dialog.Content
          data-lenis-prevent
          aria-describedby={description ? undefined : undefined}
          style={{ zIndex: drawer ? "var(--z-drawer)" : "var(--z-modal)" }}
          className={cn(
            "fixed bg-ivory text-ink shadow-2xl outline-none",
            drawer
              ? cn("top-0 h-dvh w-[88vw] max-w-sm overflow-y-auto", side === "left" ? "left-0" : "right-0")
              : "left-1/2 top-1/2 max-h-[90dvh] w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
            className,
          )}
        >
          <Dialog.Title className={hideTitle ? "sr-only" : "font-display px-6 pt-6 text-2xl"}>{title}</Dialog.Title>
          {description ? <Dialog.Description className="px-6 pt-1 text-sm text-muted">{description}</Dialog.Description> : null}
          {children}
          <Dialog.Close
            aria-label="Đóng"
            className="absolute right-3 top-3 grid h-11 w-11 place-items-center text-ink-soft transition hover:text-ink"
          >
            <X size={20} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
