// ============================================================================
// Kontext SDK - Known Payment Instrument Issuers
// ============================================================================
//
// Comprehensive reference map of known issuers across all payment rails.
// Used for autocomplete, validation hints, and analytics grouping.
// NOT enforced at runtime — any string value is accepted for instrumentIssuer.
//

export const KNOWN_ISSUERS: Record<string, { category: string; description: string }> = {
  // ---------------------------------------------------------------------------
  // Card-as-a-Service / BaaS Platforms
  // ---------------------------------------------------------------------------
  'marqeta': { category: 'baas', description: 'Card issuing platform (Visa/MC). Powers Square, DoorDash, Uber.' },
  'lithic': { category: 'baas', description: 'Developer-first card issuing. REST API, virtual + physical.' },
  'stripe_issuing': { category: 'baas', description: 'Stripe-native card issuing. Visa/Mastercard.' },
  'highnote': { category: 'baas', description: 'Embedded card issuing, expense management APIs.' },
  'adyen_issuing': { category: 'baas', description: 'European-focused card issuing. PCI DSS L1.' },
  'i2c': { category: 'baas', description: 'White-label issuer-processor. Powers many fintechs.' },
  'galileo': { category: 'baas', description: 'Processing + issuing platform (SoFi).' },
  'unit': { category: 'baas', description: 'Banking-as-a-Service with card issuing.' },
  'bond': { category: 'baas', description: 'Card issuing APIs for platforms (now Payfare).' },
  'deserve': { category: 'baas', description: 'Card-as-a-service with credit decisioning.' },

  // ---------------------------------------------------------------------------
  // Agent-Specific Card Issuers
  // ---------------------------------------------------------------------------
  'ramp': { category: 'agent', description: 'Agent Cards via Visa Intelligent Commerce. Enterprise expense.' },
  'crossmint': { category: 'agent', description: 'Scoped cards from any underlying card + stablecoin onramps.' },
  'lobster': { category: 'agent', description: 'Lobster.cash by Crossmint. Agent card + stablecoin onramp.' },
  'extend': { category: 'agent', description: 'Virtual card delegation from existing corporate cards.' },
  'skyfire': { category: 'agent', description: 'Agent-native payment network. API-first.' },

  // ---------------------------------------------------------------------------
  // Corporate Card Platforms
  // ---------------------------------------------------------------------------
  'brex': { category: 'corporate', description: 'Corporate cards with API-driven controls.' },
  'divvy': { category: 'corporate', description: 'Bill.com expense management with virtual card issuance.' },
  'airbase': { category: 'corporate', description: 'Spend management platform. Virtual cards.' },
  'center': { category: 'corporate', description: 'Real-time expense management.' },
  'navan': { category: 'corporate', description: 'Travel + expense with virtual cards (fka TripActions).' },
  'mesh': { category: 'corporate', description: 'SaaS spend management with virtual cards.' },

  // ---------------------------------------------------------------------------
  // Crypto-Native Card Issuers
  // ---------------------------------------------------------------------------
  'gnosis_pay': { category: 'crypto_card', description: 'On-chain Visa debit. Gnosis Chain settlement.' },
  'holyheld': { category: 'crypto_card', description: 'Crypto-to-card. Spend crypto at Visa merchants.' },
  'baanx': { category: 'crypto_card', description: 'White-label crypto card issuing.' },
  'rain': { category: 'crypto_card', description: 'Corporate cards funded by USDC/stablecoin treasuries.' },
  'coinbase_card': { category: 'crypto_card', description: 'Crypto-backed Visa card.' },

  // ---------------------------------------------------------------------------
  // Network Tokenization Services
  // ---------------------------------------------------------------------------
  'visa_vts': { category: 'network', description: 'Visa Token Service. Network-level PAN tokenization.' },
  'mastercard_mdes': { category: 'network', description: 'Mastercard Digital Enablement Service.' },
  'apple_pay': { category: 'network', description: 'Apple Pay device-level tokenization.' },
  'google_pay': { category: 'network', description: 'Google Pay device-level tokenization.' },

  // ---------------------------------------------------------------------------
  // Blockchain Wallet Issuers
  // ---------------------------------------------------------------------------
  'circle': { category: 'blockchain', description: 'Programmable Wallets. USDC native.' },
  'fireblocks': { category: 'blockchain', description: 'Institutional MPC custody + wallets.' },
  'turnkey': { category: 'blockchain', description: 'Enclave-backed signing (AWS Nitro TEE).' },
  'safe': { category: 'blockchain', description: 'Multi-sig smart contract wallets (Gnosis Safe).' },
  'privy': { category: 'blockchain', description: 'Embedded wallets for apps.' },
  'dynamic': { category: 'blockchain', description: 'Wallet aggregation + embedded wallets.' },
  'coinbase_cdp': { category: 'blockchain', description: 'Coinbase Developer Platform MPC wallets.' },
};
