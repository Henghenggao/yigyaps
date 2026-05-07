/** @vitest-environment jsdom */
import './setup';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Win98Dialog } from '../components/Win98Dialog';

describe('Win98Dialog', () => {
  it('renders title and children', () => {
    render(<Win98Dialog title="Sign In"><p>body content</p></Win98Dialog>);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('body content')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<Win98Dialog title="T" icon="∴">body</Win98Dialog>);
    expect(screen.getByText('∴')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(
      <Win98Dialog title="T" footer={<button>OK</button>}>body</Win98Dialog>
    );
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('does not render footer when absent', () => {
    const { container } = render(<Win98Dialog title="T">body</Win98Dialog>);
    expect(container.querySelector('.w98-dialog__footer')).toBeNull();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<Win98Dialog title="T" onClose={onClose}>body</Win98Dialog>);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not render close button when onClose is absent', () => {
    render(<Win98Dialog title="T">body</Win98Dialog>);
    expect(screen.queryByLabelText('Close')).toBeNull();
  });

  it('renders within a backdrop element', () => {
    const { container } = render(<Win98Dialog title="T">body</Win98Dialog>);
    expect(container.querySelector('.w98-dialog-backdrop')).toBeTruthy();
    expect(container.querySelector('.w98-dialog')).toBeTruthy();
  });
});
