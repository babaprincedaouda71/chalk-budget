"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="pointer-events-auto fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Ancré vers le haut (et non centré) : quand le clavier s'ouvre sur
        // mobile, un dialogue centré verticalement devient à moitié
        // inaccessible. Hauteur en dvh + défilement interne.
        "paper-bg pointer-events-auto fixed left-1/2 top-[max(2.5rem,env(safe-area-inset-top))] z-50 max-h-[calc(100dvh-8rem)] w-[calc(100%-2rem)] max-w-app -translate-x-1/2 overflow-y-auto rounded-xl border border-ink/15 p-5 text-ink shadow-2xl focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-3 rounded-full p-1 text-inkSoft hover:bg-ink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40">
        <X className="h-4 w-4" />
        <span className="sr-only">Fermer</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("mb-3 text-lg font-bold text-ink", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogTitle };
