"use client";

import { forwardRef } from "react";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

const styles: Record<Variant, string> = {
  primary:
    "border border-brass bg-brass text-ink font-bold shadow-[0_8px_24px_rgba(214,174,85,.16)] hover:bg-[#e2bd68] disabled:opacity-40 disabled:hover:bg-brass",
  ghost:
    "border border-line bg-white/[.025] text-parchment hover:border-brass/65 hover:bg-brass/[.07] hover:text-brass disabled:opacity-40 disabled:hover:border-line disabled:hover:text-parchment",
  danger:
    "border border-rust/45 bg-rust/[.06] text-[#e48a78] hover:border-rust hover:bg-rust/10 disabled:opacity-40 disabled:hover:border-line",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "ghost", size = "md", className = "", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-brass/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink active:translate-y-px ${
        size === "sm" ? "min-h-9 px-3 text-xs" : "min-h-11 px-5 text-sm"
      } ${styles[variant]} ${className}`}
      {...props}
    />
  );
});

export default Button;
