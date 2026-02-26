import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InstallButton } from '../components/InstallButton';

describe('InstallButton', () => {
  const mockSkill = {
    id: 'test-skill-1',
    packageId: 'test-package',
    displayName: 'Test Skill',
    tier: 0,
  };

  it('renders install button for uninstalled skill', () => {
    render(
      <InstallButton
        skill={mockSkill as any}
        isInstalled={false}
        onInstall={vi.fn()}
      />
    );

    expect(screen.getByText(/Install/i)).toBeInTheDocument();
  });

  it('renders uninstall button for installed skill', () => {
    render(
      <InstallButton
        skill={mockSkill as any}
        isInstalled={true}
        onInstall={vi.fn()}
      />
    );

    expect(screen.getByText(/Uninstall/i)).toBeInTheDocument();
  });

  it('calls onInstall when install button is clicked', async () => {
    const mockOnInstall = vi.fn();
    render(
      <InstallButton
        skill={mockSkill as any}
        isInstalled={false}
        onInstall={mockOnInstall}
      />
    );

    const button = screen.getByText(/Install/i);
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnInstall).toHaveBeenCalledTimes(1);
    });
  });

  it('shows tier badge for premium skills', () => {
    const premiumSkill = { ...mockSkill, tier: 2 };
    render(
      <InstallButton
        skill={premiumSkill as any}
        isInstalled={false}
        onInstall={vi.fn()}
      />
    );

    // Check if tier badge is rendered (adjust selector based on actual implementation)
    expect(screen.getByText(/Epic/i)).toBeInTheDocument();
  });

  it('disables button during loading state', () => {
    render(
      <InstallButton
        skill={mockSkill as any}
        isInstalled={false}
        onInstall={vi.fn()}
        loading={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
