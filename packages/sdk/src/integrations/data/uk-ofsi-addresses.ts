// ============================================================================
// Kontext SDK - UK OFSI Sanctioned Crypto Addresses
// ============================================================================
//
// Cryptocurrency addresses from the UK Office of Financial Sanctions
// Implementation (OFSI) Consolidated List.
//
// Source: https://www.gov.uk/government/publications/financial-sanctions-consolidated-list-of-targets
// License: Open Government Licence (OGL)
//
// NOTE: The UK OFSI list has limited crypto address coverage compared to OFAC.
// Most UK sanctions are entity-name-based. For comprehensive UK entity screening,
// use OpenSanctionsProvider which includes the full OFSI list.
//

/** UK OFSI sanctioned crypto addresses (curated from public OFSI Consolidated List) */
export const UK_OFSI_ADDRESSES: readonly string[] = [
  // Garantex (designated under Russia sanctions regime, May 2024)
  '0x6F1cA141A28907F78Ebaa64f83E4AE6038d3cbe7',
  // Lazarus Group / DPRK (overlaps with OFAC SDN but independently listed by OFSI)
  '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
  '0xa0e1c89Ef1a489c9C7dE96311eD5Ce5D32c20E4B',
  '0x3Cffd56B47B7b41c56258D9C7731ABaDc360E460',
  '0x53b6936513e738f44FB50d2b9476730C0Ab3Bfc1',
  // DPRK-linked addresses (OFSI cyber programme)
  '0x7F367cC41522cE07553e823bf3be79A889DEbe1B',
  '0x01e2919679362dFBC9ee1644Ba9C6da6D6245BB1',
];
