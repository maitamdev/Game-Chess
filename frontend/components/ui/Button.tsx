"use client";

import { forwardRef } from "react";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

const styles: Record<Variant, string> = {
  primary:
    "bg-brass text-ink font-medium hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100",
  ghost:
    "border border-line text-parchment hover:border-brass hover:text-brass disabled:opacity-40 disabled:hover:border-line disabled:hover:text-parchment",
  danger:
    "border border-line text-rust hover:border-rust disabled:opacity-40 disabled:hover:border-line",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "ghost", size = "md", className = "", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-[6px] transition-colors ${
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm"
      } ${styles[variant]} ${className}`}
      {...props}
    />
  );
});

export default Button;
