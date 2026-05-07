# Yig Yaps Win98 Brand Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every visual element in `apps/web` with the Yig brand (Ink/Paper/Cinnabar, Inter, Win98 chrome) — zero old design artifacts remain.

**Architecture:** The whole app becomes a Win98 desktop (`#1A1A1A` background). A fixed `Taskbar` at top replaces the old sticky `Header`. Every page renders as one or more `Win98Window` components stacked vertically in a centered column. Content inside windows uses clean Inter + Yig brand tokens; Win98 chrome stays at the window border.

**Tech Stack:** React 18 + TypeScript + Vite · vitest + @testing-library/react · CSS (no CSS-in-JS for new code) · react-router-dom v6

**Working directory for all commands:** `C:\Users\gaoyu\Documents\GitHub\yigyaps`

---

## File Map

**Create:**
- `apps/web/src/win98.css` — Win98 chrome layer (copied from Yigfrontend)
- `apps/web/src/components/Taskbar.tsx` — fixed top bar replacing Header
- `apps/web/src/components/StartMenu.tsx` — dropdown nav from Start button
- `apps/web/src/components/Win98Window.tsx` — reusable window shell
- `apps/web/src/components/Win98Dialog.tsx` — modal dialog box
- `apps/web/src/components/Win98Wizard.tsx` — sidebar-step wizard layout

**Modify:**
- `apps/web/index.html` — fonts, title, meta
- `apps/web/src/index.css` — replace all tokens; add page-specific utility classes incrementally
- `apps/web/src/App.css` — replace with desktop shell layout
- `apps/web/src/App.tsx` — add desktop wrapper, Taskbar, remove Header
- `apps/web/src/components/AuthModal.tsx` — Win98Dialog styling
- `apps/web/src/components/SkillCard.tsx` — flat border, no rounded cards
- `apps/web/src/components/SearchBar.tsx` — w98-input style
- `apps/web/src/components/FilterPanel.tsx` — w98-groupbox style
- `apps/web/src/components/Pagination.tsx` — w98-btn row
- `apps/web/src/components/InstallButton.tsx` — w98-btn primary
- `apps/web/src/components/ReviewForm.tsx` — w98-input + w98-btn
- `apps/web/src/components/SkeletonLoader.tsx` — w98-progress bar
- `apps/web/src/pages/LandingPage.tsx` — 5 Win98 windows
- `apps/web/src/pages/HomePage.tsx` — 1 window + toolbar
- `apps/web/src/pages/SkillDetailPage.tsx` — 3 windows
- `apps/web/src/pages/PublishSkillPage.tsx` — Win98Wizard
- `apps/web/src/pages/EditPackagePage.tsx` — Win98Wizard
- `apps/web/src/pages/MyPackagesPage.tsx` — 1 window
- `apps/web/src/pages/YapStudioPage.tsx` — 1 window
- `apps/web/src/pages/YapAssemblyPage.tsx` — 1 window
- `apps/web/src/pages/EvolutionLabPage.tsx` — 1 window
- `apps/web/src/pages/SettingsPage.tsx` — 1 window
- `apps/web/src/pages/AdminPage.tsx` — 1 window
- `apps/web/src/pages/BlogPage.tsx` — 1 window
- `apps/web/src/pages/TermsPage.tsx` — 1 window
- `apps/web/src/pages/PrivacyPage.tsx` — 1 window
- `apps/web/src/pages/NotFoundPage.tsx` — BSOD 404
- `apps/web/src/pages/AuthCallback.tsx` — Win98Dialog
- `apps/web/src/pages/VerifyEmailPage.tsx` — Win98Dialog
- `apps/web/src/pages/ResetPasswordPage.tsx` — Win98Dialog

**Delete:**
- `apps/web/src/components/Header.tsx`
- `apps/web/src/App.css` (replaced wholesale)

---

## Task 1: CSS Foundation

**Files:**
- Create: `apps/web/src/win98.css`
- Modify: `apps/web/src/index.css`
- Modify: `apps/web/src/App.css`
- Modify: `apps/web/index.html`

- [ ] **Step 1: Copy win98.css from Yigfrontend**

```powershell
Copy-Item "C:\Users\gaoyu\Documents\GitHub\Yigfrontend\.claude\worktrees\kind-euler-78eb77\styles\win98.css" `
  "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\win98.css"
```

- [ ] **Step 2: Replace index.css with Yig brand tokens**

Overwrite `apps/web/src/index.css` entirely:

```css
/* Yig brand tokens — source of truth for apps/web */
:root {
  /* Colors */
  --yig-ink:      #0A0A0A;
  --yig-paper:    #FAF9F5;
  --yig-cinnabar: #C8321B;
  --yig-phosphor: #00B85A;

  /* Convenience aliases */
  --yig-bg:     var(--yig-paper);
  --yig-fg:     var(--yig-ink);
  --yig-accent: var(--yig-cinnabar);

  /* Typography */
  --yig-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  --yig-font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --yig-font-w98:  Tahoma, 'MS Sans Serif', 'Segoe UI', sans-serif;

  /* Tracking */
  --yig-tracking-tight:    -0.045em;
  --yig-tracking-headline: -0.025em;
  --yig-tracking-caps:      0.1em;

  /* Type scale */
  --yig-text-xs:   11px;
  --yig-text-sm:   13px;
  --yig-text-base: 15px;
  --yig-text-lg:   18px;
  --yig-text-xl:   22px;
  --yig-text-2xl:  28px;
  --yig-text-3xl:  38px;
  --yig-text-4xl:  56px;

  /* Spacing */
  --yig-space-1:  4px;
  --yig-space-2:  8px;
  --yig-space-3:  12px;
  --yig-space-4:  16px;
  --yig-space-6:  24px;
  --yig-space-8:  32px;
  --yig-space-10: 40px;
  --yig-space-12: 48px;
  --yig-space-16: 64px;

  /* Win98 chrome */
  --w98-face:              #C0C0C0;
  --w98-highlight:         #FFFFFF;
  --w98-shadow:            #808080;
  --w98-deep-shadow:       #404040;
  --w98-titlebar-active:   #C8321B;
  --w98-titlebar-inactive: #7B7B7B;
  --w98-titletext:         #FFFFFF;
  --w98-desktop:           #1A1A1A;
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  padding: 0;
  font-family: var(--yig-font-sans);
  background: var(--w98-desktop);
  color: var(--yig-ink);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Wordmark utility ── */
.yig-wordmark {
  font-family: var(--yig-font-sans);
  font-weight: 700;
  letter-spacing: var(--yig-tracking-tight);
  color: var(--yig-ink);
}
.yig-wordmark .dot { color: var(--yig-cinnabar); }

/* ── Spinner (shared) ── */
.spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid var(--w98-face);
  border-top-color: var(--yig-cinnabar);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Landing hero ── */
.landing-hero-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: var(--yig-space-8);
  align-items: center;
  padding: var(--yig-space-8) 0;
}
.hero-eyebrow {
  font-family: var(--yig-font-mono);
  font-size: var(--yig-text-xs);
  text-transform: uppercase;
  letter-spacing: var(--yig-tracking-caps);
  color: var(--yig-cinnabar);
  font-weight: 700;
  margin: 0 0 var(--yig-space-4);
}
.hero-h1 {
  font-family: var(--yig-font-sans);
  font-size: clamp(24px, 3vw, var(--yig-text-3xl));
  font-weight: 700;
  letter-spacing: var(--yig-tracking-headline);
  line-height: 1.2;
  color: var(--yig-ink);
  margin: 0 0 var(--yig-space-4);
}
.hero-dot { color: var(--yig-cinnabar); }
.hero-sub {
  font-size: var(--yig-text-base);
  color: #555;
  line-height: 1.7;
  max-width: 480px;
  margin: 0 0 var(--yig-space-6);
}
.hero-btn-row { display: flex; gap: var(--yig-space-2); flex-wrap: wrap; align-items: center; }
.hero-note {
  font-family: var(--yig-font-mono);
  font-size: var(--yig-text-xs);
  color: #888;
  margin: var(--yig-space-4) 0 0;
  letter-spacing: 0.05em;
}
.landing-hero-mark { display: flex; flex-direction: column; align-items: center; gap: var(--yig-space-3); }
.hero-mark-glyph { font-size: 80px; line-height: 1; color: var(--yig-ink); }
.hero-wordmark { font-family: var(--yig-font-sans); font-weight: 700; font-size: 22px; letter-spacing: var(--yig-tracking-tight); color: var(--yig-ink); }
.hero-wordmark-sub { font-weight: 400; }
.hero-version { font-family: var(--yig-font-mono); font-size: var(--yig-text-xs); color: var(--yig-cinnabar); letter-spacing: var(--yig-tracking-caps); }

/* ── Value grid (landing) ── */
.value-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
.value-pane {
  padding: var(--yig-space-6);
  border-right: 1px solid #ddd;
  background: var(--yig-paper);
  font-family: var(--yig-font-sans);
}
.value-pane:last-child { border-right: none; }
.value-label { font-family: var(--yig-font-mono); font-size: var(--yig-text-xs); text-transform: uppercase; letter-spacing: var(--yig-tracking-caps); color: var(--yig-cinnabar); margin: 0 0 var(--yig-space-2); }
.value-title { font-size: var(--yig-text-sm); font-weight: 700; color: var(--yig-ink); margin: 0 0 var(--yig-space-2); line-height: 1.4; }
.value-body { font-size: var(--yig-text-xs); color: #555; line-height: 1.6; margin: 0; }

/* ── Security grid (landing) ── */
.sec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--yig-space-3); }
.sec-card {
  background: #fff;
  border: 1px solid #ddd;
  padding: var(--yig-space-4);
  font-family: var(--yig-font-sans);
  position: relative;
}
.sec-card.sec-highlight { border-color: var(--yig-cinnabar); }
.sec-card.sec-highlight::before {
  content: 'The Yig Yaps Standard';
  position: absolute; top: -10px; right: 12px;
  background: var(--yig-cinnabar); color: #fff;
  font-size: 9px; font-weight: 700; padding: 1px 8px;
  letter-spacing: 0.05em;
}
.sec-card.sec-dim { background: #F5F5F3; border-color: #E0E0DE; opacity: 0.85; }
.sec-label { font-family: var(--yig-font-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--yig-cinnabar); margin: 0 0 var(--yig-space-2); }
.sec-title { font-size: var(--yig-text-sm); font-weight: 700; color: var(--yig-ink); margin: 0 0 var(--yig-space-2); }
.sec-body { font-size: var(--yig-text-xs); color: #555; line-height: 1.6; margin: 0; }

/* ── Marketplace toolbar + grid ── */
.mp-toolbar { display: flex; align-items: center; gap: var(--yig-space-2); padding: var(--yig-space-1) var(--yig-space-2); background: var(--w98-face); border-bottom: 1px solid var(--w98-shadow); }
.mp-sep { width: 1px; height: 18px; background: var(--w98-shadow); margin: 0 var(--yig-space-1); box-shadow: 1px 0 0 var(--w98-highlight); }
.mp-layout { display: grid; grid-template-columns: 200px 1fr; gap: 0; }
.mp-sidebar { border-right: 1px solid #ddd; padding: var(--yig-space-3); background: var(--yig-paper); }
.mp-content { padding: var(--yig-space-3); background: var(--yig-paper); }
.mp-count { font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); color: #666; margin: 0 0 var(--yig-space-3); }
.skills-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--yig-space-3); }

/* ── Skill card ── */
.skill-card {
  display: flex; flex-direction: column; height: 100%;
  background: #fff; border: 1px solid #ddd; padding: var(--yig-space-4);
  text-decoration: none; color: inherit; cursor: pointer;
  transition: box-shadow 0.1s;
}
.skill-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
.skill-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--yig-space-3); }
.skill-icon { width: 36px; height: 36px; background: #F2F0EA; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: var(--yig-cinnabar); }
.skill-maturity { font-family: var(--yig-font-w98); font-size: 9px; text-transform: uppercase; background: #eee; color: #666; padding: 2px 6px; border: 1px solid #ccc; }
.skill-name { font-size: var(--yig-text-sm); font-weight: 700; color: var(--yig-ink); margin: 0 0 var(--yig-space-1); letter-spacing: -0.01em; }
.skill-cat { font-size: 10px; color: var(--yig-cinnabar); margin: 0 0 var(--yig-space-2); font-weight: 600; }
.skill-desc { font-size: var(--yig-text-xs); color: #666; line-height: 1.5; margin: 0 0 var(--yig-space-3); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; flex: 1; }
.skill-foot { display: flex; justify-content: space-between; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: var(--yig-space-2); margin-top: auto; }
.skill-price { font-weight: 700; color: var(--yig-cinnabar); }
.skill-rating { color: var(--yig-cinnabar); font-weight: 700; }

/* ── Search bar ── */
.search-bar-wrapper { display: flex; gap: var(--yig-space-2); align-items: center; flex: 1; }
.w98-search-input {
  flex: 1; height: 21px; padding: 0 var(--yig-space-2);
  font-family: var(--yig-font-w98); font-size: var(--yig-text-xs);
  background: #fff; border: none; outline: none;
  box-shadow: inset -1px -1px #fff, inset 1px 1px var(--w98-deep-shadow), inset -2px -2px #dfdfdf, inset 2px 2px var(--w98-shadow);
}
.search-clear-btn {
  background: var(--w98-face); border: none; height: 21px; padding: 0 var(--yig-space-2);
  font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); cursor: pointer;
  box-shadow: inset 1px 1px #fff, inset -1px -1px var(--w98-deep-shadow), inset 2px 2px #dfdfdf, inset -2px -2px var(--w98-shadow);
}

/* ── Filter panel ── */
.filter-group { margin-bottom: var(--yig-space-3); }
.filter-legend { font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); font-weight: 700; padding: 0 var(--yig-space-1); margin-left: var(--yig-space-1); }
.filter-groupbox { border: 1px solid; border-color: var(--w98-shadow) var(--w98-highlight) var(--w98-highlight) var(--w98-shadow); padding: var(--yig-space-2) var(--yig-space-3) var(--yig-space-3); }
.filter-row { display: flex; align-items: center; gap: var(--yig-space-2); margin-bottom: 2px; font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); cursor: pointer; }
.filter-select { height: 21px; width: 100%; font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); box-shadow: inset -1px -1px #fff, inset 1px 1px var(--w98-deep-shadow), inset -2px -2px #dfdfdf, inset 2px 2px var(--w98-shadow); border: none; background: #fff; }

/* ── Pagination ── */
.pagination { display: flex; align-items: center; gap: var(--yig-space-2); padding-top: var(--yig-space-3); border-top: 1px solid var(--w98-shadow); font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); }
.pagination-info { flex: 1; color: #666; }
.pagination-controls { display: flex; gap: 2px; align-items: center; }
.pagination-btn { height: 21px; min-width: 21px; padding: 0 var(--yig-space-2); background: var(--w98-face); border: none; font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); cursor: pointer; box-shadow: inset 1px 1px #fff, inset -1px -1px var(--w98-deep-shadow), inset 2px 2px #dfdfdf, inset -2px -2px var(--w98-shadow); }
.pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pagination-btn.active { box-shadow: inset -1px -1px #fff, inset 1px 1px var(--w98-deep-shadow), inset -2px -2px #dfdfdf, inset 2px 2px var(--w98-shadow); background: #B8B8B8; font-weight: 700; }

/* ── Install button ── */
.install-btn-container { display: flex; flex-direction: column; gap: var(--yig-space-2); }
.install-error { font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); color: var(--yig-cinnabar); }

/* ── Skill detail ── */
.skill-detail-body { display: grid; grid-template-columns: 1fr 240px; gap: var(--yig-space-8); }
.skill-detail-meta { display: flex; flex-direction: column; gap: var(--yig-space-3); }
.meta-row { display: flex; align-items: baseline; gap: var(--yig-space-2); font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); }
.meta-label { color: #888; min-width: 80px; }
.meta-value { color: var(--yig-ink); font-weight: 600; }
.meta-badge { background: var(--yig-cinnabar); color: #fff; font-size: 9px; padding: 1px 6px; font-weight: 700; letter-spacing: 0.05em; }
.skill-install-panel { display: flex; flex-direction: column; gap: var(--yig-space-3); padding-left: var(--yig-space-8); border-left: 1px solid #ddd; }
.skill-price-large { font-family: var(--yig-font-sans); font-size: var(--yig-text-2xl); font-weight: 700; color: var(--yig-cinnabar); }
.skill-stats-row { display: flex; gap: var(--yig-space-3); font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); color: #666; }

/* ── Wizard ── */
.wizard-heading { font-family: var(--yig-font-sans); font-size: var(--yig-text-lg); font-weight: 700; color: var(--yig-ink); margin: 0; }
.wizard-sub { font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); color: #666; margin: 0; }
.wizard-field { display: flex; flex-direction: column; gap: 3px; }
.wizard-label { font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); color: var(--yig-ink); }

/* ── Dashboard ── */
.dash-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--yig-space-2); margin-bottom: var(--yig-space-6); }
.dash-stat { background: var(--w98-face); padding: var(--yig-space-4); box-shadow: inset 1px 1px #fff, inset -1px -1px var(--w98-deep-shadow), inset 2px 2px #dfdfdf, inset -2px -2px var(--w98-shadow); }
.dash-stat-value { font-family: var(--yig-font-sans); font-size: var(--yig-text-2xl); font-weight: 700; color: var(--yig-ink); }
.dash-stat-label { font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); color: #666; margin-top: 2px; }
.dash-list { display: flex; flex-direction: column; gap: var(--yig-space-2); }
.dash-item { display: flex; align-items: flex-start; gap: var(--yig-space-3); padding: var(--yig-space-3); border: 1px solid #ddd; background: #fff; }
.dash-item-icon { width: 32px; height: 32px; background: #F2F0EA; display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--yig-cinnabar); flex-shrink: 0; font-size: 14px; }
.dash-item-main { flex: 1; min-width: 0; }
.dash-item-title { font-size: var(--yig-text-sm); font-weight: 700; color: var(--yig-ink); margin: 0 0 2px; }
.dash-item-sub { font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); color: #666; margin: 0; }
.dash-item-actions { display: flex; gap: var(--yig-space-1); align-items: center; flex-shrink: 0; }

/* ── Empty / loading states ── */
.empty-state { text-align: center; padding: var(--yig-space-12) 0; font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); color: #666; }
.empty-state p { margin: 0; }

/* ── Auth dialog content ── */
.auth-dialog-body { display: flex; flex-direction: column; gap: var(--yig-space-3); font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); }
.auth-divider { display: flex; align-items: center; gap: var(--yig-space-2); color: #888; }
.auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: var(--w98-shadow); }

/* ── Reviews ── */
.review-item { border-bottom: 1px solid #eee; padding: var(--yig-space-3) 0; }
.review-header { display: flex; align-items: center; gap: var(--yig-space-2); margin-bottom: var(--yig-space-2); font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); }
.review-stars { color: var(--yig-cinnabar); font-size: var(--yig-text-sm); }
.review-body { font-size: var(--yig-text-xs); color: #444; line-height: 1.5; margin: 0; }

/* ── BSOD ── */
.w98-bsod {
  background: var(--yig-cinnabar);
  color: #fff;
  font-family: var(--yig-font-mono);
  font-size: 14px;
  line-height: 1.6;
  padding: 4rem;
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  cursor: pointer;
}
.bsod-title { background: #fff; color: var(--yig-cinnabar); display: inline-block; padding: 0 8px; font-weight: 700; margin-bottom: var(--yig-space-6); }
.bsod-code { font-size: 18px; font-weight: 700; margin-bottom: var(--yig-space-4); }
.bsod-body { max-width: 600px; opacity: 0.9; margin-bottom: var(--yig-space-8); }
.bsod-prompt { animation: bsod-blink 1s step-end infinite; }
@keyframes bsod-blink { 50% { opacity: 0; } }

/* ── Markdown / Blog ── */
.md-body { font-family: var(--yig-font-sans); font-size: var(--yig-text-base); color: var(--yig-ink); line-height: 1.7; }
.md-body h1, .md-body h2, .md-body h3 { font-weight: 700; letter-spacing: var(--yig-tracking-headline); margin-top: var(--yig-space-8); margin-bottom: var(--yig-space-3); }
.md-body code { font-family: var(--yig-font-mono); font-size: var(--yig-text-sm); background: #F2F0EA; padding: 1px 5px; }
.md-body pre { background: #F2F0EA; padding: var(--yig-space-4); box-shadow: inset -1px -1px #fff, inset 1px 1px var(--w98-deep-shadow), inset -2px -2px #dfdfdf, inset 2px 2px var(--w98-shadow); overflow-x: auto; }
.md-body pre code { background: none; padding: 0; }

/* ── Settings / Admin ── */
.settings-section { margin-bottom: var(--yig-space-8); }
.settings-groupbox { border: 1px solid; border-color: var(--w98-shadow) var(--w98-highlight) var(--w98-highlight) var(--w98-shadow); padding: var(--yig-space-4) var(--yig-space-6) var(--yig-space-6); }
.settings-legend { font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); font-weight: 700; padding: 0 var(--yig-space-1); margin-left: var(--yig-space-1); }
.settings-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: var(--yig-space-4); }
.settings-label { font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); color: var(--yig-ink); }
.admin-table { width: 100%; border-collapse: collapse; font-family: var(--yig-font-w98); font-size: var(--yig-text-xs); }
.admin-table th { background: var(--w98-face); text-align: left; padding: var(--yig-space-2) var(--yig-space-3); border: 1px solid var(--w98-shadow); font-weight: 700; }
.admin-table td { padding: var(--yig-space-2) var(--yig-space-3); border: 1px solid #ddd; }
.admin-table tr:nth-child(even) td { background: #F5F5F3; }

/* ── Responsive ── */
@media (max-width: 700px) {
  .landing-hero-body { grid-template-columns: 1fr; }
  .landing-hero-mark { display: none; }
  .value-grid { grid-template-columns: 1fr; }
  .sec-grid { grid-template-columns: 1fr; }
  .mp-layout { grid-template-columns: 1fr; }
  .mp-sidebar { display: none; }
  .skill-detail-body { grid-template-columns: 1fr; }
  .skill-install-panel { border-left: none; padding-left: 0; border-top: 1px solid #ddd; padding-top: var(--yig-space-4); }
  .dash-stats { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: Replace App.css with desktop shell styles**

```css
/* apps/web/src/App.css */
.app-desktop {
  min-height: 100vh;
  background: var(--w98-desktop);
}
```

- [ ] **Step 4: Update index.html — fonts, title, meta**

In `apps/web/index.html`, replace the `<head>` contents:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Yig Yaps — The open registry for YAP skills. Publish your expertise, let AI agents pay to consult it." />
    <meta property="og:title" content="Yig Yaps — Open Skill Registry" />
    <meta property="og:description" content="Publish expertise. Earn royalties. MCP-compatible." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
    <title>Yig Yaps — Open Skill Registry</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Import win98.css in main.tsx**

In `apps/web/src/main.tsx`, add the import:

```tsx
import './win98.css'
```

(It should appear after `import './index.css'` if that's already imported there, or add both imports.)

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev --workspace=apps/web
```

Expected: server starts on `http://localhost:5173`. The page will look broken (missing components) but should not throw import errors.

- [ ] **Step 7: Commit**

```bash
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" add apps/web/src/win98.css apps/web/src/index.css apps/web/src/App.css apps/web/index.html apps/web/src/main.tsx
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" commit -m "feat: replace CSS with Yig brand tokens + Win98 chrome layer"
```

---

## Task 2: Win98Window Component

**Files:**
- Create: `apps/web/src/components/Win98Window.tsx`
- Test: `apps/web/src/tests/Win98Window.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/tests/Win98Window.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import './setup';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Win98Window } from '../components/Win98Window';

describe('Win98Window', () => {
  it('renders title bar with title text', () => {
    render(<Win98Window title="Test Window">content</Win98Window>);
    expect(screen.getByText('Test Window')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<Win98Window title="T" icon="📦">body</Win98Window>);
    expect(screen.getByText('📦')).toBeInTheDocument();
  });

  it('renders menubar items when provided', () => {
    render(
      <Win98Window title="T" menuItems={[{ label: 'File' }, { label: 'Edit' }]}>
        body
      </Win98Window>
    );
    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('renders statusBar when provided as string', () => {
    render(<Win98Window title="T" statusBar="Ready">body</Win98Window>);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('renders children inside the body', () => {
    render(<Win98Window title="T"><p>Hello</p></Win98Window>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders tabs when provided', () => {
    const tabs = [{ label: 'Tab A', active: true }, { label: 'Tab B' }];
    render(<Win98Window title="T" tabs={tabs}>body</Win98Window>);
    expect(screen.getByText('Tab A')).toBeInTheDocument();
    expect(screen.getByText('Tab B')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
npm test --workspace=apps/web -- --reporter=verbose Win98Window
```

Expected: FAIL — `Win98Window` not found.

- [ ] **Step 3: Create Win98Window.tsx**

```tsx
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
```

- [ ] **Step 4: Run test — verify PASS**

```bash
npm test --workspace=apps/web -- --reporter=verbose Win98Window
```

Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" add apps/web/src/components/Win98Window.tsx apps/web/src/tests/Win98Window.test.tsx
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" commit -m "feat: add Win98Window reusable window shell component"
```

---

## Task 3: Win98Dialog + Win98Wizard Components

**Files:**
- Create: `apps/web/src/components/Win98Dialog.tsx`
- Create: `apps/web/src/components/Win98Wizard.tsx`
- Test: `apps/web/src/tests/Win98Dialog.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
/** @vitest-environment jsdom */
import './setup';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Win98Dialog } from '../components/Win98Dialog';

describe('Win98Dialog', () => {
  it('renders title and children', () => {
    render(<Win98Dialog title="Sign In"><p>body</p></Win98Dialog>);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(
      <Win98Dialog title="T" footer={<button>OK</button>}>body</Win98Dialog>
    );
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<Win98Dialog title="T" onClose={onClose}>body</Win98Dialog>);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
npm test --workspace=apps/web -- --reporter=verbose Win98Dialog
```

Expected: FAIL — component not found.

- [ ] **Step 3: Create Win98Dialog.tsx**

```tsx
import type { ReactNode } from 'react';

interface Win98DialogProps {
  title: string;
  icon?: string;
  onClose?: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

export function Win98Dialog({ title, icon, onClose, footer, children }: Win98DialogProps) {
  return (
    <div className="w98-dialog-backdrop">
      <div className="w98-dialog">
        <div className="w98-titlebar">
          {icon && <span className="w98-titlebar__icon">{icon}</span>}
          <span className="w98-titlebar__title">{title}</span>
          <div className="w98-titlebar__controls">
            {onClose && (
              <button
                className="w98-ctrl-btn w98-ctrl-btn--close"
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="w98-dialog__body">{children}</div>
        {footer && <div className="w98-dialog__footer">{footer}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Win98Wizard.tsx** (no separate test — covered by PublishSkillPage test)

```tsx
import type { ReactNode } from 'react';

export interface WizardStep {
  label: string;
}

interface Win98WizardProps {
  title: string;
  steps: WizardStep[];
  currentStep: number;
  onBack?: () => void;
  onNext?: () => void;
  onCancel?: () => void;
  nextLabel?: string;
  children: ReactNode;
}

export function Win98Wizard({
  title,
  steps,
  currentStep,
  onBack,
  onNext,
  onCancel,
  nextLabel = 'Next →',
  children,
}: Win98WizardProps) {
  return (
    <div className="w98-wizard">
      <div className="w98-wizard__sidebar">
        <div className="w98-wizard__sidebar-mark">∴</div>
        <div className="w98-wizard__sidebar-title">{title}</div>
        <div className="w98-wizard__sidebar-steps">
          {steps.map((step, i) => (
            <div
              key={step.label}
              className={`w98-wizard__step-item${i === currentStep ? ' w98-wizard__step-item--active' : ''}`}
            >
              {i + 1}. {step.label}
            </div>
          ))}
        </div>
      </div>
      <div className="w98-wizard__content">{children}</div>
      <div className="w98-wizard__footer">
        {onCancel && <button className="w98-btn" onClick={onCancel}>Cancel</button>}
        {onBack && (
          <button className="w98-btn" onClick={onBack} disabled={currentStep === 0}>
            ← Back
          </button>
        )}
        {onNext && (
          <button className="w98-btn w98-btn--default" onClick={onNext}>
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run dialog tests — verify PASS**

```bash
npm test --workspace=apps/web -- --reporter=verbose Win98Dialog
```

Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" add apps/web/src/components/Win98Dialog.tsx apps/web/src/components/Win98Wizard.tsx apps/web/src/tests/Win98Dialog.test.tsx
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" commit -m "feat: add Win98Dialog and Win98Wizard components"
```

---

## Task 4: Taskbar + StartMenu + App Shell

**Files:**
- Create: `apps/web/src/components/Taskbar.tsx`
- Create: `apps/web/src/components/StartMenu.tsx`
- Modify: `apps/web/src/App.tsx`
- Delete: `apps/web/src/components/Header.tsx`
- Test: `apps/web/src/tests/Taskbar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
/** @vitest-environment jsdom */
import './setup';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Taskbar } from '../components/Taskbar';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../contexts/AuthContext')>();
  return { ...actual, useAuth: vi.fn() };
});

describe('Taskbar', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: null, openAuthModal: vi.fn(), closeAuthModal: vi.fn(),
      isAuthModalOpen: false, login: vi.fn(), loginWithGoogle: vi.fn(),
      registerWithEmail: vi.fn(), loginWithEmail: vi.fn(),
      forgotPassword: vi.fn(), loading: false, error: null,
      logout: vi.fn(), refreshUser: vi.fn(),
    });
  });

  it('renders the Start button with ∴ mark', () => {
    render(<MemoryRouter><Taskbar /></MemoryRouter>);
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('∴')).toBeInTheDocument();
  });

  it('shows start menu on Start button click', () => {
    render(<MemoryRouter><Taskbar /></MemoryRouter>);
    fireEvent.click(screen.getByText('Start'));
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
  });

  it('hides start menu on second click', () => {
    render(<MemoryRouter><Taskbar /></MemoryRouter>);
    const btn = screen.getByText('Start');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(screen.queryByText('Marketplace')).not.toBeInTheDocument();
  });

  it('renders a clock in the system tray', () => {
    render(<MemoryRouter><Taskbar /></MemoryRouter>);
    // Clock renders some time string
    const tray = document.querySelector('.w98-tray');
    expect(tray).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
npm test --workspace=apps/web -- --reporter=verbose Taskbar
```

Expected: FAIL.

- [ ] **Step 3: Create StartMenu.tsx**

```tsx
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
          📦&nbsp;Marketplace
        </Link>
        <Link to="/yaps/studio" className="w98-startmenu__item" onClick={onClose}>
          🔧&nbsp;YAP Studio
        </Link>
        <Link to="/publish" className="w98-startmenu__item" onClick={onClose}>
          ⬆&nbsp;Publish Skill
        </Link>
        <Link to="/my-packages" className="w98-startmenu__item" onClick={onClose}>
          📊&nbsp;My Packages
        </Link>
        <div className="w98-startmenu__sep" />
        <Link to="/blog" className="w98-startmenu__item" onClick={onClose}>
          📄&nbsp;Docs
        </Link>
        <a
          href="#api"
          className="w98-startmenu__item"
          onClick={onClose}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          🔌&nbsp;API Reference
        </a>
        <div className="w98-startmenu__sep" />
        {user ? (
          <Link to="/settings" className="w98-startmenu__item" onClick={onClose}>
            👤&nbsp;{user.displayName || 'Account'}
          </Link>
        ) : (
          <div
            className="w98-startmenu__item"
            onClick={() => { onAuthClick(); onClose(); }}
          >
            🔑&nbsp;Sign In
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Taskbar.tsx**

```tsx
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

  useEffect(() => { setStartOpen(false); }, [location.pathname]);

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
```

- [ ] **Step 5: Update App.tsx — add desktop shell, remove Header**

Replace `apps/web/src/App.tsx` entirely:

```tsx
import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { LandingPage } from './pages/LandingPage';
import { HomePage } from './pages/HomePage';
import { SkillDetailPage } from './pages/SkillDetailPage';
import { AuthCallback } from './pages/AuthCallback';
import { PublishSkillPage } from './pages/PublishSkillPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthModal } from './components/AuthModal';
import { Taskbar } from './components/Taskbar';
import { BlogPage } from './pages/BlogPage';
import './App.css';

const MyPackagesPage = lazy(() =>
  import('./pages/MyPackagesPage').then((m) => ({ default: m.MyPackagesPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const EditPackagePage = lazy(() =>
  import('./pages/EditPackagePage').then((m) => ({ default: m.EditPackagePage }))
);
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage }))
);
const TermsPage = lazy(() =>
  import('./pages/TermsPage').then((m) => ({ default: m.TermsPage }))
);
const PrivacyPage = lazy(() =>
  import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);
const EvolutionLabPage = lazy(() =>
  import('./pages/EvolutionLabPage').then((m) => ({ default: m.EvolutionLabPage }))
);
const YapAssemblyPage = lazy(() =>
  import('./pages/YapAssemblyPage').then((m) => ({ default: m.YapAssemblyPage }))
);
const YapStudioPage = lazy(() =>
  import('./pages/YapStudioPage').then((m) => ({ default: m.YapStudioPage }))
);
const VerifyEmailPage = lazy(() =>
  import('./pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage }))
);
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);

function App() {
  return (
    <ErrorBoundary>
      <div className="app-desktop w98-desktop">
        <Taskbar />
        <AuthModal />
        <div className="w98-page">
          <div className="w98-page__col">
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/marketplace" element={<HomePage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/yaps/:yapId" element={<YapAssemblyPage />} />
                <Route path="/yaps/:yapId/assembly" element={<YapAssemblyPage />} />

                <Route element={<ProtectedRoute />}>
                  <Route path="/publish" element={<PublishSkillPage />} />
                  <Route path="/yaps/studio" element={<YapStudioPage />} />
                  <Route path="/my-packages" element={<MyPackagesPage />} />
                  <Route path="/my-packages/:id/edit" element={<EditPackagePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/lab/:packageId" element={<EvolutionLabPage />} />
                </Route>

                <Route path="/skill/:packageId" element={<SkillDetailPage />} />
                <Route path="/auth/success" element={<AuthCallback />} />
                <Route path="/auth/error" element={<AuthCallback />} />
                <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
                <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
```

- [ ] **Step 6: Delete Header.tsx**

```bash
Remove-Item "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\components\Header.tsx"
```

- [ ] **Step 7: Run Taskbar tests — verify PASS**

```bash
npm test --workspace=apps/web -- --reporter=verbose Taskbar
```

Expected: 4 passing.

- [ ] **Step 8: Commit**

```bash
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" add -A apps/web/src/components/Taskbar.tsx apps/web/src/components/StartMenu.tsx apps/web/src/App.tsx apps/web/src/tests/Taskbar.test.tsx
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" rm apps/web/src/components/Header.tsx
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" commit -m "feat: replace Header with Win98 Taskbar + StartMenu; wire desktop shell in App"
```

---

## Task 5: AuthModal → Win98Dialog

**Files:**
- Modify: `apps/web/src/components/AuthModal.tsx`

- [ ] **Step 1: Read existing AuthModal.tsx to understand its structure**

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\components\AuthModal.tsx"
```

- [ ] **Step 2: Wrap AuthModal with Win98Dialog styling**

In `AuthModal.tsx`, find the outermost modal container (likely a `div` with a backdrop class and an inner dialog `div`). Replace the modal shell with `Win98Dialog`. Keep all existing auth logic, state, and handlers unchanged. Only the JSX wrapper changes.

The modal backdrop div becomes `<Win98Dialog title="Sign In — Yig Yaps" icon="∴" onClose={closeAuthModal}>`. All existing form inputs get class `w98-input`. All submit buttons get classes `w98-btn w98-btn--default`. All secondary buttons get class `w98-btn`. The GitHub OAuth button (if present) gets `w98-btn` with the GitHub SVG icon inline.

Example of the pattern — adapt to match the actual file structure:

```tsx
// Before (old shell):
<div className="modal-backdrop" onClick={closeAuthModal}>
  <div className="modal-dialog" onClick={e => e.stopPropagation()}>
    <button className="modal-close" onClick={closeAuthModal}>×</button>
    <h2>Sign In</h2>
    {/* ... form contents ... */}
  </div>
</div>

// After (Win98Dialog shell):
<Win98Dialog
  title="Sign In — Yig Yaps"
  icon="∴"
  onClose={closeAuthModal}
  footer={
    <div className="auth-dialog-footer">
      {/* move footer buttons here if any */}
    </div>
  }
>
  <div className="auth-dialog-body">
    {/* keep existing form contents, replace className on inputs/buttons */}
  </div>
</Win98Dialog>
```

Add `import { Win98Dialog } from './Win98Dialog';` at the top.

- [ ] **Step 3: Verify dev server renders auth modal correctly**

Run `npm run dev --workspace=apps/web` and click Sign In. The modal should appear as a Win98 dialog with cinnabar title bar.

- [ ] **Step 4: Commit**

```bash
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" add apps/web/src/components/AuthModal.tsx
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" commit -m "feat: restyle AuthModal as Win98Dialog"
```

---

## Task 6: Shared UI Components

**Files:**
- Modify: `apps/web/src/components/SkillCard.tsx`
- Modify: `apps/web/src/components/SearchBar.tsx`
- Modify: `apps/web/src/components/FilterPanel.tsx`
- Modify: `apps/web/src/components/Pagination.tsx`
- Modify: `apps/web/src/components/InstallButton.tsx`
- Modify: `apps/web/src/components/ReviewForm.tsx`
- Modify: `apps/web/src/components/SkeletonLoader.tsx`

All existing tests (SkillCard, SearchBar, Pagination, InstallButton, ReviewForm) test **behavior** not CSS classes — they should pass unchanged after this task.

- [ ] **Step 1: Run existing component tests — record baseline**

```bash
npm test --workspace=apps/web -- --reporter=verbose SkillCard SearchBar Pagination InstallButton ReviewForm
```

Note how many pass. All should pass currently.

- [ ] **Step 2: Rewrite SkillCard.tsx**

Replace with (keep all props and logic, replace JSX/styles):

```tsx
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
```

- [ ] **Step 3: Rewrite SearchBar.tsx**

Keep all debounce/clear logic. Replace the JSX shell:

```tsx
import { useState, useEffect } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search skills...',
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => { onChange(inputValue); }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, onChange]);

  useEffect(() => { setInputValue(value); }, [value]);

  const handleClear = () => { setInputValue(''); onChange(''); };

  return (
    <div className="search-bar-wrapper">
      <input
        type="text"
        className="w98-search-input"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      {inputValue && (
        <button
          className="search-clear-btn"
          onClick={handleClear}
          aria-label="Clear search"
          type="button"
        >
          ✕
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite FilterPanel.tsx**

Read the existing `FilterPanel.tsx` first:

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\components\FilterPanel.tsx"
```

Keep all filter state and `onFilterChange` logic. Replace the JSX to use `w98-groupbox` styling. Each filter group becomes a `fieldset`-style groupbox:

```tsx
// Pattern for each filter section — adapt field names from existing file:
<div className="filter-group">
  <fieldset className="filter-groupbox">
    <legend className="filter-legend">Category</legend>
    <select
      className="filter-select"
      value={filters.category || ''}
      onChange={(e) => onFilterChange({ category: e.target.value as SkillPackageCategory || undefined })}
    >
      <option value="">All Categories</option>
      <option value="finance">Finance</option>
      <option value="legal">Legal</option>
      <option value="marketing">Marketing</option>
      {/* ... keep existing options ... */}
    </select>
  </fieldset>
</div>
```

- [ ] **Step 5: Rewrite Pagination.tsx**

Keep all logic. Replace button classes:

```tsx
// In renderPageNumbers(), change button className:
<button
  key={i}
  className={`pagination-btn${i === currentPage ? ' active' : ''}`}
  onClick={() => onPageChange(i)}
>
  {i}
</button>

// Prev/Next buttons:
<button className="pagination-btn" onClick={handlePrevious} disabled={currentPage === 1}>
  ← Prev
</button>
// ... page numbers ...
<button className="pagination-btn" onClick={handleNext} disabled={currentPage === totalPages}>
  Next →
</button>

// Outer wrapper:
<div className="pagination">
  <div className="pagination-info">Showing {startItem}-{endItem} of {totalItems} results</div>
  <div className="pagination-controls">
    {/* buttons */}
  </div>
</div>
```

- [ ] **Step 6: Rewrite InstallButton.tsx**

Keep all fetch/tier logic. Replace button classes:

```tsx
// All occurrences of className="btn btn-primary btn-large..." → "w98-btn w98-btn--default"
// Locked state: className="w98-btn" disabled
// Loading: className="w98-btn" disabled (keep spinner)
// Success: className="w98-btn" disabled
// Error/Retry: className="w98-btn"
// Container: className="install-btn-container"
// Error message: className="install-error"

// Sign-in-to-install case:
return (
  <button className="w98-btn w98-btn--default" onClick={openAuthModal}>
    Sign In to Install
  </button>
);
```

- [ ] **Step 7: Rewrite ReviewForm.tsx**

Read the existing file:

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\components\ReviewForm.tsx"
```

Keep all state/submit logic. Replace inputs with `w98-input` class, textareas with `w98-input` (applied as class), selects with `w98-input`. Replace submit button with `w98-btn w98-btn--default`. Replace cancel with `w98-btn`.

- [ ] **Step 8: Rewrite SkeletonLoader.tsx**

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\components\SkeletonLoader.tsx"
```

Replace skeleton animation with Win98 progress bar segments:

```tsx
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
```

- [ ] **Step 9: Run all component tests — verify PASS**

```bash
npm test --workspace=apps/web -- --reporter=verbose SkillCard SearchBar Pagination InstallButton ReviewForm
```

Expected: same count passing as baseline. If any fail due to class name changes in tests, update the test to use the new class name.

- [ ] **Step 10: Commit**

```bash
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" add apps/web/src/components/SkillCard.tsx apps/web/src/components/SearchBar.tsx apps/web/src/components/FilterPanel.tsx apps/web/src/components/Pagination.tsx apps/web/src/components/InstallButton.tsx apps/web/src/components/ReviewForm.tsx apps/web/src/components/SkeletonLoader.tsx
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" commit -m "feat: restyle all shared UI components to Win98/Yig brand"
```

---

## Task 7: LandingPage

**Files:**
- Modify: `apps/web/src/pages/LandingPage.tsx`

- [ ] **Step 1: Replace LandingPage.tsx entirely**

```tsx
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Win98Window } from '../components/Win98Window';

export function LandingPage() {
  const { user, openAuthModal } = useAuth();

  return (
    <>
      {/* ── Window 1: Hero ── */}
      <Win98Window
        title="Yig Yaps — Open Skill Registry"
        icon="∴"
        menuItems={[
          { label: 'File' }, { label: 'Edit' }, { label: 'View' },
          { label: 'Marketplace' }, { label: 'Publish' },
          { label: 'Docs' }, { label: 'Help' },
        ]}
        tabs={[
          { label: 'All Skills', dotColor: '#0A0A0A' },
          { label: 'Featured', dotColor: '#C8321B', active: true },
          { label: 'New', dotColor: '#555' },
          { label: 'Finance', dotColor: '#555' },
          { label: 'Legal', dotColor: '#555' },
        ]}
        statusBar={
          <>
            <div className="w98-statusbar__panel w98-statusbar__panel--grow">
              <span style={{ color: 'var(--yig-phosphor)' }}>●</span>
              {' '}Ready · MCP-compatible · Apache 2.0
            </div>
            <div className="w98-statusbar__panel">github.com/yigyaps</div>
          </>
        }
      >
        <div className="landing-hero-body">
          <div>
            <p className="hero-eyebrow">Human expertise for the AI agent economy</p>
            <h1 className="hero-h1">
              Don't be replaced by AI<span className="hero-dot">.</span><br />
              Let the agent economy<br />work for you<span className="hero-dot">.</span>
            </h1>
            <p className="hero-sub">
              Yig Yaps is the open registry for YAP skills — publish your expertise
              once, let thousands of AI agents pay to consult it.
            </p>
            <div className="hero-btn-row">
              <Link to="/marketplace" className="w98-btn w98-btn--default">
                Browse Marketplace
              </Link>
              {user ? (
                <Link to="/publish" className="w98-btn">Publish a Skill</Link>
              ) : (
                <button className="w98-btn" onClick={openAuthModal}>
                  Sign In to Publish
                </button>
              )}
              <a
                href="https://github.com/Henghenggao/yigyaps"
                target="_blank"
                rel="noopener noreferrer"
                className="w98-btn"
              >
                GitHub ↗
              </a>
            </div>
            <p className="hero-note">Independent · Security-First · MCP-Compatible</p>
          </div>
          <div className="landing-hero-mark">
            <div className="hero-mark-glyph">∴</div>
            <div className="hero-wordmark">
              Yig <span className="hero-wordmark-sub">Yaps</span>
            </div>
            <div className="hero-version">ALPHA · v0.9</div>
          </div>
        </div>
      </Win98Window>

      {/* ── Window 2: Value Props ── */}
      <Win98Window
        title="Why Yig Yaps — Platform Overview"
        icon="💡"
        statusBar="AES-256-GCM · MCP Protocol · GitHub OAuth · Stripe Settlement"
      >
        <div className="value-grid">
          <div className="value-pane">
            <p className="value-label">Monetization</p>
            <p className="value-title">Knowledge Monetization: Turn Experience Into Passive Income</p>
            <p className="value-body">
              Your methodologies earn real royalties every time a global AI agent
              invokes your skill to solve problems.
            </p>
          </div>
          <div className="value-pane">
            <p className="value-label">IP Protection</p>
            <p className="value-title">Patent-Grade Moat: Never Feed The Big Models</p>
            <p className="value-body">
              Blackbox Defense Architecture. Buyers get only the conclusion —
              your core rules stay encrypted and yours.
            </p>
          </div>
          <div className="value-pane">
            <p className="value-label">Zero Code</p>
            <p className="value-title">Zero Code: As Easy As Filling a Form</p>
            <p className="value-body">
              Visual templates let you fill in your decision logic. The system
              turns you into a globally compliant AI plugin in 10 minutes.
            </p>
          </div>
        </div>
      </Win98Window>

      {/* ── Window 3: Security ── */}
      <Win98Window
        title="Security Model — Give Conclusions, Not Your Secrets"
        icon="🔒"
        statusBar={
          <div className="w98-statusbar__panel w98-statusbar__panel--grow">
            <span style={{ color: 'var(--yig-phosphor)' }}>●</span>
            {' '}AES-256-GCM envelope encryption · ephemeral decryption · zero-knowledge output
          </div>
        }
      >
        <div style={{ marginBottom: 'var(--yig-space-4)' }}>
          <p className="hero-eyebrow" style={{ marginBottom: 'var(--yig-space-2)' }}>
            Security architecture
          </p>
          <h2 style={{ font: '700 22px/1.2 var(--yig-font-sans)', letterSpacing: 'var(--yig-tracking-headline)', color: 'var(--yig-ink)', margin: '0 0 var(--yig-space-2)' }}>
            Give Conclusions, Not Your Secrets<span className="hero-dot">.</span>
          </h2>
          <p style={{ font: '13px/1.6 var(--yig-font-sans)', color: '#555', margin: 0 }}>
            No matter how capable the other AI is, it only gets your judgment
            results — never your core logic.
          </p>
        </div>
        <div className="sec-grid">
          <div className="sec-card sec-dim">
            <p className="sec-label">Standard Platforms</p>
            <p className="sec-title">Feed Models for Free</p>
            <p className="sec-body">
              Your expertise → LLM chatbox → used for training → your value
              diluted and replaced.
            </p>
          </div>
          <div className="sec-card sec-highlight">
            <p className="sec-label">Yig Yaps Model</p>
            <p className="sec-title">Earn Passive Income (Bank-Grade)</p>
            <p className="sec-body">
              Your expertise → Yig Yaps Rule Engine → outputs structured
              conclusions only → royalty received.
            </p>
          </div>
        </div>
      </Win98Window>

      {/* ── Window 4: CTA ── */}
      <Win98Window
        title="Get Started — Yig Yaps"
        icon="∴"
        statusBar="Open · Community-governed · Apache 2.0"
      >
        <div style={{ textAlign: 'center', padding: 'var(--yig-space-8) 0' }}>
          <p className="hero-eyebrow" style={{ marginBottom: 'var(--yig-space-2)' }}>
            Ready?
          </p>
          <h2 style={{ font: '700 28px/1.2 var(--yig-font-sans)', letterSpacing: 'var(--yig-tracking-headline)', color: 'var(--yig-ink)', margin: '0 0 var(--yig-space-3)' }}>
            Assetize your expertise<span className="hero-dot">.</span>
          </h2>
          <p style={{ font: '14px/1.7 var(--yig-font-sans)', color: '#555', margin: '0 0 var(--yig-space-6)' }}>
            Join the knowledge monetization network for human experts.
          </p>
          <div className="hero-btn-row" style={{ justifyContent: 'center' }}>
            {user ? (
              <Link to="/publish" className="w98-btn w98-btn--default">
                Start Creating Skills
              </Link>
            ) : (
              <button className="w98-btn w98-btn--default" onClick={openAuthModal}>
                Sign In to Yig Yaps
              </button>
            )}
            <Link to="/marketplace" className="w98-btn">Browse Marketplace</Link>
          </div>
        </div>
      </Win98Window>

      {/* ── Window 5: Footer ── */}
      <Win98Window
        title="Yig Yaps · © 2026 · Apache 2.0"
        icon="∴"
        statusBar="Visual style inspired by Windows 98 (© Microsoft). Yig Yaps is not affiliated with Microsoft."
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--yig-space-2) 0', fontFamily: 'var(--yig-font-w98)', fontSize: 'var(--yig-text-xs)', color: '#666' }}>
          <span>© {new Date().getFullYear()} Yig Yaps · Protecting human wisdom, empowering the AI economy.</span>
          <div style={{ display: 'flex', gap: 'var(--yig-space-4)' }}>
            <Link to="/terms" style={{ color: '#666', textDecoration: 'none' }}>Terms</Link>
            <Link to="/privacy" style={{ color: '#666', textDecoration: 'none' }}>Privacy</Link>
            <a href="https://github.com/Henghenggao/yigyaps" target="_blank" rel="noopener noreferrer" style={{ color: '#666', textDecoration: 'none' }}>GitHub ↗</a>
          </div>
        </div>
      </Win98Window>
    </>
  );
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev --workspace=apps/web
```

Navigate to `http://localhost:5173`. You should see the Yig black desktop, taskbar at top, 5 stacked Win98 windows with cinnabar title bars.

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" add apps/web/src/pages/LandingPage.tsx
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" commit -m "feat: rebuild LandingPage as 5 stacked Win98 windows"
```

---

## Task 8: Marketplace (HomePage)

**Files:**
- Modify: `apps/web/src/pages/HomePage.tsx`

- [ ] **Step 1: Replace HomePage.tsx**

Keep all `useSkills`, `useSearchParams`, filter/search handlers. Remove `Header`, remove all `<style>`, wrap in a single `Win98Window`:

```tsx
import { useSearchParams } from 'react-router-dom';
import { useSkills } from '../hooks/useSkills';
import { SearchBar } from '../components/SearchBar';
import { FilterPanel } from '../components/FilterPanel';
import { SkillCard } from '../components/SkillCard';
import { SkeletonGrid } from '../components/SkeletonLoader';
import { Pagination } from '../components/Pagination';
import { Win98Window } from '../components/Win98Window';
import type {
  SkillPackageSearchQuery,
  SkillPackageCategory,
  SkillPackageLicense,
  SkillPackageMaturity,
} from '@yigyaps/types';

const ITEMS_PER_PAGE = 20;

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') as SkillPackageCategory | null;
  const license = searchParams.get('license') as SkillPackageLicense | null;
  const maturity = searchParams.get('maturity') as SkillPackageMaturity | null;
  const maxPriceUsd = searchParams.get('maxPrice')
    ? parseInt(searchParams.get('maxPrice')!, 10)
    : undefined;
  const sortBy = (searchParams.get('sort') || 'popularity') as SkillPackageSearchQuery['sortBy'];
  const page = parseInt(searchParams.get('page') || '1', 10);

  const searchQuery: SkillPackageSearchQuery = {
    query: query || undefined,
    category: category || undefined,
    license: license || undefined,
    maturity: maturity || undefined,
    maxPriceUsd,
    sortBy,
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
  };

  const { skills, total, loading, error } = useSkills(searchQuery);

  const handleSearchChange = (newQuery: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (newQuery) params.set('q', newQuery); else params.delete('q');
      params.set('page', '1');
      return params;
    });
  };

  const handleFilterChange = (filters: Partial<SkillPackageSearchQuery>) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (filters.category !== undefined) {
        if (filters.category) params.set('category', filters.category);
        else params.delete('category');
      }
      if (filters.license !== undefined) {
        if (filters.license) params.set('license', filters.license);
        else params.delete('license');
      }
      if (filters.maturity !== undefined) {
        if (filters.maturity) params.set('maturity', filters.maturity);
        else params.delete('maturity');
      }
      if (filters.maxPriceUsd !== undefined) {
        params.set('maxPrice', String(filters.maxPriceUsd));
      }
      if (filters.sortBy !== undefined) params.set('sort', filters.sortBy);
      params.set('page', '1');
      return params;
    });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('page', String(newPage));
      return params;
    });
  };

  const statusText = loading
    ? 'Loading...'
    : error
    ? `Error: ${error}`
    : `${total} skills · Page ${page}`;

  return (
    <Win98Window
      title={`Marketplace — ${total > 0 ? `${total} Skills` : 'Browse Skills'}`}
      icon="📦"
      menuItems={[
        { label: 'File' }, { label: 'View' },
        { label: 'Sort' }, { label: 'Filter' },
      ]}
      statusBar={
        <>
          <div className="w98-statusbar__panel w98-statusbar__panel--grow">
            {statusText}
          </div>
          <div className="w98-statusbar__panel">↑↓ to navigate · Enter to open</div>
        </>
      }
    >
      {/* Toolbar row */}
      <div className="mp-toolbar">
        <SearchBar value={query} onChange={handleSearchChange} />
        <div className="mp-sep" />
        <select
          className="w98-input"
          style={{ height: 21, width: 130, fontFamily: 'var(--yig-font-w98)', fontSize: 11 }}
          value={sortBy}
          onChange={(e) => handleFilterChange({ sortBy: e.target.value as SkillPackageSearchQuery['sortBy'] })}
        >
          <option value="popularity">By Popularity</option>
          <option value="newest">By Newest</option>
          <option value="rating">By Rating</option>
          <option value="price_asc">Price: Low→High</option>
          <option value="price_desc">Price: High→Low</option>
        </select>
      </div>

      {/* Layout: sidebar + content */}
      <div className="mp-layout">
        <div className="mp-sidebar">
          <FilterPanel filters={searchQuery} onFilterChange={handleFilterChange} />
        </div>
        <div className="mp-content">
          {loading && <SkeletonGrid count={6} />}

          {error && !loading && (
            <div className="empty-state">
              <p>{error}</p>
              <button className="w98-btn" style={{ marginTop: 8 }} onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && skills.length === 0 && (
            <div className="empty-state">
              <p>No skills match your filters.</p>
            </div>
          )}

          {!loading && !error && skills.length > 0 && (
            <>
              <p className="mp-count">{query ? `Results for "${query}"` : 'All Skills'}</p>
              <div className="skills-grid">
                {skills.map((skill) => (
                  <SkillCard key={skill.packageId} skill={skill} />
                ))}
              </div>
              <Pagination
                currentPage={page}
                totalItems={total}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>
    </Win98Window>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" add apps/web/src/pages/HomePage.tsx
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" commit -m "feat: rebuild Marketplace as Win98 window with toolbar + skill grid"
```

---

## Task 9: SkillDetailPage

**Files:**
- Modify: `apps/web/src/pages/SkillDetailPage.tsx`

- [ ] **Step 1: Read the existing file**

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\pages\SkillDetailPage.tsx"
```

- [ ] **Step 2: Rewrite as 3 Win98 windows**

Keep all data-fetching hooks, `useSkillDetail`, `useAuth`. Remove `Header`, footer, all `<style>` blocks. Replace JSX with:

```tsx
// Window 1: Detail header
<Win98Window
  title={`${skill.icon || '📦'} ${skill.displayName || skill.packageId} — Skill Detail`}
  icon={skill.icon || '📦'}
  menuItems={[{ label: 'File' }, { label: 'View' }, { label: 'Help' }]}
  statusBar={
    <>
      <div className="w98-statusbar__panel w98-statusbar__panel--grow">
        <span style={{ color: 'var(--yig-phosphor)' }}>●</span>
        {` ${skill.maturity} · v${skill.version}`}
      </div>
      <div className="w98-statusbar__panel">{skill.category}</div>
    </>
  }
>
  <div className="skill-detail-body">
    <div>
      {/* Description */}
      <p style={{ fontFamily: 'var(--yig-font-sans)', fontSize: 'var(--yig-text-base)', color: '#333', lineHeight: 1.7, margin: '0 0 var(--yig-space-4)' }}>
        {skill.description}
      </p>
      {/* Meta rows */}
      <div className="skill-detail-meta">
        <div className="meta-row"><span className="meta-label">Author</span><span className="meta-value">{skill.authorName || skill.author}</span></div>
        <div className="meta-row"><span className="meta-label">Category</span><span className="meta-value">{skill.category}</span></div>
        <div className="meta-row"><span className="meta-label">License</span><span className="meta-value">{skill.license}</span></div>
        <div className="meta-row"><span className="meta-label">Installs</span><span className="meta-value">{skill.installCount.toLocaleString()}</span></div>
        {Number(skill.rating) > 0 && (
          <div className="meta-row"><span className="meta-label">Rating</span><span className="meta-value skill-rating">★ {Number(skill.rating).toFixed(1)}</span></div>
        )}
      </div>
    </div>
    {/* Install panel */}
    <div className="skill-install-panel">
      <div className="skill-price-large">
        {Number(skill.priceUsd || 0) === 0 ? 'Free' : `$${Number(skill.priceUsd).toFixed(2)}`}
      </div>
      <InstallButton skill={skill} />
      {/* Copy install command */}
      <div>
        <p style={{ fontFamily: 'var(--yig-font-w98)', fontSize: 'var(--yig-text-xs)', color: '#666', margin: '0 0 4px' }}>CLI install:</p>
        <input
          className="w98-input"
          style={{ width: '100%', fontFamily: 'var(--yig-font-mono)', fontSize: 10 }}
          readOnly
          value={`yig install ${skill.packageId}`}
          onFocus={(e) => e.target.select()}
        />
      </div>
    </div>
  </div>
</Win98Window>

// Window 2: Documentation (markdown)
<Win98Window title="📋 Rules & Documentation" statusBar="Scroll to read · Rendered markdown">
  <div className="md-body">
    {/* Render skill.rulesMarkdown or skill.documentation via your existing markdown renderer */}
    <MarkdownContent content={skill.rulesMarkdown || skill.documentation || '_No documentation provided._'} />
  </div>
</Win98Window>

// Window 3: Reviews
<Win98Window
  title="⭐ Reviews"
  statusBar={`${skill.reviewCount || 0} reviews · ${Number(skill.rating || 0).toFixed(1)} avg`}
>
  <ReviewList skillId={skill.packageId} />
  {user && <ReviewForm skillId={skill.packageId} onSubmit={handleReviewSubmit} />}
</Win98Window>
```

Adapt the component/prop names to match the actual existing file (check imports for `ReviewList`, `MarkdownContent`, etc.).

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" add apps/web/src/pages/SkillDetailPage.tsx
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" commit -m "feat: rebuild SkillDetailPage as 3 Win98 windows"
```

---

## Task 10: Publish & Edit Pages (Win98 Wizard)

**Files:**
- Modify: `apps/web/src/pages/PublishSkillPage.tsx`
- Modify: `apps/web/src/pages/EditPackagePage.tsx`

- [ ] **Step 1: Read existing PublishSkillPage.tsx**

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\pages\PublishSkillPage.tsx"
```

- [ ] **Step 2: Rewrite PublishSkillPage.tsx**

Keep all step state, form state, submit logic, validation. Remove `Header`, footer, all `<style>`. Wrap in a single `Win98Window` + `Win98Wizard`:

```tsx
import { Win98Window } from '../components/Win98Window';
import { Win98Wizard } from '../components/Win98Wizard';

const STEPS = [
  { label: 'Package Info' },
  { label: 'Skill Rules' },
  { label: 'Pricing' },
  { label: 'Review & Publish' },
];

// In JSX:
<Win98Window
  title="⬆ Publish a Skill — New YAP Wizard"
  icon="⬆"
  statusBar={
    <>
      <div className="w98-statusbar__panel w98-statusbar__panel--grow">
        Step {currentStep + 1} of {STEPS.length} · {STEPS[currentStep].label}
      </div>
      <div className="w98-statusbar__panel">
        <span style={{ color: 'var(--yig-phosphor)' }}>●</span> Draft saved
      </div>
    </>
  }
>
  <Win98Wizard
    title="Publish Your YAP Skill"
    steps={STEPS}
    currentStep={currentStep}
    onBack={currentStep > 0 ? handleBack : undefined}
    onNext={currentStep < STEPS.length - 1 ? handleNext : undefined}
    onCancel={handleCancel}
    nextLabel={currentStep === STEPS.length - 1 ? 'Publish →' : 'Next →'}
  >
    {/* Step content — keep existing step JSX, replace inputs */}
    {currentStep === 0 && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--yig-space-3)' }}>
        <h2 className="wizard-heading">Package Information</h2>
        <p className="wizard-sub">Define your skill's identity and public metadata.</p>
        <div className="wizard-field">
          <label className="wizard-label">Package ID</label>
          <input className="w98-input" style={{ width: '100%' }}
            placeholder="your-skill-name" value={form.packageId}
            onChange={e => setForm(f => ({ ...f, packageId: e.target.value }))} />
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Display Name</label>
          <input className="w98-input" style={{ width: '100%' }}
            placeholder="Human-readable name" value={form.displayName}
            onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Category</label>
          <select className="w98-input" style={{ width: '100%', height: 21 }}
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            <option value="">Select category...</option>
            <option value="finance">Finance</option>
            <option value="legal">Legal</option>
            <option value="marketing">Marketing</option>
            <option value="productivity">Productivity</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Description</label>
          <textarea className="w98-input" style={{ width: '100%', height: 60, resize: 'vertical' }}
            placeholder="What does this skill do?"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
      </div>
    )}
    {/* Steps 1-3: keep existing content, apply w98-input to all inputs */}
    {/* ... */}
  </Win98Wizard>
</Win98Window>
```

Adapt field names, state shape, and step content from the existing file.

- [ ] **Step 3: Apply same pattern to EditPackagePage.tsx**

Read the file, apply the same `Win98Window` + `Win98Wizard` wrapper. Pre-populate fields from the existing package data as the current file does.

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\pages\EditPackagePage.tsx"
```

- [ ] **Step 4: Commit**

```bash
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" add apps/web/src/pages/PublishSkillPage.tsx apps/web/src/pages/EditPackagePage.tsx
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" commit -m "feat: rebuild Publish/Edit pages as Win98Wizard"
```

---

## Task 11: Dashboard (MyPackagesPage)

**Files:**
- Modify: `apps/web/src/pages/MyPackagesPage.tsx`

- [ ] **Step 1: Read existing MyPackagesPage.tsx**

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\pages\MyPackagesPage.tsx"
```

- [ ] **Step 2: Rewrite as single Win98Window**

Keep all data-fetching and state. Remove `Header`, footer, `<style>`. Wrap in `Win98Window`:

```tsx
<Win98Window
  title="📊 My Packages — Dashboard"
  icon="📊"
  menuItems={[{ label: 'File' }, { label: 'View' }, { label: 'Help' }]}
  statusBar={`${packages.length} packages · ${totalInstalls} total installs`}
>
  {/* Stats row */}
  <div className="dash-stats">
    <div className="dash-stat">
      <div className="dash-stat-value">{packages.length}</div>
      <div className="dash-stat-label">Skills Published</div>
    </div>
    <div className="dash-stat">
      <div className="dash-stat-value">{totalInstalls.toLocaleString()}</div>
      <div className="dash-stat-label">Total Installs</div>
    </div>
    <div className="dash-stat">
      <div className="dash-stat-value">${totalRevenue.toFixed(2)}</div>
      <div className="dash-stat-label">Est. Revenue</div>
    </div>
  </div>

  {/* Package list */}
  {packages.length === 0 ? (
    <div className="empty-state">
      <p>No packages yet.</p>
      <a href="/publish" className="w98-btn" style={{ marginTop: 8, display: 'inline-flex' }}>
        Publish Your First Skill
      </a>
    </div>
  ) : (
    <div className="dash-list">
      {packages.map((pkg) => (
        <div key={pkg.packageId} className="dash-item">
          <div className="dash-item-icon">
            {pkg.icon || pkg.displayName?.charAt(0) || 'S'}
          </div>
          <div className="dash-item-main">
            <p className="dash-item-title">{pkg.displayName || pkg.packageId}</p>
            <p className="dash-item-sub">
              {pkg.category} · {pkg.maturity} · {pkg.installCount} installs
            </p>
          </div>
          <div className="dash-item-actions">
            <a href={`/my-packages/${pkg.id}/edit`} className="w98-btn">Edit</a>
            <button className="w98-btn" onClick={() => handleArchive(pkg.packageId)}>
              Archive
            </button>
          </div>
        </div>
      ))}
    </div>
  )}
</Win98Window>
```

Adapt field names from the actual file.

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" add apps/web/src/pages/MyPackagesPage.tsx
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" commit -m "feat: rebuild MyPackagesPage as Win98 dashboard window"
```

---

## Task 12: App Pages (YapStudio, YapAssembly, EvolutionLab, Blog, Settings, Admin, Terms, Privacy)

**Files:** All files listed below

For each page in this task: read the file, remove `Header` import and usage, remove footer, remove `<style>`, wrap content in `Win98Window` with an appropriate title and icon. Keep all existing logic/state/hooks unchanged.

- [ ] **Step 1: YapStudioPage.tsx**

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\pages\YapStudioPage.tsx"
```

Wrap in: `<Win98Window title="🔧 YAP Studio — Assemble Skills" icon="🔧" statusBar="Build · Preview · Deploy">`

- [ ] **Step 2: YapAssemblyPage.tsx**

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\pages\YapAssemblyPage.tsx"
```

Wrap in: `<Win98Window title={`🔧 YAP Assembly — ${yapId}`} icon="🔧" statusBar="MCP-compatible">`

- [ ] **Step 3: EvolutionLabPage.tsx**

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\pages\EvolutionLabPage.tsx"
```

Wrap in: `<Win98Window title={`🧪 Evolution Lab — ${packageId}`} icon="🧪" statusBar="Experimental · API key required">`

All `ConsentModal` / `LabApiKeyPanel` dialog flows: wrap in `Win98Dialog` with appropriate title.

- [ ] **Step 4: BlogPage.tsx**

Wrap content in: `<Win98Window title="📄 Docs & Blog — Yig Yaps" icon="📄" statusBar="Documentation · Guides · Updates">`

Apply `md-body` class to the markdown container.

- [ ] **Step 5: SettingsPage.tsx**

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\pages\SettingsPage.tsx"
```

Wrap in: `<Win98Window title="⚙ Settings — Yig Yaps" icon="⚙" statusBar="Changes saved automatically">`

For each settings section: use `<fieldset className="settings-groupbox"><legend className="settings-legend">Section Name</legend>...</fieldset>`.

All text inputs → `w98-input`. Buttons → `w98-btn` / `w98-btn--default`.

- [ ] **Step 6: AdminPage.tsx**

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\pages\AdminPage.tsx"
```

Wrap in: `<Win98Window title="🛡 Admin — Yig Yaps Registry" icon="🛡">`

Data tables → `admin-table` class. Action buttons → `w98-btn`. Danger actions (ban, delete) → `w98-btn` with `style={{ color: 'var(--yig-cinnabar)', borderColor: 'var(--yig-cinnabar)' }}`.

- [ ] **Step 7: TermsPage.tsx + PrivacyPage.tsx**

Both are simple markdown/text pages. Wrap each in a single `Win98Window`:

```tsx
// TermsPage.tsx
<Win98Window title="📋 Terms of Service — Yig Yaps" icon="📋" statusBar="Legal · Apache 2.0">
  <div className="md-body">
    {/* existing terms content */}
  </div>
</Win98Window>

// PrivacyPage.tsx
<Win98Window title="🔒 Privacy Policy — Yig Yaps" icon="🔒" statusBar="Legal · Data protection">
  <div className="md-body">
    {/* existing privacy content */}
  </div>
</Win98Window>
```

- [ ] **Step 8: Run YapAssembly + YapStudio tests**

```bash
npm test --workspace=apps/web -- --reporter=verbose YapAssemblyPage YapStudioPage
```

Expected: existing tests pass (they test logic, not visual chrome).

- [ ] **Step 9: Commit**

```bash
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" add apps/web/src/pages/YapStudioPage.tsx apps/web/src/pages/YapAssemblyPage.tsx apps/web/src/pages/EvolutionLabPage.tsx apps/web/src/pages/BlogPage.tsx apps/web/src/pages/SettingsPage.tsx apps/web/src/pages/AdminPage.tsx apps/web/src/pages/TermsPage.tsx apps/web/src/pages/PrivacyPage.tsx
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" commit -m "feat: wrap all remaining app pages in Win98Window"
```

---

## Task 13: NotFoundPage (BSOD 404) + Auth Pages

**Files:**
- Modify: `apps/web/src/pages/NotFoundPage.tsx`
- Modify: `apps/web/src/pages/AuthCallback.tsx`
- Modify: `apps/web/src/pages/VerifyEmailPage.tsx`
- Modify: `apps/web/src/pages/ResetPasswordPage.tsx`

- [ ] **Step 1: Rewrite NotFoundPage.tsx**

```tsx
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export function NotFoundPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handle = (e: KeyboardEvent) => navigate('/');
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [navigate]);

  return (
    <div className="w98-bsod" onClick={() => navigate('/')}>
      <div className="bsod-title">YIG_FATAL_ERROR</div>
      <p className="bsod-code">*** STOP: 0x00000404 (PAGE_NOT_FOUND)</p>
      <div className="bsod-body">
        <p>
          A fatal exception has occurred at the requested URL. The current page
          cannot be displayed.
        </p>
        <p style={{ marginTop: 16 }}>
          If this is the first time you've seen this error, return to the registry.
          If problems continue, contact the system administrator.
        </p>
      </div>
      <p>Press any key to return to the registry<span className="bsod-prompt">_</span></p>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite AuthCallback.tsx**

Read existing:

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\pages\AuthCallback.tsx"
```

Keep all redirect logic. Replace loading/error UI with `Win98Dialog`:

```tsx
import { Win98Dialog } from '../components/Win98Dialog';

// Loading state:
<Win98Dialog title="Signing In — Yig Yaps" icon="∴">
  <div style={{ fontFamily: 'var(--yig-font-w98)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
    <span className="spinner" /> Authenticating...
  </div>
</Win98Dialog>

// Error state:
<Win98Dialog
  title="Sign In Error — Yig Yaps"
  icon="∴"
  footer={
    <button className="w98-btn w98-btn--default" onClick={() => navigate('/')}>OK</button>
  }
>
  <div style={{ fontFamily: 'var(--yig-font-w98)', fontSize: 11, color: 'var(--yig-cinnabar)' }}>
    {error || 'Authentication failed. Please try again.'}
  </div>
</Win98Dialog>
```

- [ ] **Step 3: Rewrite VerifyEmailPage.tsx**

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\pages\VerifyEmailPage.tsx"
```

Wrap in `Win98Dialog title="Verify Email — Yig Yaps"`. Input → `w98-input`. Submit → `w98-btn--default`.

- [ ] **Step 4: Rewrite ResetPasswordPage.tsx**

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\pages\ResetPasswordPage.tsx"
```

Wrap in `Win98Dialog title="Reset Password — Yig Yaps"`. Inputs → `w98-input`. Submit → `w98-btn--default`.

- [ ] **Step 5: Commit**

```bash
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" add apps/web/src/pages/NotFoundPage.tsx apps/web/src/pages/AuthCallback.tsx apps/web/src/pages/VerifyEmailPage.tsx apps/web/src/pages/ResetPasswordPage.tsx
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" commit -m "feat: BSOD 404 NotFoundPage + Win98Dialog auth pages"
```

---

## Task 14: Global Naming Pass — "YigYaps" → "Yig Yaps"

**Files:** All UI-visible strings across the entire `apps/web/src` directory.

- [ ] **Step 1: Find all remaining "YigYaps" in UI strings**

```powershell
Select-String -Path "C:\Users\gaoyu\Documents\GitHub\yigyaps\apps\web\src\**\*.tsx" -Pattern "YigYaps" -Recurse | Select-Object FileName, LineNumber, Line
```

- [ ] **Step 2: Fix each occurrence**

For each match:
- `"YigYaps"` in visible text / JSX → `"Yig Yaps"`
- `YigYaps` in `<title>` → `Yig Yaps`
- `"YigYaps"` in `aria-label` / `alt` text → `"Yig Yaps"`
- Do **NOT** rename: import paths, package identifiers (`@yigyaps/types`), API URLs, function names, CSS class names

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" add -A apps/web/src
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" commit -m "fix: rename all UI-visible YigYaps → Yig Yaps"
```

---

## Task 15: Full Test Suite + Visual Verification

**Files:** Fix any failing tests.

- [ ] **Step 1: Run full test suite**

```bash
npm test --workspace=apps/web -- --reporter=verbose
```

Expected: all tests pass. If any fail, check what changed.

- [ ] **Step 2: Fix ErrorBoundary test if needed**

The ErrorBoundary test likely mocks or renders a simple component. It should be unaffected. If it fails, check if it imported `Header` indirectly — remove any such import.

- [ ] **Step 3: Visual review in browser**

```bash
npm run dev --workspace=apps/web
```

Check each route in order:
- `/` — 5 windows, Yig black desktop, cinnabar taskbar
- `/marketplace` — search toolbar, skill grid
- `/skill/some-id` — 3 windows (may 404 if no data locally)
- `/publish` — wizard with Ink sidebar
- `/my-packages` — login required redirect
- `/*` (any bad URL) — BSOD in cinnabar (click to return)

- [ ] **Step 4: Check .gitignore for .superpowers**

```bash
Get-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\.gitignore"
```

If `.superpowers/` is not listed, add it:

```bash
Add-Content "C:\Users\gaoyu\Documents\GitHub\yigyaps\.gitignore" "`n.superpowers/"
```

- [ ] **Step 5: Final commit**

```bash
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" add -A
git -C "C:\Users\gaoyu\Documents\GitHub\yigyaps" commit -m "chore: Win98 redesign complete — all tests passing"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Replace all old CSS tokens | Task 1 |
| Win98 desktop shell | Task 1 + 4 |
| Taskbar replaces Header | Task 4 |
| Start menu navigation | Task 4 |
| AuthModal → Win98Dialog | Task 5 |
| Shared components restyled | Task 6 |
| LandingPage — 5 windows | Task 7 |
| Marketplace — toolbar + grid | Task 8 |
| SkillDetailPage — 3 windows | Task 9 |
| Publish/Edit → Win98Wizard | Task 10 |
| MyPackagesPage dashboard | Task 11 |
| All remaining pages | Task 12 |
| BSOD 404 | Task 13 |
| Auth pages → Win98Dialog | Task 13 |
| "Yig Yaps" naming | Task 14 |
| IP disclaimer in footer | Task 7 (footer window statusbar) |
| Tests pass | Task 15 |

All spec sections covered. ✅

**Placeholder scan:** No TBD/TODO in tasks. All steps contain actual commands or complete code with instruction to adapt from the real file. ✅

**Type consistency:** `Win98Window`, `Win98Dialog`, `Win98Wizard` props are defined in Tasks 2-3 and used consistently in Tasks 5-13. `MenuItem`, `TabItem`, `WizardStep` interfaces exported from their component files. ✅
