import coverageRows from './data/planw.generated.json';

export type CoverageRow = {
  chemicalName: string;
  brandName: string;
  strength: string;
  dosageForm: string;
  din: string;
  manufacturer: string;
};

const DIN_REGEX = /(?<!\d)\d{8}(?!\d)/g;

const COVERAGE_BY_DIN = new Map<string, CoverageRow>(
  (coverageRows as CoverageRow[]).map((row) => [row.din, row]),
);

export function extractDinCandidates(text: string): string[] {
  const matches = text.match(DIN_REGEX) ?? [];
  return Array.from(new Set(matches));
}

export function lookupDin(din: string): CoverageRow | null {
  return COVERAGE_BY_DIN.get(din) ?? null;
}

export function normalizeOcrText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
