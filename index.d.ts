export type Iso639Name = { en?: string; fr?: string } & Record<string, string | undefined>;

export interface Iso639Part1Entry {
  code: string;
  alpha3: { bibliographic: string; terminological: string };
  name: Iso639Name;
  remarks?: string;
}

export interface Iso639Part2Entry {
  code: string;
  bibliographic: string;
  terminological: string;
  alpha2: string;
  name: Iso639Name;
  remarks?: string;
}

export interface Iso639Part3Entry {
  code: string;
  part2b: string | null;
  part2t: string | null;
  part1: string | null;
  scope: string;
  type: string;
  name: Iso639Name;
  comment?: string | null;
}

export interface Iso639Part5Entry {
  code: string;
  name: Iso639Name;
  remarks?: string;
}

export type Part1 = Record<string, Iso639Part1Entry>;
export type Part2 = Record<string, Iso639Part2Entry>;
export type Part3 = Record<string, Iso639Part3Entry>;
export type Part5 = Record<string, Iso639Part5Entry>;

export const part1: Part1;
export const part2: Part2;
export const part3: Part3;
export const part5: Part5;

export const parts: {
  '639-1': Part1;
  '639-2': Part2;
  '639-3': Part3;
  '639-5': Part5;
};

export const manifest: {
  sources: Record<string, string>;
  fetchedAt: string;
  counts: { '639-1': number; '639-2': number; '639-3': number; '639-5': number };
};

export const version: string;
