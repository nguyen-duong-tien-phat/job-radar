function Block({ className, index }: { className: string; index: number }) {
  return (
    <div
      className={`skeleton reveal rounded-xl ${className}`}
      style={{ "--i": index } as React.CSSProperties}
    />
  );
}

/** Shimmering placeholder shown while a page's data streams in. */
export function ContentSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Block key={i} className="h-24" index={i} />
        ))}
      </div>
      <Block className="h-72" index={4} />
      <div className="grid gap-8 md:grid-cols-2">
        <Block className="h-48" index={5} />
        <Block className="h-48" index={6} />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
