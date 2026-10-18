import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {generatePages} from './generate-pages.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'build');
const revision = process.env.BUILD_REVISION || execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
const require = createRequire(import.meta.url);
const {revision: coreRevision} = require('@kubohiroya/turbowarp-extension-data-editor/build-info');
if (!/^[a-f0-9]{40}$/.test(coreRevision || '')) throw new Error('The core package must include a full source revision.');
const publicRoot = process.env.ROOT || '/scratch-gui/';
if (!publicRoot.startsWith('/') || !publicRoot.endsWith('/')) throw new Error('ROOT must be an absolute path ending with /.');
await fs.rm(output, {recursive: true, force: true});
const result = spawnSync(process.execPath, ['--openssl-legacy-provider', 'node_modules/webpack/bin/webpack.js', '--config', 'webpack.pages.config.js', '--bail'], {
    cwd: root, stdio: 'inherit', env: {...process.env, NODE_ENV: 'production', ROOT: publicRoot, CI: '1'}
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
await fs.rename(path.join(output, 'index.html'), path.join(output, 'player.html'));
await generatePages(output, revision, coreRevision);
console.log(`Pages site built at ${output} for ${publicRoot} (GUI ${revision}, core ${coreRevision})`);
