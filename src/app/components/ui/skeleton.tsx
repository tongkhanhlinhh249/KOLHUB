import { cn } from "./utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-muted animate-pulse rounded-[8px]", className)} {...props} />;
}

export { Skeleton };
