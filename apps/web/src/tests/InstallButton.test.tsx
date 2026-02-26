import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InstallButton } from '../components/InstallButton';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../contexts/AuthContext';
import type { SkillPackage } from '@yigyaps/types';

// Mock the Auth Context
vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../contexts/AuthContext')>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

// Since the component uses YigYapsRegistryClient internally, which uses fetch,
// mocking global fetch is the most robust way to intercept the call.
const mockFetch = vi.fn();

describe('InstallButton', () => {
  const mockSkill = {
    id: 'test-skill-1',
    packageId: 'test-package',
    displayName: 'Test Skill',
    requiredTier: 0,
    priceUsd: 0,
  } as unknown as SkillPackage;

  const mockUser = {
    id: 'user-1',
    displayName: 'Test User',
    tier: 'free',
  } as unknown as User;

  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    // Default mock user
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      login: mockLogin,
      loading: false,
      error: null,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders sign in button when not logged in', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      login: mockLogin,
      loading: false,
      error: null,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<InstallButton skill={mockSkill} />);
    expect(screen.getByText(/Sign In to Install/i)).toBeInTheDocument();
  });

  it('renders install button for free skill when logged in', () => {
    render(<InstallButton skill={mockSkill} />);
    expect(screen.getByText(/Install Free/i)).toBeInTheDocument();
  });

  it('renders price label for paid skill', () => {
    const paidSkill = { ...mockSkill, priceUsd: 10 } as unknown as SkillPackage;
    render(<InstallButton skill={paidSkill} />);
    expect(screen.getByText(/Install - \$10/i)).toBeInTheDocument();
  });

  it('shows tier lock message when user tier is insufficient', () => {
    const epicSkill = { ...mockSkill, requiredTier: 2 } as unknown as SkillPackage; // Epic = 2
    vi.mocked(useAuth).mockReturnValue({
      user: { ...mockUser, tier: 'free' } as unknown as User,
      login: mockLogin,
      loading: false,
      error: null,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<InstallButton skill={epicSkill} />);
    expect(screen.getByText(/Requires Epic/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls install API when clicked and shows success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 'inst-1', status: 'success' }),
    });

    const onInstallSuccess = vi.fn();
    render(<InstallButton skill={mockSkill} onInstallSuccess={onInstallSuccess} />);

    const button = screen.getByText(/Install Free/i);
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/installations'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"packageId":"test-package"'),
        })
      );
      expect(onInstallSuccess).toHaveBeenCalled();
      expect(screen.getByText(/Installed/i)).toBeInTheDocument();
    });
  });

  it('shows error message on failure', async () => {
    const errorMsg = 'No quota left';
    mockFetch.mockRejectedValueOnce(new Error(errorMsg));

    render(<InstallButton skill={mockSkill} />);

    const button = screen.getByText(/Install Free/i);
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
      expect(screen.getByText(/Retry/i)).toBeInTheDocument();
    });
  });
});
