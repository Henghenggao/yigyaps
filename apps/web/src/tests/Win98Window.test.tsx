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

  it('does not render menubar when menuItems is empty or absent', () => {
    const { container } = render(<Win98Window title="T">body</Win98Window>);
    expect(container.querySelector('.w98-menubar')).toBeNull();
  });

  it('does not render statusbar when statusBar is absent', () => {
    const { container } = render(<Win98Window title="T">body</Win98Window>);
    expect(container.querySelector('.w98-statusbar')).toBeNull();
  });
});
