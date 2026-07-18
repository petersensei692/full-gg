"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "./Dialog";

export type AnalysisGalleryItem = {
  src: string;
  alt: string;
  caption?: string;
};

interface AnalysisImageProps {
  src: string;
  alt: string;
  /** Shown above the image when focused (e.g. in lightbox) */
  caption?: string;
  /** Use when src is a data URL (base64) - Next Image requires remote domains */
  unoptimized?: boolean;
  className?: string;
  /**
   * When set, the lightbox shows prev/next controls to browse all images on this analysis.
   */
  gallery?: AnalysisGalleryItem[];
  /** Position of this thumbnail in `gallery` (0-based). Used when opening the lightbox. */
  galleryIndex?: number;
}

const defaultImgClass = "max-w-full h-auto rounded-lg cursor-pointer border border-sidebar-border hover:border-primary/50 transition-colors object-contain";

const navArrowBtn =
  "absolute top-1/2 z-10 -translate-y-1/2 rounded-full p-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60";

export function AnalysisImage({
  src,
  alt,
  caption,
  unoptimized = false,
  className,
  gallery,
  galleryIndex = 0,
}: AnalysisImageProps) {
  const [open, setOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const hasGallery = Array.isArray(gallery) && gallery.length > 0;
  const clampedStart = hasGallery
    ? Math.min(Math.max(0, galleryIndex), gallery!.length - 1)
    : 0;

  useEffect(() => {
    if (open && hasGallery) {
      setViewerIndex(clampedStart);
    }
  }, [open, hasGallery, clampedStart]);

  const display = hasGallery ? gallery![viewerIndex] : { src, alt, caption };
  const showCaption = !!(display.caption && String(display.caption).trim());

  const canPrev = hasGallery && viewerIndex > 0;
  const canNext = hasGallery && viewerIndex < gallery!.length - 1;

  const goPrev = useCallback(() => {
    if (canPrev) setViewerIndex((i) => i - 1);
  }, [canPrev]);

  const goNext = useCallback(() => {
    if (canNext) setViewerIndex((i) => i + 1);
  }, [canNext]);

  useEffect(() => {
    if (!open || !hasGallery) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hasGallery, goPrev, goNext]);

  const isDataUrl = src.startsWith("data:");
  const imgClass = className ? `${defaultImgClass} ${className}` : defaultImgClass;

  const viewerIsDataUrl = display.src.startsWith("data:");

  return (
    <>
      {isDataUrl || unoptimized ? (
        <img
          src={src}
          alt={alt}
          className={imgClass}
          onClick={() => setOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={800}
          height={600}
          className={imgClass}
          onClick={() => setOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showClose={true} className="bg-black/95 border-0">
          <div className="relative w-full h-[90dvh] flex flex-col items-center justify-center">
            {showCaption && (
              <p className="text-sm font-semibold uppercase tracking-wider text-white/90 text-center px-4 py-2 shrink-0">
                {display.caption}
              </p>
            )}
            <div className="relative w-full flex-1 flex items-center justify-center min-h-0 px-14 sm:px-16">
              {hasGallery ? (
                <>
                  <button
                    type="button"
                    disabled={!canPrev}
                    aria-label="Previous image"
                    title="Previous image"
                    onClick={(e) => {
                      e.stopPropagation();
                      goPrev();
                    }}
                    className={`left-1 sm:left-2 ${navArrowBtn} ${
                      canPrev
                        ? "bg-white/15 text-white hover:bg-white/25"
                        : "cursor-not-allowed bg-white/5 text-white/30 opacity-40"
                    }`}
                  >
                    <ChevronLeft className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={!canNext}
                    aria-label="Next image"
                    title="Next image"
                    onClick={(e) => {
                      e.stopPropagation();
                      goNext();
                    }}
                    className={`right-1 sm:right-2 ${navArrowBtn} ${
                      canNext
                        ? "bg-white/15 text-white hover:bg-white/25"
                        : "cursor-not-allowed bg-white/5 text-white/30 opacity-40"
                    }`}
                  >
                    <ChevronRight className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
                  </button>
                </>
              ) : null}
              <div className="relative h-full w-full max-h-full flex items-center justify-center">
                {viewerIsDataUrl || unoptimized ? (
                  <img
                    key={display.src}
                    src={display.src}
                    alt={display.alt}
                    className="max-w-full max-h-full w-auto h-auto object-contain"
                  />
                ) : (
                  <Image
                    key={display.src}
                    src={display.src}
                    alt={display.alt}
                    fill
                    className="object-contain"
                    unoptimized={unoptimized}
                  />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
