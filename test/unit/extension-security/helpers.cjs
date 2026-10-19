const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '../../..');
const previousJS = require.extensions['.js'];
function compile(module, filename) {
    const result = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
        filename, babelrc: false, configFile: false,
        presets: [[require.resolve('@babel/preset-env'), {targets: {node: 'current'}}], require.resolve('@babel/preset-react')]
    });
    module._compile(result.code, filename);
}
require.extensions['.jsx'] = compile;
require.extensions['.js'] = (module, filename) => filename.startsWith(`${root}/src/`)
    ? compile(module, filename) : previousJS(module, filename);
require.extensions['.css'] = module => {module.exports = new Proxy({}, {get: (object, key) => key === '__esModule' ? false : String(key)});};
for (const extension of ['.svg', '.png', '.jpg', '.wav', '.gif']) {
    require.extensions[extension] = (module, filename) => {module.exports = filename;};
}
module.exports = {root};
