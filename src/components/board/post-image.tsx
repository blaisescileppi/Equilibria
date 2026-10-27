import { cn } from "../ui";

/**
 * Photos are served by an authenticated API route, so a plain <img> is
 * used: next/image's optimizer fetches images server-side without the
 * user's cookie and would get a 401.
 */
export function PostImage({ src, title, className }: { src: string | null; title: string; className?: string }) {
  if (!src) {
    return (
      <div
        aria-hidden
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-brand-soft to-sage-soft text-4xl",
          className,
        )}
      >
        🥗
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- see comment above
  return <img src={src} alt={title} className={cn("w-full object-cover", className)} loading="lazy" />;
}
