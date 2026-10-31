const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

const filename = path.resolve(__dirname, '../../../src/containers/tw-document-editor.jsx');
const {code} = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    babelrc: false, presets: [['@babel/preset-env', {targets: {node: 'current'}}], '@babel/preset-react']
});
function fixture(enabled) {
    const calls = [], errors = [];
    const blockly = {};
    const React = require('react');
    const module = {exports: {}};
    const mocks = {
        react: React,
        'prop-types': require('prop-types'),
        'react-redux': {connect: () => value => value},
        '@kubohiroya/turbowarp-document-editor': {mountDocumentEditor(options) {
            calls.push(options);
            return {dispose() {calls.push('dispose');}};
        }},
        '../../config/feature-flags': {embeddedYamlEditor: enabled, documentSources: true},
        '../lib/tw-lazy-scratch-blocks': {load: async () => {}, get: () => blockly},
        '../lib/log': {error: (...args) => errors.push(args)}
    };
    new Function('require', 'module', 'exports', 'document', code)(name => {
        assert(name in mocks, name);
        return mocks[name];
    }, module, module.exports, {});
    return {Editor: module.exports.default, calls, errors, blockly};
}

test('default-off lifecycle does not mount editing UI or access the VM', () => {
    const f = fixture(false);
    const component = new f.Editor({vm: {}, locale: 'ja'});
    component.componentDidMount();
    component.componentWillUnmount();
    assert.deepEqual(f.calls, []);
    assert.deepEqual(f.errors, []);
});

test('enabled lifecycle uses the host Blockly instance and disposes before replacing the VM', async () => {
    const f = fixture(true);
    const vm = {};
    const component = new f.Editor({vm, locale: 'ja'});
    component.componentDidMount();
    assert.equal(f.calls[0].vm, vm);
    assert.equal(f.calls[0].language, 'ja');
    assert.equal(f.calls[0].documentSources, true);
    assert.equal(f.calls[0].getScratch().vm, vm);
    assert.equal(await f.calls[0].getScratch().gui.getBlockly(), f.blockly);
    component.componentDidUpdate({vm});
    assert.equal(f.calls.length, 1);
    const next = {};
    component.props = {vm: next, locale: 'ja'};
    component.componentDidUpdate({vm});
    assert.equal(f.calls[1], 'dispose');
    assert.equal(f.calls[2].vm, next);
    component.componentWillUnmount();
    assert.equal(f.calls[3], 'dispose');
    assert.deepEqual(f.errors, []);
});
