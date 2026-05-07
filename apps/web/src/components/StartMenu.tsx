import { Link } from 'react-router-dom';
import type { User } from '../contexts/AuthContext';

interface StartMenuProps {
  onClose: () => void;
  user: User | null;
  onAuthClick: () => void;
}

export function StartMenu({ onClose, user, onAuthClick }: StartMenuProps) {
  return (
    <div className="w98-startmenu is-open">
      <div className="w98-startmenu__brand">
        <span className="w98-startmenu__brand-text">Yig Yaps</span>
      </div>
      <div className="w98-startmenu__items">
        <Link to="/" className="w98-startmenu__item" onClick={onClose}>
          <span>∴</span>&nbsp;Yig Yaps
        </Link>
        <div className="w98-startmenu__sep" />
        <Link to="/marketplace" className="w98-startmenu__item" onClick={onClose}>
          <span aria-hidden="true">📦</span><span> Marketplace</span>
        </Link>
        <Link to="/yaps/studio" className="w98-startmenu__item" onClick={onClose}>
          <span aria-hidden="true">🔧</span><span> YAP Studio</span>
        </Link>
        <Link to="/publish" className="w98-startmenu__item" onClick={onClose}>
          <span aria-hidden="true">⬆</span><span> Publish Skill</span>
        </Link>
        <Link to="/my-packages" className="w98-startmenu__item" onClick={onClose}>
          <span aria-hidden="true">📊</span><span> My Packages</span>
        </Link>
        <div className="w98-startmenu__sep" />
        <Link to="/blog" className="w98-startmenu__item" onClick={onClose}>
          <span aria-hidden="true">📄</span><span> Docs</span>
        </Link>
        <div className="w98-startmenu__sep" />
        {user ? (
          <Link to="/settings" className="w98-startmenu__item" onClick={onClose}>
            👤&nbsp;{user.displayName || 'Account'}
          </Link>
        ) : (
          <div
            className="w98-startmenu__item"
            style={{ cursor: 'pointer' }}
            onClick={() => { onAuthClick(); onClose(); }}
          >
            🔑&nbsp;Sign In
          </div>
        )}
      </div>
    </div>
  );
}
