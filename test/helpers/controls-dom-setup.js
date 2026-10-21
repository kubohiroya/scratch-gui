// These targeted component tests run in the repository's Node Jest environment.
const {TextDecoder, TextEncoder} = require('util');
global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
const {JSDOM} = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', {url: 'http://localhost/'});
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
afterAll(() => dom.window.close());
