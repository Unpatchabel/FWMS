import { cn } from "@/lib/utils";

export const Select = ({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
      "w-full rounded-lg border border-beige-border bg-surface px-3 py-2 text-sm text-ink",
      "focus:border-emerald",
      className
    )}
    {...props}
  >
    {children}
  </select>
);
