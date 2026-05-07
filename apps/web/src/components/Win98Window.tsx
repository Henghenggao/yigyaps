import type { ReactNode } from 'react';

export interface MenuItem {
  label: string;
  accessKey?: string;
}

export interface TabItem {
  label: string;
  dotColor?: string;
  active?: boolean;
  onClick?: () => void;
}

interface Win98WindowProps {
  title: string;
  icon?: string;
  menuItems?: MenuItem[];
  tabs?: TabItem[];
  statusBar?: ReactNode;
  bodyClass?: string;
  children: ReactNode;
}

export function Win98Window({
  title,
  icon,
  menuItems,
  tabs,
  statusBar,
  bodyClass,
  children,
}: Win98WindowProps) {
  return (
    <div className="w98-window w98-window--page">
      <div className="w98-titlebar">
        {icon && <span className="w98-titlebar__icon">{icon}</span>}
        <span className="w98-titlebar__title">{title}</span>
        <div className="w98-titlebar__controls">
          <button className="w98-ctrl-btn" aria-label="Minimize">─</button>
          <button className="w98-ctrl-btn" aria-label="Maximize">□</button>
          <button className="w98-ctrl-btn w98-ctrl-btn--close" aria-label="Close">✕</button>
        </div>
      </div>

      {menuItems && menuItems.length > 0 && (
        <div className="w98-menubar">
          {menuItems.map((item) => (
            <span key={item.label} className="w98-menu-item">
              {item.accessKey ? (
                <><u>{item.accessKey}</u>{item.label.slice(item.accessKey.length)}</>
              ) : item.label}
            </span>
          ))}
        </div>
      )}

      {tabs && tabs.length > 0 && (
        <div className="w98-tabs">
          {tabs.map((tab) => (
            <div
              key={tab.label}
              className={`w98-tab${tab.active ? ' w98-tab--active' : ''}`}
              onClick={tab.onClick}
            >
              {tab.dotColor && (
                <span className="w98-tab__dot" style={{ background: tab.dotColor }} />
              )}
              {tab.label}
            </div>
          ))}
        </div>
      )}

      <div className={`w98-body${bodyClass ? ` ${bodyClass}` : ''}`}>
        {children}
      </div>

      {statusBar !== undefined && (
        <div className="w98-statusbar">
          {typeof statusBar === 'string' ? (
            <div className="w98-statusbar__panel w98-statusbar__panel--grow">{statusBar}</div>
          ) : statusBar}
        </div>
      )}
    </div>
  );
}
