import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export function NotFoundPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handle = (_e: KeyboardEvent) => void navigate('/');
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [navigate]);

  return (
    <div className="w98-bsod" onClick={() => navigate('/')}>
      <div className="w98-bsod__title">YIG_FATAL_ERROR</div>
      <p className="w98-bsod__code">*** STOP: 0x00000404 (PAGE_NOT_FOUND)</p>
      <div className="w98-bsod__body">
        <p>
          A fatal exception has occurred at the requested URL. The current page
          cannot be displayed.
        </p>
        <p style={{ marginTop: 16 }}>
          If this is the first time you've seen this error, return to the registry.
          If problems continue, contact the system administrator.
        </p>
      </div>
      <p>Press any key to return to the registry<span className="w98-bsod__code" style={{ fontSize: '1em', animation: 'bsod-blink 1s step-end infinite' }}>_</span></p>
    </div>
  );
}
