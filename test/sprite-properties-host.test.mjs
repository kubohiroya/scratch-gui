import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const {transformFileSync} = require('@babel/core');
const React = require('react');
const compiled = transformFileSync(fileURLToPath(new URL('../src/containers/sprite-info.jsx', import.meta.url)), {
    babelrc: false,
    configFile: false,
    presets: ['@babel/preset-react'],
    plugins: ['@babel/plugin-transform-modules-commonjs']
}).code;

const setup = host => {
    const Stock = () => null;
    const module = {exports: {}};
    const imports = {
        '../addons/hooks': {getHostIntegration: () => host},
        '../components/sprite-info/sprite-info.jsx': Stock,
        'react-redux': {
            connect: select => Component => ({state, ...props}) =>
                new Component({...props, ...select(state)}).render()
        }
    };
    new Function('module', 'exports', 'require', compiled)(
        module, module.exports, specifier => imports[specifier] || require(specifier)
    );
    return {SpriteInfo: module.exports.default, Stock};
};

test('stock SpriteInfo stays active without a host panel', () => {
    for (const host of [null, {}, {SpritePropertiesPanel: undefined}]) {
        const {SpriteInfo, Stock} = setup(host);
        let visible;
        const output = new SpriteInfo({
            stageSize: 'large', name: 'Cat', onChangeVisibility: value => { visible = value; }
        }).render();
        assert.equal(output.type, Stock);
        assert.equal(output.props.name, 'Cat');
        output.props.onClickVisible({preventDefault() {}});
        assert.equal(visible, true);
    }
});

test('host receives selected sprite values and stale edits are rejected', () => {
    const Panel = () => null;
    const {SpriteInfo} = setup({SpritePropertiesPanel: Panel});
    const cats = {id: 'cat', name: 'Cat', visible: true, x: 0};
    const dogs = {id: 'dog', name: 'Dog', visible: false, x: 50};
    const edits = [];
    const vm = {
        editingTarget: cats,
        renameSprite: (id, name) => edits.push([id, {name}]),
        postSpriteInfo: patch => edits.push([vm.editingTarget.id, patch])
    };
    const state = {
        scratchGui: {targets: {editingTarget: cats.id, sprites: {cat: cats, dog: dogs}}, vm},
        locales: {locale: 'ja'}
    };
    const render = () => SpriteInfo({stageSize: 'large', state});
    const first = render();
    assert.equal(first.type, Panel);
    assert.equal(first.props.disabled, false);
    assert.equal(first.props.locale, 'ja');
    assert.equal(first.props.values, cats);
    first.props.onChange('cat', {name: 'New cat'});
    for (const patch of [{x: 5}, {y: 7}, {visible: false}, {size: 90}, {direction: -30}, {rotationStyle: 'left-right'}]) {
        first.props.onChange('cat', patch);
    }
    assert.equal(edits.length, 7);

    vm._dragTarget = dogs;
    first.props.onChange('cat', {x: 10});
    vm._dragTarget = null;
    vm.editingTarget = dogs;
    first.props.onChange('cat', {name: 'Stale name'});
    first.props.onChange('dog', {x: 10});
    state.scratchGui.targets.editingTarget = dogs.id;
    assert.equal(render().props.values, dogs);
    render().props.onChange('dog', {x: 15});
    assert.deepEqual(edits.at(-1), ['dog', {x: 15}]);
    assert.equal(edits.length, 8);

    vm.editingTarget = {id: 'stage', isStage: true};
    state.scratchGui.targets.editingTarget = 'stage';
    const stage = render();
    assert.equal(stage.props.targetId, null);
    assert.equal(stage.props.disabled, true);
    stage.props.onChange('stage', {x: 30});
    assert.equal(edits.length, 8);
});
