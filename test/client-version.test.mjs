import test from 'node:test';
import assert from 'node:assert/strict';
import { getClientVersion } from '../src/client-version.mjs';
test('Web host does not inspect unrelated desktop applications', async () => {
 const result = await getClientVersion('web', () => { throw new Error('Must not probe'); });
 assert.equal(result.clientVersion, 'Web');
 assert.equal(result.pluginVersion, 'V1.0');
});
test('each desktop query probes again; missing application clears prior version', async () => {
 let calls = 0;
 const probe = async () => ++calls === 1 ? { version: '26.1013.4894.0' } : null;
 assert.equal((await getClientVersion('desktop', probe)).clientVersion, '26.1013.4894.0');
 assert.equal((await getClientVersion('desktop', probe)).clientVersion, 'Error');
 assert.equal(calls, 2);
});
test('unknown platform, failed probe and malformed version return Error', async () => {
 assert.equal((await getClientVersion('unknown', async () => null)).clientVersion, 'Error');
 assert.equal((await getClientVersion('desktop', async () => { throw new Error('denied'); })).clientVersion, 'Error');
 assert.equal((await getClientVersion('desktop', async () => ({ version: 'invalid' }))).clientVersion, 'Error');
});
test('desktop hosts omitting optional platform still probe on each click', async () => {
 let calls=0;
 const probe=async()=>({version: ++calls===1?'26.1013.4894.0':'26.1014.1000.0'});
 assert.equal((await getClientVersion('unknown',probe)).clientVersion,'26.1013.4894.0');
 assert.equal((await getClientVersion('unknown',probe)).clientVersion,'26.1014.1000.0');
 assert.equal(calls,2);
});
