import { rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stringify } from 'yaml';

const SOURCES = {
  '639-2': 'https://www.loc.gov/standards/iso639-2/ISO-639-2_utf-8.txt',
  '639-3': 'https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3.tab',
  '639-5': 'https://id.loc.gov/vocabulary/iso639-5',
};

const HEARTBEAT = 'last-checked-date.txt';

async function fetchText(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

async function fetchJsonLd(url) {
  const res = await fetch(url, { headers: { Accept: 'application/ld+json' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

function parseIso6392(text) {
  // Format: alpha3|bibliographic|alpha2|English|French
  return text.split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => {
      const [alpha3, bibliographic, alpha2, en, fr] = line.split('|');
      return {
        code: alpha3.trim(),
        bibliographic: (bibliographic || '').trim() || alpha3.trim(),
        terminological: alpha3.trim(),
        alpha2: (alpha2 || '').trim() || null,
        name: { en: (en || '').trim(), fr: (fr || '').trim() },
        remarks: '',
      };
    });
}

function deriveIso6391(entries6392) {
  const seen = new Map();
  for (const e of entries6392) {
    if (!e.alpha2) continue;
    if (seen.has(e.alpha2)) continue;
    seen.set(e.alpha2, {
      code: e.alpha2,
      alpha3: {
        bibliographic: e.bibliographic,
        terminological: e.terminological,
      },
      name: e.name,
      remarks: '',
    });
  }
  return [...seen.values()];
}

function parseIso6393(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0].split('\t');
  const expected = ['Id', 'Part2b', 'Part2t', 'Part1', 'Scope', 'Language_Type', 'Ref_Name', 'Comment'];
  for (let i = 0; i < expected.length; i++) {
    if (header[i] !== expected[i]) {
      throw new Error(`iso-639-3.tab header field ${i} was "${header[i]}", expected "${expected[i]}"`);
    }
  }
  return lines.slice(1).map((line) => {
    const [Id, Part2b, Part2t, Part1, Scope, Language_Type, Ref_Name, Comment] = line.split('\t');
    return {
      code: Id.trim(),
      part2b: Part2b?.trim() || null,
      part2t: Part2t?.trim() || null,
      part1: Part1?.trim() || null,
      scope: Scope?.trim() || null,
      type: Language_Type?.trim() || null,
      name: { en: (Ref_Name || '').trim() },
      comment: (Comment || '').trim() || null,
    };
  });
}

function parseIso6395JsonLd(json) {
  const out = [];
  for (const entry of json) {
    const id = entry['@id'];
    if (!id || !id.includes('/iso639-5/')) continue;
    const codeValues = entry['http://www.loc.gov/mads/rdf/v1#code'];
    if (!codeValues || !codeValues.length) continue;
    const code = codeValues[0]['@value'];
    const labels = entry['http://www.loc.gov/mads/rdf/v1#authoritativeLabel'] || [];
    const name = { en: null, fr: null };
    for (const label of labels) {
      if (label['@language'] === 'en') name.en = label['@value'];
      else if (label['@language'] === 'fr') name.fr = label['@value'];
    }
    if (!code) continue;
    out.push({ code, name, remarks: '' });
  }
  return out;
}

async function writePart(folder, entries) {
  const dir = folder;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  for (const entry of entries) {
    await writeFile(join(dir, `${entry.code}.yaml`), stringify(entry));
  }
  return entries.length;
}

async function main() {
  console.log('Fetching ISO 639-2 (LOC)...');
  const text6392 = await fetchText(SOURCES['639-2']);
  const iso6392 = parseIso6392(text6392);
  console.log(`  ${iso6392.length} entries`);

  console.log('Deriving ISO 639-1...');
  const iso6391 = deriveIso6391(iso6392);
  console.log(`  ${iso6391.length} entries`);

  console.log('Fetching ISO 639-3 (SIL)...');
  const text6393 = await fetchText(SOURCES['639-3']);
  const iso6393 = parseIso6393(text6393);
  console.log(`  ${iso6393.length} entries`);

  console.log('Fetching ISO 639-5 (LOC id.loc.gov JSON-LD)...');
  const jsonld = await fetchJsonLd(SOURCES['639-5']);
  const iso6395 = parseIso6395JsonLd(jsonld);
  console.log(`  ${iso6395.length} entries`);

  const counts = {
    '639-1': await writePart('639-1', iso6391),
    '639-2': await writePart('639-2', iso6392),
    '639-3': await writePart('639-3', iso6393),
    '639-5': await writePart('639-5', iso6395),
  };

  const manifest = {
    sources: SOURCES,
    fetchedAt: new Date().toISOString(),
    counts,
  };
  await writeFile('manifest.yaml', stringify(manifest));

  const now = new Date().toISOString();
  await writeFile(HEARTBEAT, `${now}\n`);

  console.log(`Heartbeat updated: ${now}`);
  console.log('Done.');
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
