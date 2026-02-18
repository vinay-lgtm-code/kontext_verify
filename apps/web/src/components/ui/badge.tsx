import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Neobrutalism badge: blunt corners, bold border, color-coded variants
const badgeVariants = cva(
  "inline-flex items-center rounded-base border-2 border-black px-2 py-0.5 text-xs font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-main text-black",
        secondary: "bg-white text-black",
        green: "bg-main text-black",
        yellow: "bg-yellow text-black",
        red: "bg-red text-white",
        gray: "bg-white text-black",
        outline: "bg-transparent text-black",
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
