// src/i18n/taskLifecycleErrorSites.test.ts
// Pins the ROUTING half of the task-lifecycle error contract.
//
// taskLifecycleErrors.test.ts proves the map is right. That is not enough: the
// map is only reached if the UI actually calls it. Since 45d70af,
// TaskLifecycleRpcError.message is nothing but the generic per-operation
// fallback ("Failed to submit task for review."), so a catch block that renders
// `error.message` silently downgrades a specific, translated reason to a
// generic English one. Six call sites did exactly that and every existing test
// still passed, because none of them looked at the call sites.
//
// Rendering the pages needs a DOM and RTL, neither of which this suite has, so
// the guard is a source-level one: every catch block in the UI layer that both
// can receive a lifecycle refusal AND shows something to the user must go
// through the translator.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import en from './locales/en/translation.json';
import de from './locales/de/translation.json';
import { translateTaskLifecycleErrorObject, type Translator } from './taskLifecycleErrors';
import { TaskLifecycleRpcError, type TaskLifecycleOperation } from '../domain/missions';

const SRC = join(__dirname, '..');

/** Directories that hold user-facing code, i.e. code that owns a translator. */
const UI_DIRS = ['pages', 'components', 'hooks', 'context'];

/**
 * Domain calls that can throw TaskLifecycleRpcError — everything that runs a
 * lifecycle RPC result through requireTaskLifecycleRpcSuccess.
 */
const LIFECYCLE_CALLS = [
  'requireTaskLifecycleRpcSuccess(',
  'uploadProof(',
  'submitForReviewNoProof(',
  'archiveMission(',
  'updateMissionStatus(',
  'rejectMission(',
  'createTaskViaRpc(',
  'updateTaskViaRpc(',
];

/** A catch block that does one of these is speaking to the user. */
const RENDERS = ['toast.', 'setError(', 'setUploadError('];

const TRANSLATOR = 'translateTaskLifecycleErrorObject';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) return [];
    return [full];
  });
}

/**
 * Blanks out string/template/comment contents (keeping length, so indexes still
 * line up with the original) so brace matching cannot be fooled by a `{` inside
 * a sentence. Regex literals are not modelled; if one ever appears in a scanned
 * file the scan fails loudly rather than passing quietly.
 */
function mask(src: string): string {
  const out = src.split('');
  let i = 0;
  const blank = (from: number, to: number) => {
    for (let k = from; k < to && k < out.length; k++) {
      if (out[k] !== '\n') out[k] = ' ';
    }
  };
  while (i < src.length) {
    const ch = src[i];
    if (ch === '/' && src[i + 1] === '/') {
      const end = src.indexOf('\n', i);
      blank(i, end === -1 ? src.length : end);
      i = end === -1 ? src.length : end;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      blank(i, end === -1 ? src.length : end + 2);
      i = end === -1 ? src.length : end + 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === ch) break;
        j++;
      }
      blank(i + 1, j);
      i = j + 1;
      continue;
    }
    i++;
  }
  return out.join('');
}

function matchBrace(masked: string, open: number): number {
  let depth = 0;
  for (let i = open; i < masked.length; i++) {
    if (masked[i] === '{') depth++;
    else if (masked[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

interface TryCatch {
  tryBody: string;
  catchBody: string;
  line: number;
}

function tryCatchBlocks(src: string): TryCatch[] {
  const masked = mask(src);
  const blocks: TryCatch[] = [];
  const re = /\btry\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked)) !== null) {
    const open = m.index + m[0].length - 1;
    const close = matchBrace(masked, open);
    if (close < 0) continue;
    const tail = masked.slice(close + 1);
    const cm = /^\s*catch\s*\([^)]*\)\s*\{/.exec(tail);
    if (!cm) continue;
    const catchOpen = close + 1 + cm[0].length - 1;
    const catchClose = matchBrace(masked, catchOpen);
    if (catchClose < 0) continue;
    blocks.push({
      tryBody: src.slice(open, close + 1),
      catchBody: src.slice(catchOpen, catchClose + 1),
      line: src.slice(0, m.index).split('\n').length,
    });
  }
  return blocks;
}

/**
 * `translateTaskLifecycleErrorObject` itself, plus any helper in the same file
 * that wraps it (useTasks.ts routes every catch through `getErrorMessage`).
 */
function localizerNames(src: string): string[] {
  const masked = mask(src);
  const names = [TRANSLATOR];
  const re = /\bfunction\s+(\w+)\s*\([^)]*\)[^{]*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked)) !== null) {
    const open = m.index + m[0].length - 1;
    const close = matchBrace(masked, open);
    if (close < 0) continue;
    if (src.slice(open, close + 1).includes(TRANSLATOR)) names.push(m[1]);
  }
  return names;
}

describe('lifecycle refusals reach the user through the translator', () => {
  const files = UI_DIRS.flatMap((dir) => walk(join(SRC, dir)))
    .filter((file) => {
      const src = readFileSync(file, 'utf-8');
      return LIFECYCLE_CALLS.some((call) => src.includes(call));
    });

  it('finds the surfaces that run lifecycle RPCs', () => {
    // A rename that empties this list would make every check below vacuous.
    const names = files.map((f) => f.replace(/.*[\\/]/, '')).sort();
    expect(names).toEqual(['Dashboard.tsx', 'IssuedPage.tsx', 'useTasks.ts']);
  });

  it.each(files.map((f) => [f.replace(/.*[\\/]/, ''), f]))(
    '%s: no catch shows the generic .message for a coded refusal',
    (_name, file) => {
      const src = readFileSync(file, 'utf-8');
      const localizers = localizerNames(src);

      const offenders = tryCatchBlocks(src)
        .filter((b) => LIFECYCLE_CALLS.some((call) => b.tryBody.includes(call)))
        // A catch that only cleans up and rethrows is fine — whoever finally
        // renders the rethrown error is the one this rule applies to.
        .filter((b) => RENDERS.some((r) => b.catchBody.includes(r)))
        .filter((b) => !localizers.some((name) => b.catchBody.includes(name)))
        .map((b) => `try at line ${b.line}`);

      expect(offenders).toEqual([]);
    },
  );
});

describe('wrong_status from stale UI is stated, not generalized', () => {
  // The concrete regression: another session already completed the task, this
  // session submits proof anyway, the RPC answers `wrong_status`. Before the
  // fix a German user read "Failed to submit task for review." — English, and
  // about nothing in particular.
  const lookup = (bundle: unknown, key: string): string | undefined => {
    const value = key.split('.').reduce<unknown>((acc, seg) => {
      if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[seg];
      return undefined;
    }, bundle);
    return typeof value === 'string' ? value : undefined;
  };
  const translatorFor = (bundle: unknown): Translator => (key, options) => {
    const raw = lookup(bundle, key);
    if (raw === undefined) return key;
    if (!options) return raw;
    return raw.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, name: string) =>
      name in options ? String(options[name]) : whole
    );
  };

  const OPERATIONS: TaskLifecycleOperation[] = [
    'archive', 'create', 'delete', 'reject', 'status', 'submit', 'update',
  ];

  it.each(OPERATIONS)('%s: German gets the wrongStatus sentence', (operation) => {
    const error = new TaskLifecycleRpcError('wrong_status', operation);
    const shown = translateTaskLifecycleErrorObject(error, translatorFor(de));

    expect(shown).toBe('Diese Aufgabe hat nicht den passenden Status für diese Aktion.');
    // The thing the six broken call sites rendered instead.
    expect(shown).not.toBe(error.message);
    expect(shown).not.toBe(lookup(de, `taskErrors.fallback.${operation}`));
  });

  it.each(OPERATIONS)('%s: English is specific too, not the per-operation fallback', (operation) => {
    const error = new TaskLifecycleRpcError('wrong_status', operation);
    const shown = translateTaskLifecycleErrorObject(error, translatorFor(en));

    expect(shown).toBe('This task is not in the correct status for that action.');
    expect(shown).not.toBe(error.message);
    expect(shown).not.toBe(lookup(en, `taskErrors.fallback.${operation}`));
  });

  it('the generic fallback really is what .message carries', () => {
    // If this ever stops being true the regression above changes shape, and the
    // "not .message" assertions would start passing for the wrong reason.
    expect(new TaskLifecycleRpcError('wrong_status', 'submit').message)
      .toBe('Failed to submit task for review.');
  });
});
