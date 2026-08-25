import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const testFiles = readdirSync(scriptsDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /^test-.*\.cjs$/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

if (testFiles.length === 0) {
  console.error('No test-*.cjs files found in scripts/.');
  process.exit(1);
}

for (const testFile of testFiles) {
  console.log(`\n[test] ${testFile}`);

  const result = spawnSync(process.execPath, [join(scriptsDirectory, testFile)], {
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`Failed to start ${testFile}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    if (result.signal) {
      console.error(`${testFile} terminated by signal ${result.signal}.`);
    }

    process.exit(result.status ?? 1);
  }
}
