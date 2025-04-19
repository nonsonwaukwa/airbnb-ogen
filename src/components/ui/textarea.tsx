import * as React from "react"

import { cn } from "@/lib/utils" // Make sure cn is imported

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

// Ensure the component is wrapped in React.forwardRef
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => { // ref is received here
    return (
      <textarea
        className={cn( // Use cn utility for merging classes
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className // Merge incoming className prop
        )}
        ref={ref} // Forward the ref to the actual textarea element
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea" // Good practice for DevTools

export { Textarea }

