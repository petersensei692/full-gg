"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "./Dialog";

interface AnalysisImageProps {
  src: string;
  alt: string;
  /** Use when src is a data URL (base64) - Next Image requires remote domains */
  unoptimized?: boolean;
}

export function AnalysisImage({ src, alt, unoptimized = false }: AnalysisImageProps) {
  const [open, setOpen] = useState(false);

  const isDataUrl = src.startsWith("data:");

  return (
    <>
      {isDataUrl || unoptimized ? (
        <img
          src={src}
          alt={alt}
          className="max-w-full rounded-lg cursor-pointer border border-sidebar-border hover:border-primary/50 transition-colors"
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
          className="max-w-full h-auto rounded-lg cursor-pointer border border-sidebar-border hover:border-primary/50 transition-colors object-contain"
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
          <div className="relative w-full h-[90dvh] flex items-center justify-center">
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
        </DialogContent>
      </Dialog>
    </>
  );
}
