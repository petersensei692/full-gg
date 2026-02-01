"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const SIDEBAR_WIDTH = "260px";

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & {
    /** When true, overlay starts after sidebar so navbar stays visible */
    containToMain?: boolean;
  }
>(({ className = "", containToMain, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={`fixed z-50 bg-black/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${
      containToMain ? `left-[var(--sidebar-width,${SIDEBAR_WIDTH})] top-0 right-0 bottom-0` : "inset-0"
    } ${className}`}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showClose?: boolean;
    /** When true, overlay and content are confined to main area (sidebar stays visible) */
    containToMain?: boolean;
  }
>(({ className = "", children, showClose = true, containToMain = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay containToMain={containToMain} />
    <DialogPrimitive.Content
      ref={ref}
      className={`fixed z-50 flex max-h-[100dvh] translate-x-[-50%] translate-y-[-50%] flex-col items-center justify-center p-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${
        containToMain
          ? "left-[calc(var(--sidebar-width,260px)+(100dvw-var(--sidebar-width,260px))/2)] top-[50%] w-[calc(100dvw-var(--sidebar-width,260px))] max-w-full"
          : "left-[50%] top-[50%] w-[100dvw] max-w-[100dvw]"
      } ${className}`}
      {...props}
    >
      {showClose && (
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors z-10"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </DialogPrimitive.Close>
      )}
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export { Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose, DialogContent };
