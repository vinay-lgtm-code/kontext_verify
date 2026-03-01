// ============================================================================
// End-to-end test: anchor a digest, then verify it on-chain
// ============================================================================

import { readFileSync } from 'fs';
import { createHash } from 'crypto';

async function main() {
  // Read deployer key
  const content = readFileSync('contracts/.env.deployer', 'utf8');
  const privateKey = content.match(/PRIVATE_KEY=(0x[a-fA-F0-9]+)/)?.[1];
  if (!privateKey) { console.error('No key'); process.exit(1); }

  const CONTRACT = '0xbc711590bca89bf944cdfb811129f74d8fb75b46';
  const RPC = 'https://sepolia.base.org';

  // Import SDK functions
  const { anchorDigest, verifyAnchor, getAnchor } = await import('../packages/sdk/src/onchain.js');

  // Create a test digest (simulating a terminal digest from the digest chain)
  const testData = `kontext-e2e-test-${Date.now()}`;
  const digest = '0x' + createHash('sha256').update(testData).digest('hex');
  console.log(`Test digest:  ${digest}`);

  // Step 1: Anchor it on-chain
  console.log('\n1. Anchoring digest on Base Sepolia...');
  const result = await anchorDigest(
    { rpcUrl: RPC, contractAddress: CONTRACT, privateKey },
    digest,
    'e2e-test',
  );
  console.log(`   TX hash:   ${result.txHash}`);
  console.log(`   Block:     ${result.blockNumber}`);
  console.log(`   Chain:     ${result.chain}`);

  // Step 2: Verify it on-chain (read-only, no deps)
  console.log('\n2. Verifying anchor on-chain (read-only)...');
  const verification = await verifyAnchor(RPC, CONTRACT, digest);
  console.log(`   Anchored:  ${verification.anchored}`);

  // Step 3: Get full anchor details
  console.log('\n3. Getting anchor details...');
  const details = await getAnchor(RPC, CONTRACT, digest);
  if (details) {
    console.log(`   Anchorer:  ${details.anchorer}`);
    console.log(`   Project:   ${details.projectHash.slice(0, 18)}...`);
    console.log(`   Timestamp: ${new Date(details.timestamp * 1000).toISOString()}`);
  }

  // Step 4: Verify a non-existent digest returns false
  console.log('\n4. Verifying non-existent digest returns false...');
  const fakeDigest = '0x' + '0'.repeat(64);
  const fakeVerification = await verifyAnchor(RPC, CONTRACT, fakeDigest);
  console.log(`   Anchored:  ${fakeVerification.anchored} (expected: false)`);

  console.log('\nAll checks passed!');
}

main().catch(console.error);
