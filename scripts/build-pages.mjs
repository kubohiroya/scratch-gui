import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {generatePages} from './generate-pages.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'build');
const revision = process.env.BUILD_REVISION || execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
const coreRoot = await fs.realpath(path.join(root, 'node_modules/@kubohiroya/turbowarp-block-editor'));
const coreGitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {cwd: coreRoot, encoding: 'utf8'}).trim();
if (await fs.realpath(coreGitRoot) !== coreRoot) throw new Error('The core dependency must be a Git checkout.');
const coreRevision = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: coreRoot, encoding: 'utf8'}).trim();
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
