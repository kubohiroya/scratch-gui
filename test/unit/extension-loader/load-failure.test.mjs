/* global AggregateError */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    describeExtensionLoadFailure, isExtensionLoadFailure, markExtensionLoadFailure
} from '../../../src/lib/tw-plus-extension-load-failure.js';

test('marking keeps the original error and wraps values that are not objects', () => {
    const error = new Error('failed');
    assert.equal(markExtensionLoadFailure(error), error);
    assert.equal(isExtensionLoadFailure(error), true);
    assert.equal(isExtensionLoadFailure(new Error('other')), false);
    assert.equal(isExtensionLoadFailure(null), false);
    const wrapped = markExtensionLoadFailure('worker failed');
    assert.equal(wrapped.message, 'worker failed');
    assert.equal(isExtensionLoadFailure(wrapped), true);
});

test('the description names the extension and every cause', () => {
    const cause = Object.assign(new Error('Sandbox extension did not register'),
        {code: 'REGISTRATION_TIMEOUT', extensionId: 'kubohiroyaassetcache'});
    const error = Object.assign(new Error('Extension load failed', {cause}),
        {name: 'LoaderError', code: 'LOAD_FAILED'});
    const described = describeExtensionLoadFailure(error);
    assert.equal(described.message, [
        'Extension kubohiroyaassetcache could not be loaded, so the project was not opened.',
        'LoaderError: Extension load failed [LOAD_FAILED]',
        '  Error: Sandbox extension did not register [REGISTRATION_TIMEOUT]'
    ].join('\n'));
    assert.equal(described.cause, error);
    assert.equal(described.stack, error.stack);
});

test('the description covers aggregate failures, unnamed extensions and cyclic causes', () => {
    const first = new Error('rollback failed');
    const error = new AggregateError([new Error('load failed'), first], 'Host could not restore registration state');
    first.cause = error;
    assert.equal(describeExtensionLoadFailure(error).message, [
        'An extension could not be loaded, so the project was not opened.',
        'AggregateError: Host could not restore registration state',
        '  Error: load failed',
        '  Error: rollback failed'
    ].join('\n'));
});
