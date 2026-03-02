import { verifyAnchor, getAnchor } from '../packages/sdk/src/onchain.js';

const CONTRACT = '0xbc711590bca89bf944cdfb811129f74d8fb75b46';
const RPC = 'https://sepolia.base.org';

async function main() {
  const digest1 = '0x7ee908298546f30007b92c3fe3b5ba33b4a9caeb349b323a7d11ea17766c1796';
  const digest2 = '0x752ee0d05a7f49ac0273479425a0dfc6b6b727805c2371ef7ed26d50b1733a3d';

  const r1 = await verifyAnchor(RPC, CONTRACT, digest1);
  console.log('Digest 1 anchored:', r1.anchored);

  const r2 = await verifyAnchor(RPC, CONTRACT, digest2);
  console.log('Digest 2 anchored:', r2.anchored);

  const d1 = await getAnchor(RPC, CONTRACT, digest1);
  console.log('Digest 1 details:', d1);
}

main().catch(console.error);
