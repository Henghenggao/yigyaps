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
      className="skill-card"
      onClick={onClick}
      style={{ textDecoration: "none", color: "inherit" }}
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
      <p className="card-desc">
        {skill.description || "No description provided."}
      </p>
      <div className="card-footer">
        <div className="mint-quota">
          INSTALLS: <span>{skill.installCount}</span>
          {skill.rating > 0 && (
            <span style={{ marginLeft: "0.5rem" }}>
              ⭐ {skill.rating.toFixed(1)}
            </span>
          )}
        </div>
        <button
          className="btn btn-outline"
          style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
          onClick={(e) => {
            e.preventDefault();
            if (onClick) onClick();
          }}
        >
          View
        </button>
      </div>
    </Link>
  );
}
