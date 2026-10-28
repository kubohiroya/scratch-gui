const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const source = process.env.SECURITY_DIALOG_SOURCE;
if (!source) throw new Error('SECURITY_DIALOG_SOURCE に共通UIのローカルcheckoutを指定してください。');
const sourceRoot = path.resolve(source);
const name = '@kubohiroya/turbowarp-extension-security-dialog';
if (JSON.parse(fs.readFileSync(path.join(sourceRoot, 'package.json'), 'utf8')).name !== name) {
    throw new Error('共通UIのpackage.jsonが一致しません。');
}
Object.assign(process.env, {NODE_ENV: 'development', CI: '1', ROOT: '', BUILD_MODE: '', ENABLE_SERVICE_WORKER: ''});
process.chdir(repo);
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {createManifest, createServer, listen} = require('./local-security-preview.cjs');
const config = require('../webpack.config.js')[0];
config.entry = {editor: './src/playground/editor.jsx'};
config.output.path = path.join(repo, '.local-preview', 'plus', String(Date.now()));
config.plugins = config.plugins.filter(plugin => !(plugin instanceof HtmlWebpackPlugin) ||
    plugin.options.filename === 'editor.html');
for (const [suffix, filename] of [['', 'dist/index.cjs'], ['/react', 'dist/react.cjs'],
    ['/turbowarp', 'dist/turbowarp.cjs'], ['/webpack4.css', 'webpack4.css']]) {
    const target = path.join(sourceRoot, filename);
    if (!fs.existsSync(target)) throw new Error(`先に共通UIをビルドしてください: ${target}`);
    config.resolve.alias[`${name}${suffix}$`] = target;
}
// The checkout may be outside this repository's node_modules ancestry.
config.resolve.alias['react$'] = require.resolve('react');
config.resolve.alias['react-dom$'] = require.resolve('react-dom');
const port = Number(process.env.PORT || 8602);
webpack(config, async (error, stats) => {
    try {
        if (error) throw error;
        if (stats.hasErrors()) throw new Error(stats.toString({all: false, errors: true}));
        if (stats.hasWarnings()) console.warn(stats.toString({all: false, warnings: true}));
        const manifest = await createManifest(config.output.path, port);
        const server = createServer(config.output.path, manifest);
        await listen(server, port);
        console.log(`確認URL: http://127.0.0.1:${port}/editor.html?lang=ja&twPlusExtensions=1`);
        console.log(`配信先: ${config.output.path}`);
        for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
    } catch (failure) {
        console.error(failure);
        process.exitCode = 1;
    }
});
