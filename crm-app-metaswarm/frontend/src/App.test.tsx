import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
  });

  it('renders a loading state or login page on mount', () => {
    render(<App />);
    // App shows either a loading spinner (during session restore) or routes
    expect(document.body).toBeTruthy();
    // Check for either the progress spinner role or a heading
    const spinners = document.querySelectorAll('[role="progressbar"]');
    const headings = screen.queryAllByRole('heading');
    expect(spinners.length + headings.length).toBeGreaterThan(0);
  });
});
