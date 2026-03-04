import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border px-2 py-0.5 text-xs font-mono transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
  {
    variants: {
      variant: {
        default:
          "border-[var(--term-green)] text-[var(--term-green)] bg-transparent",
        secondary:
          "border-[var(--term-border-bright)] text-[var(--term-text-2)] bg-transparent",
        outline: "border-[var(--term-border-bright)] text-foreground bg-transparent",
        amber: "border-[var(--term-amber)] text-[var(--term-amber)] bg-transparent",
        red: "border-[var(--term-red)] text-[var(--term-red)] bg-transparent",
        cyan: "border-[var(--term-cyan)] text-[var(--term-cyan)] bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
