import { cn } from "@/lib/utils";

export const Input = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      "w-full rounded-lg border border-beige-border bg-surface px-3 py-2 text-sm text-ink",
      "placeholder:text-silver-muted focus:border-emerald",
      className
    )}
    {...props}
  />
);
