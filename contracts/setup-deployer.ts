// ============================================================================
// Generate a deployer wallet for Base Sepolia testnet
// Usage: npx tsx contracts/setup-deployer.ts
// ============================================================================

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { writeFileSync, existsSync } from 'fs';

const ENV_FILE = 'contracts/.env.deployer';

async function main() {
  // Check if we already have a deployer
  if (existsSync(ENV_FILE)) {
    console.log('Deployer already exists. Reading from', ENV_FILE);
    const content = (await import('fs')).readFileSync(ENV_FILE, 'utf8');
    const key = content.match(/PRIVATE_KEY=(0x[a-fA-F0-9]+)/)?.[1];
    if (key) {
      const account = privateKeyToAccount(key as `0x${string}`);
      const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
      const balance = await publicClient.getBalance({ address: account.address });
      console.log(`\nAddress:  ${account.address}`);
      console.log(`Balance:  ${Number(balance) / 1e18} ETH on Base Sepolia`);
      if (balance === 0n) {
        console.log(`\nFund this address with Base Sepolia ETH:`);
        console.log(`  https://www.alchemy.com/faucets/base-sepolia`);
        console.log(`  https://faucet.quicknode.com/base/sepolia`);
      } else {
        console.log(`\nReady to deploy! Run:`);
        console.log(`  npx tsx contracts/deploy.ts`);
      }
      return;
    }
  }

  // Generate new deployer
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  console.log('Generated deployer wallet for Base Sepolia testnet');
  console.log(`\nAddress:      ${account.address}`);
  console.log(`Private Key:  saved to ${ENV_FILE} (gitignored)\n`);

  // Save to local file
  writeFileSync(ENV_FILE, `PRIVATE_KEY=${privateKey}\n`);

  console.log('Next steps:');
  console.log(`  1. Get free Base Sepolia ETH from a faucet:`);
  console.log(`     https://www.alchemy.com/faucets/base-sepolia`);
  console.log(`     https://faucet.quicknode.com/base/sepolia`);
  console.log(`     Paste this address: ${account.address}`);
  console.log(`  2. Wait ~10 seconds for ETH to arrive`);
  console.log(`  3. Run: npx tsx contracts/deploy.ts`);
}

main().catch(console.error);
