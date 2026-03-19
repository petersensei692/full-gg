"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "./Dialog";

interface AnalysisImageProps {
  src: string;
  alt: string;
  /** Shown above the image when focused (e.g. in lightbox) */
  caption?: string;
  /** Use when src is a data URL (base64) - Next Image requires remote domains */
  unoptimized?: boolean;
  className?: string;
}

const defaultImgClass = "max-w-full h-auto rounded-lg cursor-pointer border border-sidebar-border hover:border-primary/50 transition-colors object-contain";

export function AnalysisImage({ src, alt, caption, unoptimized = false, className }: AnalysisImageProps) {
  const [open, setOpen] = useState(false);

  const isDataUrl = src.startsWith("data:");
  const imgClass = className ? `${defaultImgClass} ${className}` : defaultImgClass;

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
            {caption && (
              <p className="text-sm font-medium text-white/90 text-center px-4 py-2 shrink-0">
                {caption}
              </p>
            )}
            <div className="relative w-full flex-1 flex items-center justify-center min-h-0">
            {isDataUrl || unoptimized ? (
              <img
                src={src}
                alt={alt}
                className="max-w-full max-h-full w-auto h-auto object-contain"
              />
            ) : (
              <Image
                src={src}
                alt={alt}
                fill
                className="object-contain"
                unoptimized={unoptimized}
              />
            )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
