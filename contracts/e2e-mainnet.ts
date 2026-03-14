// ============================================================================
// First mainnet anchor: anchor a real digest on Base mainnet, then verify it
// ============================================================================

import { readFileSync } from 'fs';
import { createHash } from 'crypto';

async function main() {
  // Read deployer key
  const content = readFileSync('contracts/.env.deployer', 'utf8');
  const privateKey = content.match(/PRIVATE_KEY=(0x[a-fA-F0-9]+)/)?.[1];
  if (!privateKey) { console.error('No key'); process.exit(1); }

  const CONTRACT = '0x89725bc547c5e38f0c2a56758723514acf411a86';
  const RPC = 'https://mainnet.base.org';

  // Import SDK functions
  const { anchorDigest, verifyAnchor, getAnchor } = await import('../packages/sdk/src/onchain.js');

  // Create a meaningful first digest — represents Kontext's genesis anchor
  const genesisData = 'kontext-genesis-anchor-base-mainnet-2026-03-13';
  const digest = '0x' + createHash('sha256').update(genesisData).digest('hex');
  console.log(`Genesis digest: ${digest}`);
  console.log(`Source data:    "${genesisData}"`);

  // Step 1: Anchor it on-chain
  console.log('\n1. Anchoring genesis digest on Base mainnet...');
  const result = await anchorDigest(
    { rpcUrl: RPC, contractAddress: CONTRACT, privateKey },
    digest,
    'kontext-sdk',
  );
  console.log(`   TX hash:   ${result.txHash}`);
  console.log(`   Block:     ${result.blockNumber}`);
  console.log(`   Chain:     ${result.chain}`);
  console.log(`   Basescan:  https://basescan.org/tx/${result.txHash}`);

  // Step 2: Verify it on-chain (read-only, no deps)
  console.log('\n2. Verifying anchor on-chain (read-only)...');
  const verification = await verifyAnchor(RPC, CONTRACT, digest);
  console.log(`   Anchored:  ${verification.anchored}`);

  // Step 3: Get full anchor details
  console.log('\n3. Getting anchor details...');
  const details = await getAnchor(RPC, CONTRACT, digest);
  if (details) {
    console.log(`   Anchorer:  ${details.anchorer}`);
    console.log(`   Project:   ${details.projectHash}`);
    console.log(`   Timestamp: ${new Date(details.timestamp * 1000).toISOString()}`);
  }

  // Step 4: Verify a non-existent digest returns false
  console.log('\n4. Verifying non-existent digest returns false...');
  const fakeDigest = '0x' + '0'.repeat(64);
  const fakeVerification = await verifyAnchor(RPC, CONTRACT, fakeDigest);
  console.log(`   Anchored:  ${fakeVerification.anchored} (expected: false)`);

  console.log('\n=== Genesis anchor complete! ===');
  console.log(`Contract (verified): https://basescan.org/address/${CONTRACT}#code`);
  console.log(`Anchor TX:           https://basescan.org/tx/${result.txHash}`);
}

main().catch(console.error);
