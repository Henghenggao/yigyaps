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
      className="skill-card fade-in"
      onClick={onClick}
    >
      <div className="card-header">
        <div className="card-icon">
          {skill.icon || displayName.charAt(0).toUpperCase()}
        </div>
        <div className="status-indicator">
          <span className="status-dot"></span>
          {skill.maturity === "stable" ? "Verified" : skill.maturity}
        </div>
      </div>
      <h3 className="card-title">{displayName}</h3>
      {skill.category && (
        <span className="skill-category-tag">{skill.category}</span>
      )}
      <p className="card-desc">
        {skill.description || "No description provided."}
      </p>
      <div className="card-footer">
        <div className="mint-quota">
          <span>{skill.installCount.toLocaleString()}</span> INSTALLS
          {skill.rating > 0 && (
            <span className="card-rating">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                color="var(--color-warning)"
                style={{ marginRight: "2px", verticalAlign: "middle" }}
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              {skill.rating.toFixed(1)}
            </span>
          )}
        </div>
        <div className="btn btn-outline btn-sm">View Details</div>
      </div>
    </Link>
  );
}
