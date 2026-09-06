import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import type { ThemeStrings } from '../theme/theme.types';

/** Product vocabulary is shared. Only the optional rank names follow appearance. */
export function useThemeStrings(): { strings: ThemeStrings; themeId: string } {
  const { t } = useTranslation();
  const { themeId } = useTheme();
  const product = t('product', { returnObjects: true }) as Omit<ThemeStrings, `rankBand${0 | 1 | 2 | 3 | 4}`>;
  return { themeId, strings: {
    ...product,
    rankBand0: t(`theme.${themeId}.rankBand0`),
    rankBand1: t(`theme.${themeId}.rankBand1`),
    rankBand2: t(`theme.${themeId}.rankBand2`),
    rankBand3: t(`theme.${themeId}.rankBand3`),
    rankBand4: t(`theme.${themeId}.rankBand4`),
  } };
}

export default useThemeStrings;
