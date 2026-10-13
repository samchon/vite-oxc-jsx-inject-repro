import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer, version } from 'vite';

for (const option of ['oxc', 'esbuild']) {
  const root = fs.realpathSync.native(
    fs.mkdtempSync(path.join(os.tmpdir(), 'vite-jsx-inject-')),
  );
  let server;
  try {
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ type: 'module' }));
    fs.writeFileSync(path.join(root, 'src/main.tsx'), 'export const view = "view";\n');
    for (const name of ['manual-dep', 'jsx-helper']) {
      const dependency = path.join(root, 'node_modules', name);
      fs.mkdirSync(dependency, { recursive: true });
      fs.writeFileSync(path.join(dependency, 'package.json'), JSON.stringify({
        name, type: 'module', exports: './index.js',
      }));
      fs.writeFileSync(path.join(dependency, 'index.js'), 'export const value = 1;\n');
    }
    server = await createServer({
      root,
      configFile: false,
      appType: 'custom',
      logLevel: 'silent',
      [option]: { jsxInject: 'import "jsx-helper";' },
      optimizeDeps: {
        entries: ['src/main.tsx'],
        include: ['manual-dep'],
        holdUntilCrawlEnd: false,
      },
      server: { host: '127.0.0.1', port: 0 },
    });
    await server.listen();
    const metadataFile = path.join(server.config.cacheDir, 'deps/_metadata.json');
    const readMetadata = () => JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
    const waitFor = async (ready) => {
      const deadline = Date.now() + 15000;
      while (!ready()) {
        if (Date.now() >= deadline) throw new Error('Optimizer metadata timed out');
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    };
    await waitFor(() => fs.existsSync(metadataFile));
    const initial = readMetadata();
    const delivered = await server.transformRequest('/src/main.tsx');
    await waitFor(() => 'jsx-helper' in readMetadata().optimized);
    const after = readMetadata();
    console.log({
      option,
      version,
      initial: Object.keys(initial.optimized).sort(),
      servedHasInjectedImport: delivered.code.includes('jsx-helper'),
      after: Object.keys(after.optimized).sort(),
      publicationChanged: initial.browserHash !== after.browserHash,
    });
  } finally {
    await server?.close();
    fs.rmSync(root, { recursive: true });
  }
}
