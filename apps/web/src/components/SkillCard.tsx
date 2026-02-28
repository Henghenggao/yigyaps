import { Link } from "react-router-dom";
import type { SkillPackage } from "@yigyaps/types";

interface SkillCardProps {
  skill: SkillPackage;
  onClick?: () => void;
}

export function SkillCard({ skill, onClick }: SkillCardProps) {
  const displayName = skill.displayName || skill.packageId;

  return (
    <Link
      to={`/skill/${skill.packageId}`}
      className="card skill-card animate-fade-in"
      onClick={onClick}
    >
      <div className="card-top">
        <div className="skill-icon-box">
          {skill.icon || displayName.charAt(0).toUpperCase()}
        </div>
        <div className="maturity-badge">
          {skill.maturity}
        </div>
      </div>

      <div className="card-body">
        <h3 className="skill-title">{displayName}</h3>
        {skill.category && (
          <span className="category-pill">{skill.category}</span>
        )}
        <p className="skill-description">
          {skill.description || "No description provided."}
        </p>
      </div>

      <div className="card-bottom">
        <div className="skill-stats">
          <span className="stat-item">
            <strong>{skill.installCount.toLocaleString()}</strong> installs
          </span>
          {skill.rating > 0 && (
            <span className="stat-item rating">
              ★ {skill.rating.toFixed(1)}
            </span>
          )}
        </div>
        <div className="skill-price">
          {skill.license === 'open-source' ? 'Free' : `$${skill.priceUsd ?? 0}`}
        </div>
      </div>

      <style>{`
        .skill-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 1.75rem;
          text-decoration: none;
          color: inherit;
        }
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }
        .skill-icon-box {
          width: 52px;
          height: 52px;
          background: var(--color-accent-bg);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--color-primary);
        }
        .maturity-badge {
          font-size: 0.65rem;
          text-transform: uppercase;
          background: var(--color-bg);
          color: var(--color-text-sub);
          padding: 0.3rem 0.6rem;
          border-radius: 6px;
          font-weight: 700;
          border: 1px solid var(--color-border);
        }
        .skill-title {
          font-size: 1.5rem;
          margin-bottom: 0.6rem;
          line-height: 1.1;
          letter-spacing: -0.01em;
        }
        .category-pill {
          display: inline-block;
          font-size: 0.75rem;
          background: var(--color-accent-bg);
          padding: 0.25rem 0.75rem;
          border-radius: 100px;
          margin-bottom: 1.25rem;
          color: var(--color-primary);
          font-weight: 600;
        }
        .skill-description {
          font-size: 1rem;
          color: var(--color-text-sub);
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 2rem;
          line-height: 1.5;
        }
        .card-bottom {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1.25rem;
          border-top: 1px solid var(--color-border);
        }
        .skill-stats {
          font-size: 0.85rem;
          color: var(--color-text-sub);
          display: flex;
          gap: 1.25rem;
        }
        .stat-item strong {
          color: var(--color-text-main);
          font-weight: 600;
        }
        .rating {
          color: #F59E0B;
          font-weight: 700;
        }
        .skill-price {
          font-weight: 700;
          color: var(--color-primary);
          font-size: 1.1rem;
        }
      `}</style>
    </Link>
  );
}
