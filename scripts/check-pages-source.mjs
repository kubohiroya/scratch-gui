import {appendFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export async function checkPagesSource({env = process.env, fetchImpl = fetch} = {}) {
    if (!['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME) || env.GITHUB_REF !== 'refs/heads/develop') {
        throw new Error('Pages must be published from develop by push or workflow_dispatch. ' +
            'Use --ref develop for manual runs.');
    }
    const revision = env.PAGES_REVISION ?? env.GITHUB_SHA;
    if (!/^[a-f0-9]{40}$/.test(revision || '') || revision !== env.GITHUB_SHA) {
        throw new Error('The Pages artifact revision must match the full workflow source SHA.');
    }
    if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY || '') || !env.GH_TOKEN) {
        throw new Error('GITHUB_REPOSITORY and a read-only GH_TOKEN are required to check develop.');
    }
    const api = (env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
    const response = await fetchImpl(`${api}/repos/${env.GITHUB_REPOSITORY}/branches/develop`, {
        headers: {Accept: 'application/vnd.github+json', Authorization: `Bearer ${env.GH_TOKEN}`},
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`Cannot verify develop (HTTP ${response.status}); publishing is stopped.`);
    const latest = (await response.json()).commit?.sha;
    if (latest !== revision) {
        throw new Error('Pages source is no longer the current develop revision. Start a new run with --ref develop.');
    }
    return revision;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    try {
        const revision = await checkPagesSource();
        if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `revision=${revision}\n`);
        console.log(`Pages source verified: develop at ${revision}`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
