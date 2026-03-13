// ============================================================================
// Kontext SDK - Stablecoin Contract Registry
// ============================================================================
// Static lookup table of known stablecoin contract addresses across EVM chains.
// Used by the viem interceptor and wallet monitor for O(1) detection of
// stablecoin transfers.

import type { Chain, Token } from '../../types.js';

export interface StablecoinContractInfo {
  token: Token;
  chain: Chain;
  decimals: number;
}

/**
 * Known stablecoin contract addresses indexed by lowercased address.
 * Used for O(1) detection of whether a transaction targets a stablecoin.
 */
export const STABLECOIN_CONTRACTS: Record<string, StablecoinContractInfo> = {
  // USDC (6 decimals)
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { token: 'USDC', chain: 'ethereum', decimals: 6 },
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { token: 'USDC', chain: 'base', decimals: 6 },
  '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': { token: 'USDC', chain: 'polygon', decimals: 6 },
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': { token: 'USDC', chain: 'arbitrum', decimals: 6 },
  '0x0b2c639c533813f4aa9d7837caf62653d097ff85': { token: 'USDC', chain: 'optimism', decimals: 6 },
  '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e': { token: 'USDC', chain: 'avalanche', decimals: 6 },

  // USDT (6 decimals)
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { token: 'USDT', chain: 'ethereum', decimals: 6 },
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': { token: 'USDT', chain: 'arbitrum', decimals: 6 },
  '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': { token: 'USDT', chain: 'optimism', decimals: 6 },
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': { token: 'USDT', chain: 'polygon', decimals: 6 },

  // DAI (18 decimals)
  '0x6b175474e89094c44da98b954eedeac495271d0f': { token: 'DAI', chain: 'ethereum', decimals: 18 },
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { token: 'DAI', chain: 'base', decimals: 18 },

  // EURC (6 decimals)
  '0x1abaea1f7c830bd89acc67ec4af516284b1bc33c': { token: 'EURC', chain: 'ethereum', decimals: 6 },
  '0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42': { token: 'EURC', chain: 'base', decimals: 6 },
};

/** Pre-built Set for O(1) contract address lookups */
export const KNOWN_STABLECOIN_ADDRESSES = new Set(Object.keys(STABLECOIN_CONTRACTS));

/**
 * Maps viem chain IDs to Kontext Chain strings.
 */
export const CHAIN_ID_MAP: Record<number, Chain> = {
  1: 'ethereum',
  8453: 'base',
  137: 'polygon',
  42161: 'arbitrum',
  10: 'optimism',
  43114: 'avalanche',
};

/** ERC-20 transfer(address,uint256) function selector */
export const TRANSFER_SELECTOR = '0xa9059cbb';

/** ERC-20 transferFrom(address,address,uint256) function selector */
export const TRANSFER_FROM_SELECTOR = '0x23b872dd';

/** ERC-20 Transfer event signature for watchEvent filtering */
export const TRANSFER_EVENT_ABI = {
  type: 'event' as const,
  name: 'Transfer',
  inputs: [
    { type: 'address', name: 'from', indexed: true },
    { type: 'address', name: 'to', indexed: true },
    { type: 'uint256', name: 'value', indexed: false },
  ],
};
