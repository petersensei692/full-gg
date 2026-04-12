"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type EventImageThumbProps = {
  src: string;
  /** Shown to screen readers */
  alt?: string;
  /** Classes on the inner <img> (size, border, etc.) */
  imgClassName?: string;
  /** Extra classes on the focusable wrapper */
  className?: string;
};

const ringClass =
  "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_0_1px_rgba(0,0,0,0.06)] z-[1] relative";

/**
 * Click highlights the thumbnail and opens a zoomed lightbox; Escape / backdrop / close exits.
 */
export function EventImageThumb({
  src,
  alt = "Economic event image",
  imgClassName = "max-h-40 max-w-full rounded border border-sidebar-border object-contain bg-black/10",
  className = "",
}: EventImageThumbProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const focusWrap = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  }, []);

  const openLightbox = useCallback(() => {
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    queueMicrotask(() => wrapRef.current?.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    if (!active) return;
    const onDocPointerDown = (ev: PointerEvent) => {
      const el = wrapRef.current;
      if (el && !el.contains(ev.target as Node)) {
        setActive(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => document.removeEventListener("pointerdown", onDocPointerDown, true);
  }, [active]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        closeLightbox();
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    queueMicrotask(() => closeBtnRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen, closeLightbox]);

  const lightbox =
    mounted &&
    lightboxOpen &&
    createPortal(
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-label="Zoomed image"
        onClick={closeLightbox}
      >
        <button
          ref={closeBtnRef}
          type="button"
          onClick={closeLightbox}
          className="absolute right-3 top-3 z-[301] rounded-lg bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Close zoomed image"
        >
          <X className="h-5 w-5" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[min(92dvh,92vh)] max-w-[min(96dvw,96vw)] object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
      </div>,
      document.body,
    );

  return (
    <>
      {lightbox}
      <div
        ref={wrapRef}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        className={`inline-block max-w-full rounded outline-none cursor-zoom-in transition-shadow ${active ? ringClass : ""} focus:outline-none ${className}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          setActive(true);
          queueMicrotask(() => focusWrap());
        }}
        onClick={(e) => {
          e.stopPropagation();
          openLightbox();
        }}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setActive(true);
            focusWrap();
            openLightbox();
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={`pointer-events-none select-none ${imgClassName}`}
        />
      </div>
    </>
  );
}
