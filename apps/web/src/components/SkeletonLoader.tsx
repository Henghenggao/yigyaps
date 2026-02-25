export function SkeletonCard() {
    return (
        <div className="skeleton-card">
            <div className="skeleton-icon skeleton" />
            <div className="skeleton-title skeleton" />
            <div className="skeleton-desc skeleton" />
            <div className="skeleton-desc-short skeleton" />
            <div className="skeleton-footer skeleton" />
        </div>
    );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
    return (
        <div className="skills-grid">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}
