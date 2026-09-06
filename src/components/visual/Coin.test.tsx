// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import Coin from './Coin';

afterEach(cleanup);
it('keeps large amounts readable and follows the app locale', async () => {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({ lng: 'de', resources: {} });
  const view = render(<I18nextProvider i18n={i18n}><Coin value={12500} /></I18nextProvider>);
  expect(screen.getByText('12.500')).toBeTruthy();
  expect(Array.from(view.container.querySelectorAll('img')).map(img => img.src.match(/credit-digit-(\d)/)?.[1]))
    .toEqual(['1', '2', '5', '0', '0']);
  expect(view.container.querySelector('.coin-separator')?.textContent).toBe('.');
});
it('renders zero explicitly, and decorative coins contain no invented denomination', () => {
  const view = render(<Coin value={0} />);
  expect(screen.getByText('0')).toBeTruthy();
  view.rerender(<Coin />);
  expect(view.container.textContent).toBe('');
});
it('can compose all ten digits from the shared artwork without exposing individual image names', () => {
  const view = render(<Coin value={1023456789} />);
  const images = Array.from(view.container.querySelectorAll('img'));
  expect(images.map(img => img.src.match(/credit-digit-(\d)/)?.[1])).toEqual(Array.from('1023456789'));
  expect(images.every(img => img.alt === '')).toBe(true);
  expect(view.container.querySelector('.coin-amount')?.getAttribute('aria-hidden')).toBe('true');
});
it('keeps the whole amount visible when any numeral image fails', () => {
  const view = render(<Coin value={24} />);
  fireEvent.error(view.container.querySelector('img')!);
  expect(view.container.querySelector('.coin-amount')?.textContent).toBe('24');
  expect(view.container.querySelectorAll('img')).toHaveLength(0);
  view.rerender(<Coin value={20} />);
  expect(view.container.querySelector('.coin-amount')?.textContent).toBe('20');
});
