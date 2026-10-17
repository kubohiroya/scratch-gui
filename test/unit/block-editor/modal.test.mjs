import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {test, after} from 'node:test';
import {JSDOM} from 'jsdom';
import * as core from '@kubohiroya/turbowarp-block-editor';
import createBlockEditorErrorSession from '../../../src/lib/tw-block-editor-error-session.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/', pretendToBeVisual: true
});
for (const name of [
    'window', 'document', 'DOMParser', 'XMLSerializer', 'Element', 'HTMLElement',
    'HTMLCollection', 'NodeList', 'Node', 'navigator'
]) Object.defineProperty(globalThis, name, {value: dom.window[name], configurable: true});
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
// React 16's scheduler must use its timer fallback in this Node/jsdom test.
Object.defineProperty(globalThis, 'MessageChannel', {value: undefined, configurable: true});
after(() => dom.window.close());
const require = createRequire(import.meta.url);
const React = require('react');
const ReactDOM = require('react-dom');
const ReactModal = require('react-modal');
const {act} = require('react-dom/test-utils');
const intl = require('react-intl');
const babel = require('@babel/core');
const treeFile = new URL('../../../src/components/block-editor/descendant-tree.jsx', import.meta.url);
const treeSource = babel.transformSync(fs.readFileSync(treeFile, 'utf8'), {
    filename: treeFile.pathname, babelrc: false, configFile: false,
    presets: [['@babel/preset-env', {targets: {node: 'current'}}], '@babel/preset-react']
});
const treeModule = {exports: {}};
const bodyFile = new URL('../../../src/components/block-editor/node-body.jsx', import.meta.url);
const bodySource = babel.transformSync(fs.readFileSync(bodyFile, 'utf8'), {
    filename: bodyFile.pathname, babelrc: false, configFile: false,
    presets: [['@babel/preset-env', {targets: {node: 'current'}}], '@babel/preset-react']
});
const bodyModule = {exports: {}};
new Function('require', 'module', 'exports', bodySource.code)(require, bodyModule, bodyModule.exports);
new Function('require', 'module', 'exports', treeSource.code)(name => name === './node-body.jsx'
    ? bodyModule.exports.default : name.endsWith('.css') ? {} : require(name),
    treeModule, treeModule.exports);
const filename = new URL('../../../src/containers/tw-block-editor-modal.jsx', import.meta.url);
// Reuse the project's JSX compiler. Keep the real ReactModal portal, replacing only its GUI/Redux wrapper.
const {code} = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename: filename.pathname, babelrc: false, configFile: false,
    presets: [['@babel/preset-env', {targets: {node: 'current'}}], '@babel/preset-react']
});
const imports = {
    'prop-types': require('prop-types'), react: React, 'react-intl': intl,
    '@kubohiroya/turbowarp-block-editor': core,
    '../components/block-editor/descendant-tree.jsx': treeModule.exports.default,
    './modal.jsx': props => React.createElement(ReactModal, {
        isOpen: true, ariaHideApp: false, contentLabel: props.contentLabel,
        onRequestClose: props.onRequestClose
    }, props.children),
    '../lib/log.js': {error: () => {}},
    '../components/block-editor/block-editor.css': {}
};
const module = {exports: {}};
new Function('require', 'module', 'exports', code)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected component dependency: ${name}`);
    return imports[name];
}, module, module.exports);
const Component = module.exports.default;

async function fixture(t, {validate = () => []} = {}) {
    const registry = new core.EditorRegistry();
    let mounts = 0;
    let cleanups = 0;
    let commits = 0;
    let closes = 0;
    const block = {
        targetId: 'sprite', blockId: 'scene', opcode: 'story_scene', revision: '1',
        arguments: {PROPERTIES: {kind: 'literal', value: '{}'}}
    };
    registry.register({
        apiVersion: 1, extensionId: 'story', editorId: 'properties', opcodes: ['story_scene'],
        editableArguments: ['PROPERTIES'],
        read: () => ({properties: '{}'}), validate,
        createPatch: draft => [{argument: 'PROPERTIES', value: draft.properties}],
        mount: (container, context) => {
            assert.ok(container instanceof dom.window.HTMLElement);
            mounts++;
            const input = document.createElement('textarea');
            input.value = context.getDraft().properties;
            container.appendChild(input);
            const onInput = () => context.setDraft({properties: input.value});
            input.addEventListener('input', onInput);
            return () => {
                cleanups++;
                input.removeEventListener('input', onInput);
                input.remove();
            };
        }
    });
    const session = registry.open(block, {readBlock: () => block, commit: () => { commits++; }});
    const root = document.createElement('div');
    document.body.appendChild(root);
    await act(async () => {
        ReactDOM.render(React.createElement(intl.IntlProvider, {locale: 'en'},
            React.createElement(Component, {session, onClose: () => { closes++; }})
        ), root);
        await new Promise(resolve => setTimeout(resolve, 0));
    });
    t.after(() => {
        act(() => { ReactDOM.unmountComponentAtNode(root); });
        root.remove();
    });
    const input = document.querySelector('textarea');
    assert.ok(input, 'The editor body mounts after the real ReactModal portal becomes available.');
    return {
        session, input,
        mounts: () => mounts, cleanups: () => cleanups,
        commits: () => commits, closes: () => closes,
        edit: value => act(() => {
            input.value = value;
            input.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
        }),
        save: () => document.querySelector('[data-block-editor-save]')
    };
}

test('the body mounts exactly once after ReactModal creates its portal', async t => {
    const f = await fixture(t);
    assert.equal(f.mounts(), 1);
    f.edit('{"duration":2}');
    assert.equal(f.mounts(), 1);
    assert.equal(f.commits(), 0);
    assert.equal(f.closes(), 0);
});

test('invalid data stays open with its draft and errors; valid data alone reaches commit', async t => {
    const f = await fixture(t, {validate: draft => draft.properties === 'invalid'
        ? [{message: 'Enter valid data.'}] : []});
    f.edit('invalid');
    await act(async () => { f.save().click(); });
    assert.equal(f.session.getState().status, 'editing');
    assert.equal(f.commits(), 0);
    assert.equal(f.closes(), 0);
    assert.equal(f.input.value, 'invalid');
    assert.match(document.querySelector('[role="status"]').textContent, /Enter valid data/);
    f.edit('{"duration":2}');
    await act(async () => { f.save().click(); });
    assert.equal(f.commits(), 1);
    assert.equal(f.closes(), 1);
    assert.equal(f.cleanups(), 1);
});

test('asynchronous validation disables Save and a repeated click cannot commit early', async t => {
    let release;
    const f = await fixture(t, {validate: () => new Promise(resolve => { release = resolve; })});
    f.edit('pending invalid data');
    act(() => f.save().click());
    assert.equal(f.save().disabled, true);
    assert.equal(f.session.cancel(), false);
    act(() => f.save().click());
    assert.equal(f.commits(), 0);
    await act(async () => { release([{message: 'Invalid.'}]); });
    assert.equal(f.save().disabled, true);
    assert.equal(f.commits(), 0);
    assert.equal(f.closes(), 0);
});

test('opening focuses the body after its portal and form are rendered', async t => {
    const f = await fixture(t);
    await act(async () => { await new Promise(resolve => window.requestAnimationFrame(resolve)); });
    assert.equal(document.activeElement, f.input);
});

test('IME Escape and multiline Enter retain the draft; ordinary Escape cancels', async t => {
    const f = await fixture(t);
    f.edit('one\ntwo');
    act(() => {
        f.input.dispatchEvent(new dom.window.CompositionEvent('compositionstart', {bubbles: true}));
        f.input.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
            key: 'Escape', keyCode: 27, bubbles: true, isComposing: true
        }));
        f.input.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
            key: 'Enter', keyCode: 13, bubbles: true, isComposing: true
        }));
    });
    assert.equal(f.session.getState().status, 'editing');
    assert.equal(f.commits(), 0);
    act(() => {
        f.input.dispatchEvent(new dom.window.CompositionEvent('compositionend', {bubbles: true}));
        f.input.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
            key: 'Enter', keyCode: 13, bubbles: true
        }));
    });
    assert.equal(f.session.getState().status, 'editing');
    assert.equal(f.session.getDraft().properties, 'one\ntwo');
    act(() => { f.input.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
        key: 'Escape', keyCode: 27, bubbles: true
    })); });
    assert.equal(f.session.getState().status, 'cancelled');
    assert.equal(f.closes(), 1);
    assert.equal(f.commits(), 0);
});

async function hierarchyFixture(t, {validate = () => [], extraNodes = 0} = {}) {
    const registry = new core.EditorRegistry();
    let commits = 0;
    let closes = 0;
    let cleanups = 0;
    const remove = registry.register({
        apiVersion: 1, extensionId: 'demo', editorId: 'tree', opcodes: ['demo_node'],
        editableArguments: ['VALUE'],
        read: block => ({properties: block.arguments.VALUE.value, id: block.blockId}),
        validate: (draft, block) => draft.properties === 'invalid'
            ? [{message: 'Invalid nested value', path: 'properties'}] : validate(draft, block),
        createPatch: draft => [{argument: 'VALUE', value: draft.properties}],
        mount: (container, context) => {
            const input = document.createElement('textarea');
            input.id = `field-${context.getDraft().id}`;
            input.value = context.getDraft().properties;
            const update = () => {
                context.setDraft({...context.getDraft(), properties: input.value});
            };
            input.addEventListener('input', update);
            const sync = () => { input.disabled = context.getState().status !== 'editing'; };
            context.subscribe(sync);
            sync();
            container.appendChild(input);
            return () => {
                cleanups++;
                input.removeEventListener('input', update);
                input.remove();
            };
        }
    });
    const node = (id, branches = [], opcode = 'demo_node') => ({block: {
        targetId: 'target', blockId: id, opcode, revision: '1', arguments: {VALUE: {kind: 'literal', value: '{}'}}
    }, branches});
    const snapshot = {targetId: 'target', blockId: 'root', generation: '1', nodes: [
        node('root', [{input: 'BODY', blockIds: ['a', 'middle']}, {input: 'ELSE', blockIds: ['b']}]),
        node('a'), node('middle', [{input: 'BODY', blockIds: ['grand']}], 'control_repeat'), node('grand'), node('b')
    ]};
    for (let i = 0; i < extraNodes; i++) {
        const id = `extra${i}`;
        snapshot.nodes[0].branches[1].blockIds.push(id);
        snapshot.nodes.push(node(id));
    }
    const session = registry.openDescendants(snapshot, {readBlock: () => snapshot.nodes[0].block, commit: () => {
        throw new Error('Single commits must not be used');
    }, descendants: {capability: core.DESCENDANT_EDITING_CAPABILITY,
        readSubtree: () => snapshot, commitSubtree: () => { commits++; }}});
    const root = document.createElement('div');
    document.body.appendChild(root);
    await act(async () => {
        ReactDOM.render(React.createElement(intl.IntlProvider, {locale: 'en'},
            React.createElement(Component, {session, nodeLabels: {root: 'Root', a: 'First', middle: 'Repeat',
                grand: 'Grandchild', b: 'Other'}, onClose: () => { closes++; }})
        ), root);
        await new Promise(resolve => setTimeout(resolve, 0));
    });
    t.after(() => {
        act(() => { ReactDOM.unmountComponentAtNode(root); });
        root.remove();
    });
    return {
        session, remove, commits: () => commits, closes: () => closes, cleanups: () => cleanups,
        field: id => document.getElementById(`field-${id}`),
        toggle: id => document.querySelector(`[data-block-editor-toggle="${id}"]`),
        save: () => document.querySelector('[data-block-editor-save]'),
        edit: (id, value) => act(() => {
            const input = document.getElementById(`field-${id}`);
            input.value = value;
            input.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
        })
    };
}

test('one real modal composes parent/grandchild forms and reveals an invalid collapsed node', async t => {
    const f = await hierarchyFixture(t);
    assert.equal(document.querySelectorAll('[role="dialog"]').length, 1);
    assert.equal(document.querySelectorAll('[data-block-editor-save]').length, 1);
    assert.equal(f.save().textContent, 'Save all');
    assert.equal(document.querySelectorAll('form').length, 0);
    const rootNode = document.querySelector('[data-block-editor-node="root"]');
    const middleNode = document.querySelector('[data-block-editor-node="middle"]');
    assert.ok(rootNode.contains(middleNode));
    assert.ok(middleNode.contains(document.querySelector('[data-block-editor-node="grand"]')));
    f.edit('grand', 'invalid');
    act(() => f.toggle('middle').click());
    assert.equal(f.field('grand'), null);
    assert.equal(f.session.getEditor('grand').getDraft().properties, 'invalid');
    await act(async () => { f.save().click(); });
    assert.equal(f.commits(), 0);
    assert.equal(f.save().disabled, true);
    assert.equal(f.field('grand').value, 'invalid');
    assert.equal(f.toggle('middle').getAttribute('aria-expanded'), 'true');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); });
    assert.equal(document.activeElement, f.field('grand'));
    assert.match(document.querySelector('[role="status"]').textContent, /Grandchild: Invalid nested value/);
    f.edit('grand', '{"fixed":true}');
    f.edit('a', '{"first":true}');
    await act(async () => { f.save().click(); });
    assert.equal(f.commits(), 1);
    assert.equal(f.closes(), 1);
    assert.equal(f.cleanups(), 5);
});

test('aggregate saving disables forms, closing, toggles and double submit; unregister releases all views', async t => {
    let release;
    const f = await hierarchyFixture(t, {validate: () => new Promise(resolve => { release = resolve; })});
    f.edit('a', 'pending');
    act(() => f.save().click());
    assert.equal(f.save().disabled, true);
    assert.equal(f.toggle('root').disabled, true);
    assert.equal(f.field('a').disabled, true);
    act(() => f.save().click());
    assert.equal(f.commits(), 0);
    await act(async () => { f.remove(); });
    assert.equal(f.session.getState().status, 'invalidated');
    assert.equal(f.closes(), 1);
    assert.equal(f.cleanups(), 4);
    assert.equal(f.field('grand'), null);
    await act(async () => { release([]); });
    assert.equal(f.commits(), 0);
});

test('hierarchy IME Escape is retained and ordinary Escape cancels every node without commit', async t => {
    const f = await hierarchyFixture(t);
    f.edit('grand', 'unfinished');
    act(() => {
        f.field('grand').dispatchEvent(new dom.window.CompositionEvent('compositionstart', {bubbles: true}));
        f.field('grand').dispatchEvent(new dom.window.KeyboardEvent('keydown', {
            key: 'Escape', keyCode: 27, bubbles: true, cancelable: true, isComposing: true
        }));
    });
    assert.equal(f.session.getState().status, 'editing');
    await act(async () => {
        f.field('grand').dispatchEvent(new dom.window.CompositionEvent('compositionend', {bubbles: true}));
        f.field('grand').dispatchEvent(new dom.window.KeyboardEvent('keydown', {
            key: 'Escape', keyCode: 27, bubbles: true, cancelable: true
        }));
    });
    assert.equal(f.session.getState().status, 'cancelled');
    assert.equal(f.commits(), 0);
    assert.equal(f.cleanups(), 4);
});

test('hierarchy opening errors show a diagnostic with Save disabled and no partial form', async t => {
    const session = createBlockEditorErrorSession({targetId: 't', blockId: 'b'},
        new core.BlockEditorStructureError('Too deep', 'limit'));
    const root = document.createElement('div');
    document.body.appendChild(root);
    t.after(() => { act(() => { ReactDOM.unmountComponentAtNode(root); }); root.remove(); });
    await act(async () => {
        ReactDOM.render(React.createElement(intl.IntlProvider, {locale: 'en'},
            React.createElement(Component, {session, onClose: () => {}})), root);
        await new Promise(resolve => setTimeout(resolve, 0));
    });
    assert.equal(document.querySelector('[data-block-editor-save]').disabled, true);
    assert.equal(document.querySelectorAll('textarea, input').length, 0);
    assert.match(document.querySelector('[role="status"]').textContent, /500 blocks or 32 levels/);
});

test('large hierarchies mount lazily but still validate and reveal an unseen grandchild', async t => {
    const f = await hierarchyFixture(t, {extraNodes: 30});
    assert.equal(document.querySelectorAll('textarea').length, 1);
    assert.equal(f.field('grand'), null);
    f.session.getEditor('grand').setDraft({id: 'grand', properties: 'invalid'});
    await act(async () => { f.save().click(); });
    assert.equal(f.commits(), 0);
    assert.equal(f.field('grand').value, 'invalid');
    assert.equal(f.toggle('middle').getAttribute('aria-expanded'), 'true');
    assert.equal(f.field('extra29'), null);
});
