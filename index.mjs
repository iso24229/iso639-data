// Entry point for @iso24229/iso639-data.
//
// Loads every ISO 639 entry from the four part directories into memory
// on first access. Use the named exports for direct lookups by code,
// or the `parts` map to iterate a single part.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDir(dir) {
  const out = {};
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.yaml')) continue;
    const code = name.slice(0, -'.yaml'.length);
    out[code] = parse(readFileSync(join(dir, name), 'utf8'));
  }
  return out;
}

const v1   = loadDir(join(__dirname, '639-1'));
const v2   = loadDir(join(__dirname, '639-2'));
const v3   = loadDir(join(__dirname, '639-3'));
const v5   = loadDir(join(__dirname, '639-5'));

export const part1 = v1;
export const part2 = v2;
export const part3 = v3;
export const part5 = v5;

export const parts = {
  '639-1': v1,
  '639-2': v2,
  '639-3': v3,
  '639-5': v5,
};

export const manifest = parse(readFileSync(join(__dirname, 'manifest.yaml'), 'utf8'));
export const version = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8')).version;
