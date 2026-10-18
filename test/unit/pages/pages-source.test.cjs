const assert = require('node:assert/strict');
const {test} = require('node:test');
const {mkdtemp, readFile, writeFile, rm} = require('node:fs/promises');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const path = require('node:path');
const os = require('node:os');
const {pathToFileURL} = require('node:url');

const revision = 'a'.repeat(40);
const newer = 'b'.repeat(40);
const environment = {
    GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/develop',
    GITHUB_SHA: revision, GITHUB_REPOSITORY: 'example/editor', GH_TOKEN: 'test-read-token'
};
const guard = import('../../../scripts/check-pages-source.mjs');
const ok = sha => ({ok: true, json: async () => ({commit: {sha}})});

test('develop push and manual runs at the latest full SHA are accepted', async () => {
    const {checkPagesSource} = await guard;
    const calls = [];
    for (const event of ['push', 'workflow_dispatch']) {
        assert.equal(await checkPagesSource({env: {...environment, GITHUB_EVENT_NAME: event},
            fetchImpl: async (...args) => {
                calls.push(args);
                return ok(revision);
            }}), revision);
    }
    assert.equal(calls.length, 2);
    for (const [url, options] of calls) {
        assert.equal(url, 'https://api.github.com/repos/example/editor/branches/develop');
        assert.equal(options.headers.Authorization, 'Bearer test-read-token');
    }
});

test('other events, branches and tags are rejected before accessing GitHub', async () => {
    const {checkPagesSource} = await guard;
    for (const override of [
        {GITHUB_EVENT_NAME: 'pull_request'}, {GITHUB_EVENT_NAME: 'workflow_run'},
        {GITHUB_EVENT_NAME: 'schedule'}, {GITHUB_REF: 'refs/heads/feat/site/github-pages'},
        {GITHUB_REF: 'refs/tags/develop'},
        {GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/develop-other'},
        {GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/tags/develop'}
    ]) {
        await assert.rejects(checkPagesSource({env: {...environment, ...override}, fetchImpl: () => {
            assert.fail('Invalid source must not access GitHub');
        }}), /from develop by push or workflow_dispatch/);
    }
});

test('missing, abbreviated or mismatched artifact SHAs cannot be published', async () => {
    const {checkPagesSource} = await guard;
    for (const override of [
        {GITHUB_SHA: ''}, {GITHUB_SHA: 'a'.repeat(7)}, {GITHUB_SHA: 'z'.repeat(40)},
        {PAGES_REVISION: ''}, {PAGES_REVISION: newer}
    ]) {
        await assert.rejects(checkPagesSource({env: {...environment, ...override}, fetchImpl: () => {
            assert.fail('Invalid artifact must not access GitHub');
        }}), /full workflow source SHA/);
    }
});

test('stale push and manual runs fail, including after a successful build check', async () => {
    const {checkPagesSource} = await guard;
    for (const event of ['push', 'workflow_dispatch']) {
        const env = {...environment, GITHUB_EVENT_NAME: event};
        let latest = revision;
        const fetchImpl = async () => ok(latest);
        const artifact = await checkPagesSource({env, fetchImpl});
        latest = newer;
        await assert.rejects(checkPagesSource({env, fetchImpl}), /no longer the current develop/);
        await assert.rejects(checkPagesSource({env: {...env, PAGES_REVISION: artifact}, fetchImpl}),
            /Start a new run/);
    }
});

test('API failures, missing branch data and network failures stop publication', async () => {
    const {checkPagesSource} = await guard;
    for (const status of [403, 404, 429, 500]) {
        await assert.rejects(checkPagesSource({env: environment,
            fetchImpl: async () => ({ok: false, status})}), new RegExp(`HTTP ${status}`));
    }
    await assert.rejects(checkPagesSource({env: environment,
        fetchImpl: async () => ({ok: true, json: async () => ({})})}), /no longer the current develop/);
    await assert.rejects(checkPagesSource({env: environment,
        fetchImpl: async () => { throw new Error('Network unavailable'); }}), /Network unavailable/);
});

test('missing credentials or repository stop publication before a request', async () => {
    const {checkPagesSource} = await guard;
    for (const override of [{GH_TOKEN: ''}, {GITHUB_REPOSITORY: ''}]) {
        await assert.rejects(checkPagesSource({env: {...environment, ...override}, fetchImpl: () => {
            assert.fail('Incomplete configuration must not access GitHub');
        }}), /read-only GH_TOKEN/);
    }
});

test('CLI emits the exact verified SHA and exits unsuccessfully for a stale run without emitting it', async t => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'pages-source-'));
    t.after(() => rm(directory, {recursive: true, force: true}));
    const preload = path.join(directory, 'github-response.mjs');
    await writeFile(preload, `globalThis.fetch = async () => ({ok: true,
        json: async () => ({commit: {sha: process.env.TEST_LATEST_REVISION}})});`);
    const output = path.join(directory, 'github-output');
    const env = {...process.env, ...environment, PAGES_REVISION: revision,
        TEST_LATEST_REVISION: revision, GITHUB_OUTPUT: output};
    const run = () => promisify(execFile)(process.execPath,
        ['--import', pathToFileURL(preload).href,
            path.resolve(__dirname, '../../../scripts/check-pages-source.mjs')], {env});
    const result = await run();
    assert.equal(await readFile(output, 'utf8'), `revision=${revision}\n`);
    assert.ok(!result.stdout.includes(environment.GH_TOKEN));
    env.TEST_LATEST_REVISION = newer;
    await assert.rejects(run(), error => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /Start a new run/);
        assert.ok(!error.stdout.includes(revision));
        return true;
    });
    assert.equal(await readFile(output, 'utf8'), `revision=${revision}\n`);
});
