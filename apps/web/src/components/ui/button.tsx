import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Neobrutalism button: bold border, hard offset shadow, press-in hover effect
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-base text-sm font-bold border-2 border-black transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-shadow-none",
  {
    variants: {
      variant: {
        default:
          "bg-main text-black shadow-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-shadow-sm",
        secondary:
          "bg-white text-black shadow-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-shadow-sm",
        outline:
          "bg-transparent text-black shadow-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-shadow-sm",
        destructive:
          "bg-red text-white shadow-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-shadow-sm",
        yellow:
          "bg-yellow text-black shadow-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-shadow-sm",
        ghost: "border-transparent shadow-none hover:bg-black/5",
        link: "border-transparent shadow-none text-black underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
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
