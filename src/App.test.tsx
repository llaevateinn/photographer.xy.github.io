import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('M0 application shell', () => {
  it('shows the product title, overview and five navigable tabs', () => {
    render(<App />);
    expect(screen.getByText('爱云动')).toBeInTheDocument();
    expect(screen.getByLabelText('运营概览')).toBeInTheDocument();
    for (const tab of ['数据', '需求测算', '排班建议', '激活召回', '风险提示']) {
      expect(screen.getByRole('tab', { name: tab })).toBeInTheDocument();
    }
  });

  it('changes the active page when a tab is selected', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: '需求测算' }));
    expect(screen.getByRole('tab', { name: '需求测算' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { level: 1, name: '需求测算' })).toBeInTheDocument();
  });

  it('shows loaded data counts and opens risk review from the overview', () => {
    render(<App />);
    const overview = within(screen.getByLabelText('运营概览'));
    expect(overview.getByText('16')).toBeInTheDocument();
    expect(overview.getByText('6')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /风险提示/ }));
    expect(screen.getByRole('tab', { name: '风险提示' })).toHaveAttribute('aria-selected', 'true');
  });
});
