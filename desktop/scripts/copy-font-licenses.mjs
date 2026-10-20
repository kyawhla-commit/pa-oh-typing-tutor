import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const destination = new URL('../dist/licenses/', import.meta.url);
await mkdir(destination, { recursive: true });
for (const [packageName, name] of [
  ['@fontsource-variable/inter', 'Inter'],
  ['@fontsource-variable/outfit', 'Outfit'],
  ['@fontsource-variable/jetbrains-mono', 'JetBrains-Mono'],
  ['@fontsource/noto-sans-myanmar', 'Noto-Sans-Myanmar'],
]) {
  await copyFile(
    fileURLToPath(new URL(`../../frontend/node_modules/${packageName}/LICENSE`, import.meta.url)),
    new URL(`${name}-OFL.txt`, destination),
  );
}
