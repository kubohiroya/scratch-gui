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
    // The startup query goes over as it was. What it means — whether loading runs at all — and
    // the limits a project is read with are the host's to decide, so neither is sent from here.
    assert.equal(settings.search, '');
    assert.equal(settings.enabled, undefined);
    assert.equal(settings.archiveOptions, undefined);
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

test('the startup query goes over unread, and a later URL change cannot change it', () => {
    const given = [];
    const integration = {installExtensionHost (vm, settings) {
        given.push(settings);
        return {enabled: true, dispose: async () => {}};
    }};
    startupPlusExtensionHost({}, {search: '?twPlusExtensionLoader=0'}, integration);
    assert.equal(given[0].search, '?twPlusExtensionLoader=0');
    // With no search given, the snapshot taken before any project was opened is used, so changing
    // the URL afterwards changes nothing.
    const previous = globalThis.location;
    globalThis.location = {search: '?twPlusExtensionLoader=0'};
    try {
        startupPlusExtensionHost({}, {}, integration);
        assert.equal(given[1].search, previous === undefined ? '' : previous.search);
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
