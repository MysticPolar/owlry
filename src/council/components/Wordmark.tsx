/* the logotype: "owlry" in Anton, skewed, with the gold period */
export function Wordmark({ size, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`wordmark ${className}`} style={size ? { fontSize: size } : undefined} aria-label="owlry" role="img">
      owlry<i aria-hidden="true">.</i>
    </span>
  );
}
