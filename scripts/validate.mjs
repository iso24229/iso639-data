#!/usr/bin/env node
/**
 * Validates every YAML entry in 639-1/, 639-2/, 639-3/, 639-5/ against
 * the JSON Schemas in schema/. Exits non-zero on any failure.
 *
 * Uses Ajv (JSON Schema draft 2020-12) and the `yaml` parser.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import Ajv2020 from 'ajv/dist/2020.js';

const PARTS = ['639-1', '639-2', '639-3', '639-5'];

const ajv = new Ajv2020({ allErrors: true, strict: false });

async function loadSchema(part) {
  const text = await readFile(`schema/${part}.schema.yaml`, 'utf-8');
  return ajv.compile(parse(text));
}

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.name.endsWith('.yaml') || e.name.endsWith('.yml')) yield full;
  }
}

async function main() {
  let failures = 0;
  let checked = 0;
  for (const part of PARTS) {
    let stats;
    try {
      stats = await stat(part);
    } catch {
      console.warn(`! ${part}/ does not exist; skipping`);
      continue;
    }
    if (!stats.isDirectory()) continue;

    const validate = await loadSchema(part);
    for await (const file of walk(part)) {
      const text = await readFile(file, 'utf-8');
      const data = parse(text);
      if (!validate(data)) {
        failures++;
        console.error(`✗ ${file}`);
        for (const err of validate.errors ?? []) {
          console.error(`    ${err.instancePath || '<root>'}: ${err.message}`);
        }
        continue;
      }
      checked++;
    }
    console.log(`✓ ${part}/ validated`);
  }
  console.log(`Checked ${checked} entries, ${failures} failure(s).`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
