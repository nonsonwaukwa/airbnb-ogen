"use client" // Keep if using Next.js App Router

import * as React from "react"
import * as RdxDialog from "@radix-ui/react-dialog" // Corrected: Added 'as'
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

// Use RdxDialog alias for primitives
const Sheet = RdxDialog.Root

const SheetTrigger = RdxDialog.Trigger

const SheetClose = RdxDialog.Close

const SheetPortal = RdxDialog.Portal

// --- SheetOverlay with forwardRef ---
const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof RdxDialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof RdxDialog.Overlay>
>(({ className, ...props }, ref) => (
  <RdxDialog.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref} // Forward ref
  />
))
SheetOverlay.displayName = RdxDialog.Overlay.displayName

// --- SheetContent Variants and Component with forwardRef ---
const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof RdxDialog.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof RdxDialog.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <RdxDialog.Content
      ref={ref} // Forward ref
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {children}
      <RdxDialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </RdxDialog.Close>
    </RdxDialog.Content>
  </SheetPortal>
))
SheetContent.displayName = RdxDialog.Content.displayName

// --- SheetHeader with forwardRef ---
const SheetHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref} // Forward ref
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
))
SheetHeader.displayName = "SheetHeader"

// --- SheetFooter with forwardRef ---
const SheetFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref} // Forward ref
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
))
SheetFooter.displayName = "SheetFooter"

// --- SheetTitle with forwardRef ---
const SheetTitle = React.forwardRef<
  React.ElementRef<typeof RdxDialog.Title>,
  React.ComponentPropsWithoutRef<typeof RdxDialog.Title>
>(({ className, ...props }, ref) => (
  <RdxDialog.Title
    ref={ref} // Forward ref
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = RdxDialog.Title.displayName

// --- SheetDescription with forwardRef ---
const SheetDescription = React.forwardRef<
  React.ElementRef<typeof RdxDialog.Description>,
  React.ComponentPropsWithoutRef<typeof RdxDialog.Description>
>(({ className, ...props }, ref) => (
  <RdxDialog.Description
    ref={ref} // Forward ref
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = RdxDialog.Description.displayName

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  // SheetPortal, // Typically not exported directly
  // SheetOverlay, // Typically not exported directly
}
