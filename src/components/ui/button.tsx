import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-emerald text-white hover:bg-emerald-bright shadow-sm disabled:opacity-60",
  secondary:
    "bg-surface text-ink border border-beige-border hover:bg-surface-sunken",
  ghost: "text-ink-soft hover:bg-surface-sunken",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-pill px-4 py-2 text-sm font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
