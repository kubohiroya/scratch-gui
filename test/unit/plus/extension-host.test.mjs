import {test} from 'node:test';
import assert from 'node:assert/strict';

import {isPlusPermissionDenied, startupPlusExtensionHost} from '../../../src/lib/tw-plus-extension-host.js';

const forbidden = () => new Proxy({}, {get () {
    throw new Error('A VM must not be touched when no host installs extension loading');
}});

// Loading a project's extensions is the distributor's implementation now. With none supplied there
// is no loader at all, which is this fork on its own: every project opens the way it does upstream.
test('with no host there is no extension loading, and the VM is not touched', async () => {
    const host = startupPlusExtensionHost(forbidden(), {}, {});
    assert.equal(host.enabled, false);
    assert.equal(await host.dispose(), undefined);
    assert.equal(startupPlusExtensionHost(forbidden(), {}, null).enabled, false);
    // A host that answers with nothing is a host that installed nothing.
    assert.equal(startupPlusExtensionHost(forbidden(), {}, {installExtensionHost: () => null}).enabled, false);
});

test('the host is handed what only this fork has, and nothing it could read itself', async () => {
    const given = [];
    const installed = {enabled: true, dispose: async () => {}};
    const integration = {installExtensionHost (vm, settings) {
        given.push([vm, settings]);
        return installed;
    }};
    const vm = {};
    assert.equal(startupPlusExtensionHost(vm, {search: '', locale: 'en'}, integration), installed);
    const [[subject, settings]] = given;
    assert.equal(subject, vm);
    assert.equal(settings.locale, 'en');
    // The switch and the archive limits: this fork's own Packager wiring reads the same two, so
    // they are defined once here and handed over rather than being read on both sides.
    assert.equal(settings.enabled, true);
    assert.deepEqual(settings.archiveOptions, {maxProjectBytes: 33554432, maxEntryBytes: 33554432});
    // The VM modules the registration needs, as this fork's own instances: central dispatch is a
    // singleton, and a copy resolved anywhere else would not be the one the VM uses.
    assert.deepEqual(Object.keys(settings.vmModules).sort(),
        ['ScratchCommon', 'createTranslate', 'dispatch', 'staticFetch']);
    assert.equal(settings.vmModules.dispatch,
        (await import('scratch-vm/src/dispatch/central-dispatch.js')).default);
    // What the project-error paths read back. The authoring controller the extension library
    // reads back is the host's own now, along with the library tab that reads it.
    assert.equal(typeof settings.markLoadFailure, 'function');
    assert.equal(settings.createAuthoring, undefined);
    assert.equal(settings.setAuthoringHost, undefined);
});

test('the explicit opt-out is handed over as off, and a later URL change cannot turn it on', () => {
    const given = [];
    const integration = {installExtensionHost (vm, settings) {
        given.push(settings);
        return {enabled: settings.enabled, dispose: async () => {}};
    }};
    startupPlusExtensionHost({}, {search: '?twPlusExtensionLoader=0'}, integration);
    assert.equal(given[0].enabled, false);
    startupPlusExtensionHost({}, {search: '?twPlusExtensionLoader=1'}, integration);
    assert.equal(given[1].enabled, true);
    // With no search given the snapshot taken before any project was opened is used, so changing
    // the URL afterwards cannot turn the loader on or off.
    const previous = globalThis.location;
    globalThis.location = {search: '?twPlusExtensionLoader=0'};
    try {
        startupPlusExtensionHost({}, {}, integration);
        assert.equal(given[2].enabled, true);
    } finally {
        if (previous === undefined) delete globalThis.location;
        else globalThis.location = previous;
    }
});

test('a refusal is a refusal, whoever installed the loader', () => {
    assert.equal(isPlusPermissionDenied({code: 'TRUST_DENIED'}), true);
    assert.equal(isPlusPermissionDenied({code: 'CANCELLED'}), true);
    assert.equal(isPlusPermissionDenied({code: 'FETCH_FAILED'}), false);
    assert.equal(isPlusPermissionDenied(null), null);
});
