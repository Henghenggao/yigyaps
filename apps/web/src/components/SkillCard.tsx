import { memo } from 'react';
import { Link } from 'react-router-dom';
import type { SkillPackage } from '@yigyaps/types';

interface SkillCardProps {
  skill: SkillPackage;
  onClick?: () => void;
}

export const SkillCard = memo(function SkillCard({ skill, onClick }: SkillCardProps) {
  const displayName = skill.displayName || skill.packageId;

  return (
    <Link
      to={`/skill/${skill.packageId}`}
      className="skill-card"
      onClick={onClick}
    >
      <div className="skill-card-top">
        <div className="skill-icon">
          {skill.icon || displayName.charAt(0).toUpperCase()}
        </div>
        <span className="skill-maturity">{skill.maturity}</span>
      </div>

      <div className="skill-name">{displayName}</div>
      {skill.category && <div className="skill-cat">{skill.category}</div>}
      <p className="skill-desc">
        {skill.description || 'No description provided.'}
      </p>

      <div className="skill-foot">
        <span>
          <strong>{skill.installCount.toLocaleString()}</strong> installs
          {Number(skill.rating) > 0 && (
            <span className="skill-rating"> · ★ {Number(skill.rating).toFixed(1)}</span>
          )}
        </span>
        <span className="skill-price">
          {Number(skill.priceUsd || 0) === 0
            ? 'Free'
            : `$${Number(skill.priceUsd).toFixed(2)}`}
        </span>
      </div>
    </Link>
  );
});
