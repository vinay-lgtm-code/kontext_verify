// ============================================================================
// Kontext SDK - OFAC SDN Sanctioned Addresses (Shared Data)
// ============================================================================
//
// These addresses are publicly listed on the OFAC Specially Designated
// Nationals (SDN) list maintained by the U.S. Department of the Treasury.
// Source: https://www.treasury.gov/ofac/downloads/sdnlist.txt
// Last updated: 2025-03-21 (Tornado Cash delisted per Fifth Circuit ruling)
//
// NOTE: Tornado Cash smart contract addresses were REMOVED from the SDN list
// on March 21, 2025. However, they are retained here for backward compatibility
// and because the comprehensive OFACSanctionsScreener tracks them as DELISTED
// entries for risk-scoring purposes.
//
// Imported by both UsdcCompliance and OFACAddressProvider.
//

/** Actively sanctioned OFAC SDN addresses */
export const OFAC_SDN_ACTIVE_ADDRESSES: readonly string[] = [
  // Lazarus Group / DPRK (Ronin Bridge hack)
  '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
  '0xa0e1c89Ef1a489c9C7dE96311eD5Ce5D32c20E4B',
  '0x3Cffd56B47B7b41c56258D9C7731ABaDc360E460',
  '0x53b6936513e738f44FB50d2b9476730C0Ab3Bfc1',
  // Lazarus Group - Harmony/Stake.com hacks
  '0x4F47Bc496083C727c5fbe3CE9CDf2B0f6496270c',
  '0x0836222F2B2B24A3F36f98668Ed8F0B38D1a872f',
  // DPRK Cyber Operations
  '0x7F367cC41522cE07553e823bf3be79A889DEbe1B',
  '0x01e2919679362dFBC9ee1644Ba9C6da6D6245BB1',
  '0xc455f7fd3e0e12afd51fba5c106909934d8a0e4a',
  // Garantex exchange (sanctioned April 2022)
  '0x6F1cA141A28907F78Ebaa64f83E4AE6038d3cbe7',
  '0x2f389cE8bD8ff92De3402FFCe4691d17fC4f6535',
  '0x19Aa5Fe80D33a56D56c78e82eA5E50E5d80b4Dff',
  // Blender.io (sanctioned May 2022)
  '0x23773E65ed146A459791799d01336DB287f25334',
  // Roman Semenov (Tornado Cash developer - REMAINS sanctioned)
  '0xdcbEfFBECcE100cCE9E4b153C4e15cB885643193',
  '0x931546D9e66836AbF687d2bc64B30407bAc8C568',
  '0x43fa21d92141BA9db43052492E0DeEE5aa5f0A93',
  // Zedcex / Zedxion (IRGC-linked, sanctioned June 2024)
  '0xaeAAc358560e11f52454D997AAFF2c5731B6f8a6',
];

/** Delisted (formerly sanctioned) addresses — retained for backward compatibility */
export const OFAC_SDN_DELISTED_ADDRESSES: readonly string[] = [
  // Tornado Cash contracts (sanctioned Aug 2022, DELISTED March 21, 2025)
  '0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b',
  '0xd96f2B1c14Db8458374d9Aca76E26c3D18364307',
  '0x4736dCf1b7A3d580672CcE6E7c65cd5cc9cFBfA9',
  '0xDD4c48C0B24039969fC16D1cdF626eaB821d3384',
  '0xd4B88Df4D29F5CedD6857912842cff3b20C8Cfa3',
  '0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF',
  '0xA160cdAB225685dA1d56aa342Ad8841c3b53f291',
  '0xFD8610d20aA15b7B2E3Be39B396a1bC3516c7144',
  '0xF60dD140cFf0706bAE9Cd734Ac3683731B816EeD',
  '0x22aaA7720ddd5388A3c0A3333430953C68f1849b',
  '0xBA214C1c1928a32Bffe790263E38B4Af9bFCD659',
  '0xb1C8094B234DcE6e03f10a5b673c1d8C69739A00',
  '0x527653eA119F3E6a1F5BD18fbF4714081D7B31ce',
  '0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2',  // Tornado Cash Router
  '0x8589427373D6D84E98730D7795D8f6f8731FDA16',  // Tornado Cash
  '0x722122dF12D4e14e13Ac3b6895a86e84145b6967',  // Tornado Cash / Sinbad.io
];

/** All OFAC SDN addresses (active + delisted, for backward compatibility) */
export const OFAC_SDN_ADDRESSES: readonly string[] = [
  ...OFAC_SDN_ACTIVE_ADDRESSES,
  ...OFAC_SDN_DELISTED_ADDRESSES,
];
