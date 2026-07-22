import { describe, expect, it } from 'vitest';
import { build } from 'vite';

describe('production frontend bundle', () => {
  it('excludes development catalog and workbook fallback modules', async () => {
    const result = await build({
      mode: 'production',
      logLevel: 'silent',
      build: {
        minify: false,
        write: false,
      },
    });
    const builds = Array.isArray(result) ? result : [result];
    const output = builds.flatMap((item) => ('output' in item ? item.output : []));
    const fileNames = output.map((item) => item.fileName).join('\n');
    const moduleIds = output.flatMap((item) => (
      item.type === 'chunk' ? Object.keys(item.modules) : []
    )).join('\n');
    const bundleText = output.map((item) => (
      item.type === 'chunk' ? item.code : String(item.source)
    )).join('\n');

    expect(fileNames).not.toMatch(/official(?:Catalog|Data)\.generated/i);
    expect(moduleIds).not.toMatch(/catalog\/official(?:Catalog|Data)\.generated/i);
    expect(bundleText).not.toMatch(/(?:FMT|TMP)-[A-Z0-9]/i);
    expect(bundleText).not.toMatch(/pending_mapping|template_variant|private-workbook|sourcePathHash/i);
    expect(bundleText).not.toMatch(/\bresp(?:0[1-9]|1[0-8])\b/i);
    expect(bundleText).not.toMatch(/Adriana Ruiz Rivera|Angel Ordo(?:ñ|Ã±)ez Ayala|Liliana Yunuen Rojas Maciel/i);
  }, 60_000);
});
