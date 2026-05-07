/** @vitest-environment jsdom */
import './setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
      user: null,
      openAuthModal: vi.fn(),
      closeAuthModal: vi.fn(),
      isAuthModalOpen: false,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      registerWithEmail: vi.fn(),
      loginWithEmail: vi.fn(),
      forgotPassword: vi.fn(),
      loading: false,
      error: null,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it('renders the Start button with Start text', () => {
    render(<MemoryRouter><Taskbar /></MemoryRouter>);
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('renders the ∴ mark in Start button', () => {
    render(<MemoryRouter><Taskbar /></MemoryRouter>);
    // The ∴ is inside the start button
    const startBtn = screen.getByText('Start').closest('button');
    expect(startBtn).toBeTruthy();
    expect(startBtn!.textContent).toContain('∴');
  });

  it('shows start menu on Start button click', () => {
    render(<MemoryRouter><Taskbar /></MemoryRouter>);
    fireEvent.click(screen.getByText('Start'));
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
  });

  it('hides start menu on second Start button click', () => {
    render(<MemoryRouter><Taskbar /></MemoryRouter>);
    const btn = screen.getByText('Start');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(screen.queryByText('Marketplace')).not.toBeInTheDocument();
  });

  it('renders the system tray .w98-tray element', () => {
    const { container } = render(<MemoryRouter><Taskbar /></MemoryRouter>);
    expect(container.querySelector('.w98-tray')).toBeTruthy();
  });
});
