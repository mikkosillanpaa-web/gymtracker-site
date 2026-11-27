import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const action = process.argv[2];
const account = process.env.CLOUDFLARE_ACCOUNT_ID ?? '';
const token = process.env.CLOUDFLARE_API_TOKEN ?? '';
const commit = process.env.GITHUB_SHA ?? '';
const worker = 'gymtracker-site';
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;

assert.match(account, /^[a-f0-9]{32}$/, 'Cloudflare account is missing or invalid');
assert.ok(token.trim(), 'Cloudflare deploy token is missing');
assert.match(commit, /^[a-f0-9]{40}$/, 'GitHub commit is missing or invalid');
assert.ok(action === 'before' || action === 'after', 'Provide before or after');

const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${worker}/deployments`,
  { headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(15_000) },
);
assert.ok(response.ok, `Cloudflare deployment lookup returned HTTP ${response.status}`);
const deployments = await response.json();
const active = deployments.result?.deployments?.[0];
assert.ok(deployments.success && active?.versions?.length === 1, 'Expected one active deployment version');
const version = active.versions[0];
assert.ok(uuid.test(version.version_id) && version.percentage === 100, 'Expected one version serving all traffic');

if (action === 'before') {
  console.log(version.version_id);
} else {
  const receipt = (await readFile(process.env.WRANGLER_OUTPUT_FILE_PATH, 'utf8'))
    .trim().split(/\r?\n/).map(line => JSON.parse(line)).filter(entry => entry.type === 'deploy');
  assert.equal(receipt.length, 1, 'Expected one Wrangler receipt');
  assert.equal(receipt[0].worker_name, worker);
  assert.equal(receipt[0].version_id, version.version_id, 'Active Worker version differs from the receipt');
  assert.equal(active.annotations?.['workers/message'], `GitHub ${commit}`, 'Active deployment commit differs');
  console.log(`Verified commit \`${commit}\` and Cloudflare version \`${version.version_id}\` at 100% traffic.`);
}
