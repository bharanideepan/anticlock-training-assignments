import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
  });

  it('displays CRM Application text', () => {
    render(<App />);
    expect(screen.getByText('CRM Application')).toBeInTheDocument();
  });
});
