import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const requiredFiles = [
  'docs/ai/quick-reference.md',
  'docs/ai/constraints.md',
  'docs/ai/api-manifest.json',
  'docs/ai/contracts.json',
];

const readText = async (relativePath) => {
  const absolutePath = path.join(rootDir, relativePath);
  return readFile(absolutePath, 'utf-8');
};

const fail = (message) => {
  console.error(`[validate:ai-docs] ${message}`);
  process.exit(1);
};

const main = async () => {
  for (const file of requiredFiles) {
    try {
      await readText(file);
    } catch {
      fail(`Missing required file: ${file}`);
    }
  }

  const manifestRaw = await readText('docs/ai/api-manifest.json');
  const contractsRaw = await readText('docs/ai/contracts.json');

  let manifest;
  let contracts;

  try {
    manifest = JSON.parse(manifestRaw);
  } catch {
    fail('Invalid JSON: docs/ai/api-manifest.json');
  }

  try {
    contracts = JSON.parse(contractsRaw);
  } catch {
    fail('Invalid JSON: docs/ai/contracts.json');
  }

  if (!Array.isArray(manifest.symbols) || manifest.symbols.length === 0) {
    fail('api-manifest.json must contain non-empty symbols array');
  }

  const requiredSymbols = [
    'AntdOverlayProvider',
    'useModal',
    'useGlobalModal',
    'useDrawer',
    'useGlobalDrawer',
    'useOverlay',
    'useGlobalOverlay',
    'generateUseModalHook',
    'generateUseDrawerHook',
    'generateUseOverlayHook',
    'usePromiseOverlay',
    'useGlobalPromiseOverlay',
    'generateUsePromiseOverlayHook',
    'usePromiseModal',
    'useGlobalPromiseModal',
    'generateUsePromiseModalHook',
    'usePromiseDrawer',
    'useGlobalPromiseDrawer',
    'generateUsePromiseDrawerHook',
  ];

  const symbolSet = new Set(manifest.symbols.map((item) => item.name));
  for (const symbol of requiredSymbols) {
    if (!symbolSet.has(symbol)) {
      fail(`api-manifest.json missing symbol: ${symbol}`);
    }
  }

  if (!Array.isArray(contracts.constraints) || contracts.constraints.length === 0) {
    fail('contracts.json must contain non-empty constraints array');
  }

  const providerRequired = contracts.constraints.some((item) => item.code === 'PROVIDER_REQUIRED');
  if (!providerRequired) {
    fail('contracts.json must define PROVIDER_REQUIRED constraint');
  }

  const docs = contracts.docs ?? {};
  if (
    docs.quickReference !== 'docs/ai/quick-reference.md' ||
    docs.constraints !== 'docs/ai/constraints.md' ||
    docs.apiManifest !== 'docs/ai/api-manifest.json'
  ) {
    fail('contracts.json docs references are inconsistent');
  }

  console.log('[validate:ai-docs] OK');
};

main().catch((error) => {
  fail(error instanceof Error ? error.message : 'Unknown error');
});
