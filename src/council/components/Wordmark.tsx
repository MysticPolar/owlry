/* the logotype: chunky lowercase "owlry" with the yellow period */
export function Wordmark({ size = 26, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`wordmark ${className}`} style={{ fontSize: size }} aria-label="owlry" role="img">
      owlry<span className="wordmark-dot" aria-hidden="true">.</span>
    </span>
  );
}
