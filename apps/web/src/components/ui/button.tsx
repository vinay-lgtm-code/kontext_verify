import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 font-mono",
  {
    variants: {
      variant: {
        default:
          "border border-[var(--term-green)] text-[var(--term-green)] bg-transparent hover:bg-[var(--term-green)] hover:text-[#09090b]",
        secondary:
          "border border-[var(--term-border-bright)] text-foreground bg-[var(--term-surface)] hover:bg-[var(--term-surface-2)]",
        outline:
          "border border-[var(--term-border-bright)] text-[var(--term-text-2)] bg-transparent hover:bg-[var(--term-surface)] hover:text-foreground",
        ghost:
          "border border-transparent text-[var(--term-text-2)] hover:bg-[var(--term-surface)] hover:text-foreground",
        link: "text-[var(--term-blue)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
