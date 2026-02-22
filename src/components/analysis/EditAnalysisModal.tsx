"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { useImagePaste } from "@/hooks/useImagePaste";
import { getImageUrl } from "@/lib/imageUrls";
import { deleteStoredImage } from "@/lib/imageUpload";

interface EditAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialNotes: string;
  initialImages: string[];
  onSubmit: (payload: { notes: string; images: string[] }) => void;
}

export function EditAnalysisModal({
  open,
  onOpenChange,
  initialNotes,
  initialImages,
  onSubmit,
}: EditAnalysisModalProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setImages(initialImages);
    const applyInitial = () => {
      if (editorRef.current) {
        editorRef.current.innerHTML = initialNotes;
      }
    };
    applyInitial();
    // Defer so DialogContent is mounted and refs are set (Radix renders in portal after open)
    const t = setTimeout(applyInitial, 0);
    const t2 = setTimeout(applyInitial, 50);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [open, initialNotes, initialImages]);

  const { handlePaste } = useImagePaste({
    editorRef,
    onImageReady: (img) => setImages((prev) => [...prev, img.path]),
  });

  const handleSave = () => {
    const notes = editorRef.current?.innerHTML?.trim() ?? "";
    onSubmit({ notes, images });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={true}
        containToMain={true}
        className="max-h-[85dvh] flex flex-col items-stretch justify-start overflow-hidden bg-sidebar border border-sidebar-border rounded-xl p-0 shadow-xl"
      >
        <div className="scrollbar-modal flex flex-col min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="space-y-4 min-w-0 overflow-x-hidden p-6">
            <h3 className="text-lg font-semibold text-dashboard-foreground">Edit Analysis</h3>
            <div
              ref={editorRef}
              contentEditable
              data-placeholder="Update your analysis notes..."
              onPaste={handlePaste}
              className="min-h-[120px] max-h-[300px] w-full min-w-0 overflow-y-auto overflow-x-hidden rounded-lg border border-sidebar-border bg-header-input px-3 py-2.5 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary break-words break-all [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-dashboard-foreground/50 [&_*]:break-words [&_img]:max-w-[50%] [&_img]:max-h-[200px] [&_img]:w-[50%] [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:block [&_img]:my-2 [&_u]:underline [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium"
              suppressContentEditableWarning
            />
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((path) => (
                  <div key={path} className="relative">
                    <img
                      src={getImageUrl(path)}
                      alt="Analysis attachment"
                      className="h-20 w-28 object-cover rounded-lg border border-sidebar-border"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        setImages((prev) => prev.filter((p) => p !== path));
                        await deleteStoredImage(path).catch(() => undefined);
                      }}
                      className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center shadow"
                      aria-label="Remove image"
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-sidebar-border">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-sidebar-border px-4 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
