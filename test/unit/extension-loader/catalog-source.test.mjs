import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG_URL, loadPlusCatalog} from '../../../src/lib/tw-plus-catalog-source.js';

const catalog = () => ({schemaVersion: 1, extensions: [{id: 'sample', name: 'TurboWarp-Sample', version: '1.0.0',
    package: '@kubohiroya/turbowarp-sample', url: 'https://example.test/sample.js', dependencies: [],
    banner: 'https://example.test/sample.svg', unsandboxed: 'optional'}]});
const svg = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64')}`;

test('ordinary catalog loading retains the fixed HTTPS source and the host request signal', async () => {
    const signal = new AbortController().signal;
    const expected = [{id: 'from-https'}];
    let calls = 0;
    assert.equal(await loadPlusCatalog(signal, {localCatalog: null,
        async fetchCatalog(url, received) {
            calls++;
            assert.equal(url, CATALOG_URL);
            assert.equal(received, signal);
            return expected;
        }}), expected);
    assert.equal(calls, 1);
});

test('explicit host preview changes only displayed icon bytes after shared catalog validation', async () => {
    const source = catalog();
    const before = JSON.stringify(source);
    const entries = await loadPlusCatalog(undefined, {localCatalog: {catalog: source, icons: {sample: svg}},
        fetchCatalog() { throw new Error('No remote replacement is needed'); }});
    assert.equal(entries[0].metadata.name, 'TurboWarp-Sample');
    assert.equal(entries[0].metadata.banner, svg);
    assert.equal(entries[0].url, source.extensions[0].url);
    assert.equal(entries[0].metadata.version, source.extensions[0].version);
    assert.deepEqual(entries[0].dependencies, source.extensions[0].dependencies);
    assert.equal(JSON.stringify(source), before);
});

test('a local presentation preview never permits HTTP extension code or arbitrary image schemes', async () => {
    const unsafe = catalog();
    unsafe.extensions[0].url = 'http://127.0.0.1/untrusted.js';
    await assert.rejects(loadPlusCatalog(undefined, {localCatalog: {catalog: unsafe, icons: {sample: svg}}}), /HTTPS/);
    for (const icons of [{unknown: svg}, {sample: 'javascript:alert(1)'}, {sample: 'data:text/html;base64,PHNjcmlwdD4='}]) {
        await assert.rejects(loadPlusCatalog(undefined, {localCatalog: {catalog: catalog(), icons}}), /Invalid host preview icon/);
    }
});

test('cancelled local previews cannot replace a catalog after its owner closes', async () => {
    const controller = new AbortController();
    const pending = loadPlusCatalog(controller.signal, {localCatalog: {catalog: catalog(), icons: {}}});
    controller.abort();
    await assert.rejects(pending, {code: 'CANCELLED'});
    await assert.rejects(loadPlusCatalog(controller.signal, {localCatalog: {catalog: catalog()}}), {code: 'CANCELLED'});
});
