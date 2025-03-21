import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "~/lib/utils";

interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
}

const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ text = "Button", className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "group relative inline-flex h-10 items-center justify-center overflow-hidden rounded-md bg-black px-4 py-2 text-white transition-all",
        className,
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center transition-all duration-300 group-hover:-translate-x-2">
        {text}
      </span>
      <span className="absolute right-1 z-10 translate-x-8 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
        <ArrowRight className="h-5 w-5" />
      </span>
      <div className="absolute left-0 top-0 h-full w-0 bg-primary transition-all duration-300 group-hover:w-full dark:bg-gray-800" />
    </button>
  );
});

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };
