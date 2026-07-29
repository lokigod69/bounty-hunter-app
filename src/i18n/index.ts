import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  FALLBACK_LANGUAGE,
  SUPPORTED_LANGUAGE_CODES,
  toSupportedLanguage,
} from './languages';

// English is bundled eagerly and never lazy: it is the fallback, so it has to
// be in memory before any other locale can be missing a key.
import enTranslation from './locales/en/translation.json';
import enQuotes from './locales/en/quotes.json';

// Every other locale is a separate chunk, fetched only if someone selects it.
// Statically importing twelve locales put ~300 kB of translations nobody reads
// into the main bundle; import.meta.glob with no eager flag gives Vite one
// chunk per file instead. The keys are the literal paths Vite matched.
//
// English is excluded explicitly: it is statically imported above, and matching
// it here too makes Vite warn that the dynamic import cannot move an
// already-static module into its own chunk (this build is kept warning-free).
const translationLoaders = import.meta.glob<{ default: Record<string, unknown> }>([
  './locales/*/translation.json',
  '!./locales/en/translation.json',
]);
const quotesLoaders = import.meta.glob<{ default: Record<string, unknown> }>([
  './locales/*/quotes.json',
  '!./locales/en/quotes.json',
]);

const loaded = new Set<string>([FALLBACK_LANGUAGE]);
const inFlight = new Map<string, Promise<void>>();

/**
 * Locales that actually have translation files on disk, derived from the glob
 * rather than declared by hand.
 *
 * This is deliberately NOT the same list as SUPPORTED_LANGUAGES: that one is
 * the intent (the twelve languages we mean to ship), this one is the reality.
 * The switcher offers only what is real, so a language can never appear in the
 * picker and then silently render English because nobody wrote its file yet.
 * Drop a locale directory in and it becomes selectable with no other change.
 */
export const AVAILABLE_LANGUAGE_CODES: string[] = (() => {
  const codes = new Set<string>([FALLBACK_LANGUAGE]);
  for (const path of Object.keys(translationLoaders)) {
    const match = /\.\/locales\/([^/]+)\/translation\.json$/.exec(path);
    // Only honour directories the registry knows about, so an experimental
    // folder cannot leak into the picker.
    if (match && SUPPORTED_LANGUAGE_CODES.includes(match[1])) codes.add(match[1]);
  }
  return SUPPORTED_LANGUAGE_CODES.filter((code) => codes.has(code));
})();

/**
 * Fetch a locale's chunks and register them with i18next. Idempotent, and
 * concurrent callers share one request.
 *
 * A failure here is deliberately swallowed: a locale chunk that 404s (the
 * classic stale-deploy-on-Vercel case) must leave the user reading English,
 * not staring at raw key paths or a crashed render.
 */
export async function loadLanguage(rawCode: string): Promise<void> {
  const code = toSupportedLanguage(rawCode);
  if (loaded.has(code)) return;

  const existing = inFlight.get(code);
  if (existing) return existing;

  const task = (async () => {
    const translationLoader = translationLoaders[`./locales/${code}/translation.json`];
    const quotesLoader = quotesLoaders[`./locales/${code}/quotes.json`];
    if (!translationLoader) return;

    try {
      const [translation, quotes] = await Promise.all([
        translationLoader(),
        quotesLoader ? quotesLoader() : Promise.resolve(null),
      ]);
      // `true, true` = deep merge, overwrite: a partially translated locale
      // keeps falling through to English for whatever it does not define.
      i18n.addResourceBundle(code, 'translation', translation.default, true, true);
      if (quotes) {
        i18n.addResourceBundle(code, 'quotes', quotes.default, true, true);
      }
      loaded.add(code);
    } catch {
      // Stay on English. See the note above.
    } finally {
      inFlight.delete(code);
    }
  })();

  inFlight.set(code, task);
  return task;
}

// Resolve the startup language ourselves instead of using LanguageDetector.
// The detector would hand i18next a language whose resources have not been
// fetched yet, so the first paint would be English and then visibly swap. We
// read the same localStorage key the detector uses, clamp it to a locale we
// actually ship, and await its chunk before init.
const I18N_STORAGE_KEY = 'i18nextLng';

function readStoredLanguage(): string {
  try {
    return toSupportedLanguage(window.localStorage.getItem(I18N_STORAGE_KEY));
  } catch {
    // Private mode / storage disabled — English is a fine answer.
    return FALLBACK_LANGUAGE;
  }
}

const initialLanguage = readStoredLanguage();

export const i18nReady: Promise<void> = (async () => {
  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: enTranslation, quotes: enQuotes },
    },
    lng: initialLanguage,
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGE_CODES,
    debug: false,

    interpolation: {
      escapeValue: false,
    },

    // init is asynchronous now that a locale chunk may be awaited first. With
    // suspense on, any component calling useTranslation before init resolves
    // would suspend with no boundary above it and take the app down. main.tsx
    // awaits i18nReady before mounting, so this is the second line of defence:
    // worst case a component renders untranslated instead of crashing.
    react: { useSuspense: false },
  });

  if (initialLanguage !== FALLBACK_LANGUAGE) {
    await loadLanguage(initialLanguage);
    // The bundle landed after init, so nothing has re-rendered against it yet.
    await i18n.changeLanguage(initialLanguage);
  }
})();

// Persist the choice under the same key the old LanguageDetector cached to, so
// an existing device keeps the language it already picked.
i18n.on('languageChanged', (lng) => {
  try {
    window.localStorage.setItem(I18N_STORAGE_KEY, toSupportedLanguage(lng));
  } catch {
    // Non-fatal: the language still applies for this session.
  }
});

export default i18n;
