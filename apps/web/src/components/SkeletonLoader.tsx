export function SkeletonCard() {
  return (
    <div className="skill-card" style={{ opacity: 0.6 }}>
      <div className="w98-progress" style={{ marginBottom: '8px' }}>
        <div className="w98-progress__fill" style={{ width: '60%' }} />
      </div>
      <div className="w98-progress" style={{ marginBottom: '8px' }}>
        <div className="w98-progress__fill" style={{ width: '80%' }} />
      </div>
      <div className="w98-progress">
        <div className="w98-progress__fill" style={{ width: '40%' }} />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="skills-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
