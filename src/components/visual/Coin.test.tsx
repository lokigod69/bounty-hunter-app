// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import Coin from './Coin';

afterEach(cleanup);
it('keeps large amounts readable and follows the app locale', async () => {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({ lng: 'de', resources: {} });
  render(<I18nextProvider i18n={i18n}><Coin value={12500} /></I18nextProvider>);
  expect(screen.getByText('12.500')).toBeTruthy();
});
it('renders zero explicitly, and decorative coins contain no invented denomination', () => {
  const view = render(<Coin value={0} />);
  expect(screen.getByText('0')).toBeTruthy();
  view.rerender(<Coin />);
  expect(view.container.textContent).toBe('');
});
