import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { StartMenu } from './StartMenu';

function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Yig Yaps — Registry';
  if (pathname === '/marketplace') return 'Marketplace';
  if (pathname === '/publish') return 'Publish Skill';
  if (pathname === '/my-packages') return 'My Packages';
  if (pathname === '/settings') return 'Settings';
  if (pathname === '/admin') return 'Admin';
  if (pathname === '/blog') return 'Docs';
  if (pathname.startsWith('/yaps/studio')) return 'YAP Studio';
  if (pathname.startsWith('/yaps/')) return 'YAP Assembly';
  if (pathname.startsWith('/skill/')) return 'Skill Detail';
  if (pathname.startsWith('/lab/')) return 'Evolution Lab';
  return 'Yig Yaps';
}

export function Taskbar() {
  const [startOpen, setStartOpen] = useState(false);
  const [clock, setClock] = useState('');
  const { user, openAuthModal } = useAuth();
  const location = useLocation();
  const taskbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Close start menu on navigation
  useEffect(() => {
    setStartOpen(false);
  }, [location.pathname]);

  // Close start menu on outside click
  useEffect(() => {
    if (!startOpen) return;
    const handle = (e: MouseEvent) => {
      if (taskbarRef.current && !taskbarRef.current.contains(e.target as Node)) {
        setStartOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [startOpen]);

  return (
    <div className="w98-taskbar" ref={taskbarRef} style={{ position: 'relative' }}>
      <button
        className="w98-start-btn"
        onClick={() => setStartOpen((v) => !v)}
      >
        <span className="w98-start-btn__mark">∴</span>
        Start
      </button>

      {startOpen && (
        <StartMenu
          onClose={() => setStartOpen(false)}
          user={user}
          onAuthClick={openAuthModal}
        />
      )}

      <button className="w98-taskbar-btn w98-taskbar-btn--active">
        ∴ {getPageTitle(location.pathname)}
      </button>

      <div className="w98-tray">
        <span className="w98-tray__mark" title="Yig Yaps agent — running">∴</span>
        <span className="w98-clock">{clock}</span>
      </div>
    </div>
  );
}
