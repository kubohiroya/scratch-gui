import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isExtensionLoaderEnabled} from '../../../src/config/extension-loader-flag.js';

test('normal startup enables extension features and only supported flag values override it', () => {
    for (const search of ['', '?lang=ja', '?twPlusExtensions=1', '?twPlusExtensionLoader=1']) {
        assert.equal(isExtensionLoaderEnabled(search), true, search);
    }
    for (const value of ['0', 'true', 'false', '', '2']) {
        assert.equal(isExtensionLoaderEnabled(`?twPlusExtensionLoader=${value}`), false, value);
    }
});
