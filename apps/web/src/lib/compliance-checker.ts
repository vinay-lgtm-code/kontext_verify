// Browser-safe compliance checker extracted from packages/sdk/src/integrations/usdc.ts
// No Node.js imports (fs, path, crypto). Pure logic only.
// Supports both crypto (address) and fiat (entity name) screening modes.

import { matchEntityName } from "./data/ofac-entity-names";

type Severity = "low" | "medium" | "high" | "critical";

export type ScreeningMode = "address" | "entity_name";

export interface ComplianceCheck {
  name: string;
  passed: boolean;
  description: string;
  severity: Severity;
}

export interface ComplianceResult {
  compliant: boolean;
  checks: ComplianceCheck[];
  riskLevel: Severity;
  recommendations: string[];
  screeningMode: ScreeningMode;
  listsChecked: string[];
}

export interface ComplianceInput {
  from: string;
  to: string;
  amount: string;
  chain?: string;
  token?: string;
  currency?: string;
  paymentMethod?: string;
}

const USDC_CONTRACTS: Record<string, string> = {
  ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  optimism: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  arc: "0xa0c0000000000000000000000000000000000001",
  avalanche: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  solana: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

// OFAC sanctioned addresses (from U.S. Treasury SDN List)
const SANCTIONED_ADDRESSES: string[] = [
  "0x098B716B8Aaf21512996dC57EB0615e2383E2f96",
  "0xa0e1c89Ef1a489c9C7dE96311eD5Ce5D32c20E4B",
  "0x3Cffd56B47B7b41c56258D9C7731ABaDc360E460",
  "0x53b6936513e738f44FB50d2b9476730C0Ab3Bfc1",
  "0x4F47Bc496083C727c5fbe3CE9CDf2B0f6496270c",
  "0x0836222F2B2B24A3F36f98668Ed8F0B38D1a872f",
  "0x7F367cC41522cE07553e823bf3be79A889DEbe1B",
  "0x01e2919679362dFBC9ee1644Ba9C6da6D6245BB1",
  "0xc455f7fd3e0e12afd51fba5c106909934d8a0e4a",
  "0x6F1cA141A28907F78Ebaa64f83E4AE6038d3cbe7",
  "0x2f389cE8bD8ff92De3402FFCe4691d17fC4f6535",
  "0x19Aa5Fe80D33a56D56c78e82eA5E50E5d80b4Dff",
  "0x23773E65ed146A459791799d01336DB287f25334",
  "0xdcbEfFBECcE100cCE9E4b153C4e15cB885643193",
  "0x931546D9e66836AbF687d2bc64B30407bAc8C568",
  "0x43fa21d92141BA9db43052492E0DeEE5aa5f0A93",
  "0xaeAAc358560e11f52454D997AAFF2c5731B6f8a6",
  "0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b",
  "0xd96f2B1c14Db8458374d9Aca76E26c3D18364307",
  "0x4736dCf1b7A3d580672CcE6E7c65cd5cc9cFBfA9",
  "0xDD4c48C0B24039969fC16D1cdF626eaB821d3384",
  "0xd4B88Df4D29F5CedD6857912842cff3b20C8Cfa3",
  "0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF",
  "0xA160cdAB225685dA1d56aa342Ad8841c3b53f291",
  "0xFD8610d20aA15b7B2E3Be39B396a1bC3516c7144",
  "0xF60dD140cFf0706bAE9Cd734Ac3683731B816EeD",
  "0x22aaA7720ddd5388A3c0A3333430953C68f1849b",
  "0xBA214C1c1928a32Bffe790263E38B4Af9bFCD659",
  "0xb1C8094B234DcE6e03f10a5b673c1d8C69739A00",
  "0x527653eA119F3E6a1F5BD18fbF4714081D7B31ce",
  "0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2",
  "0x8589427373D6D84E98730D7795D8f6f8731FDA16",
  "0x722122dF12D4e14e13Ac3b6895a86e84145b6967",
];

const SANCTIONED_SET = new Set(
  SANCTIONED_ADDRESSES.map((a) => a.toLowerCase()),
);

const EDD_THRESHOLD = 3000;
const REPORTING_THRESHOLD = 10000;
const LARGE_TX_THRESHOLD = 50000;

/** Detect whether a query is a blockchain address */
export function isBlockchainAddress(query: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(query.trim());
}

function checkAddressFormat(
  address: string,
  label: string,
): ComplianceCheck {
  const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
  return {
    name: `address_format_${label}`,
    passed: isValid,
    description: isValid
      ? `${label} address format is valid`
      : `${label} address format is invalid`,
    severity: isValid ? "low" : "high",
  };
}

function checkSanctions(address: string, label: string): ComplianceCheck {
  const sanctioned = SANCTIONED_SET.has(address.toLowerCase());
  return {
    name: `sanctions_${label}`,
    passed: !sanctioned,
    description: sanctioned
      ? `${label} address matches OFAC SDN sanctioned address`
      : `${label} address passed sanctions screening`,
    severity: sanctioned ? "critical" : "low",
  };
}

function checkEntitySanctions(
  name: string,
  label: string,
): ComplianceCheck {
  const match = matchEntityName(name);
  return {
    name: `sanctions_${label}`,
    passed: !match,
    description: match
      ? `${label} matches OFAC SDN sanctioned entity: ${match}`
      : `${label} passed entity name screening`,
    severity: match ? "critical" : "low",
  };
}

function checkAmount(amount: string): ComplianceCheck {
  const parsed = parseFloat(amount);
  const isValid = !isNaN(parsed) && parsed > 0;
  return {
    name: "amount_valid",
    passed: isValid,
    description: isValid
      ? `Transaction amount ${amount} is valid`
      : `Transaction amount ${amount} is invalid`,
    severity: isValid ? "low" : "critical",
  };
}

function checkChain(chain: string): ComplianceCheck {
  const supported = chain in USDC_CONTRACTS;
  return {
    name: "chain_support",
    passed: supported,
    description: supported
      ? `Chain ${chain} is supported for USDC compliance monitoring`
      : `Chain ${chain} is not supported`,
    severity: supported ? "low" : "medium",
  };
}

function checkToken(token: string): ComplianceCheck {
  const isUsdc = token === "USDC";
  return {
    name: "token_type",
    passed: isUsdc,
    description: isUsdc
      ? "Transaction token is USDC"
      : `Expected USDC but got ${token}`,
    severity: isUsdc ? "low" : "high",
  };
}

const SUPPORTED_CURRENCIES = [
  "USD", "EUR", "GBP", "AED", "INR", "SGD",
  "HKD", "KRW", "MYR", "THB", "NZD",
];

function checkCurrency(currency: string): ComplianceCheck {
  const supported = SUPPORTED_CURRENCIES.includes(currency);
  return {
    name: "currency_support",
    passed: supported,
    description: supported
      ? `Currency ${currency} is supported for compliance monitoring`
      : `Currency ${currency} is not recognized`,
    severity: supported ? "low" : "medium",
  };
}

function checkEDD(amount: string): ComplianceCheck {
  const parsed = parseFloat(amount);
  const requiresEdd = !isNaN(parsed) && parsed >= EDD_THRESHOLD;
  return {
    name: "enhanced_due_diligence",
    passed: true,
    description: requiresEdd
      ? `Amount $${amount} requires enhanced due diligence (>= $${EDD_THRESHOLD})`
      : `Amount $${amount} is below EDD threshold`,
    severity: requiresEdd ? "medium" : "low",
  };
}

function checkReporting(amount: string): ComplianceCheck {
  const parsed = parseFloat(amount);
  const isLarge = !isNaN(parsed) && parsed >= LARGE_TX_THRESHOLD;
  const requiresReporting = !isNaN(parsed) && parsed >= REPORTING_THRESHOLD;

  if (isLarge) {
    return {
      name: "reporting_threshold",
      passed: true,
      description: `Amount $${amount} is a large transaction (>= $${LARGE_TX_THRESHOLD})`,
      severity: "high",
    };
  }
  if (requiresReporting) {
    return {
      name: "reporting_threshold",
      passed: true,
      description: `Amount $${amount} meets CTR reporting threshold (>= $${REPORTING_THRESHOLD})`,
      severity: "medium",
    };
  }
  return {
    name: "reporting_threshold",
    passed: true,
    description: `Amount $${amount} is below reporting threshold`,
    severity: "low",
  };
}

function generateRecommendations(
  checks: ComplianceCheck[],
  amount: number,
): string[] {
  const recs: string[] = [];

  const sanctionsFailed = checks.some(
    (c) => c.name.startsWith("sanctions_") && !c.passed,
  );
  if (sanctionsFailed) {
    recs.push(
      "BLOCK: Matches OFAC SDN sanctioned entity. Transaction is prohibited under U.S. law.",
    );
  }

  const criticalFailed = checks.some(
    (c) => !c.passed && c.severity === "critical",
  );
  if (criticalFailed && !sanctionsFailed) {
    recs.push("BLOCK: Critical compliance check failures detected.");
  }

  if (!isNaN(amount)) {
    if (amount >= LARGE_TX_THRESHOLD) {
      recs.push("Require manual review for large transaction.");
      recs.push("Verify recipient identity through KYC process.");
    } else if (amount >= REPORTING_THRESHOLD) {
      recs.push("Generate Currency Transaction Report (CTR) per BSA requirements.");
    } else if (amount >= EDD_THRESHOLD) {
      recs.push("Enhanced due diligence recommended.");
    }
  }

  if (recs.length === 0) {
    recs.push("Transaction passes all compliance checks. Safe to proceed.");
  }

  return recs;
}

export function checkCompliance(input: ComplianceInput): ComplianceResult {
  const checks: ComplianceCheck[] = [];
  const listsChecked: string[] = ["OFAC_SDN"];

  // Auto-detect screening mode per field
  const fromIsAddress = isBlockchainAddress(input.from);
  const toIsAddress = isBlockchainAddress(input.to);
  const isCryptoMode = !!(input.chain || input.token);

  // Determine overall screening mode for display
  const screeningMode: ScreeningMode =
    fromIsAddress || toIsAddress ? "address" : "entity_name";

  // Chain and token checks only in crypto mode
  if (isCryptoMode) {
    if (input.token) checks.push(checkToken(input.token));
    if (input.chain) checks.push(checkChain(input.chain));
  }

  // Currency check in fiat mode
  if (input.currency) {
    checks.push(checkCurrency(input.currency));
  }

  // Per-field screening: address format + sanctions for addresses, entity sanctions for names
  if (fromIsAddress) {
    checks.push(checkAddressFormat(input.from, "sender"));
    checks.push(checkSanctions(input.from, "sender"));
  } else if (input.from.trim()) {
    checks.push(checkEntitySanctions(input.from, "sender"));
  }

  if (toIsAddress) {
    checks.push(checkAddressFormat(input.to, "recipient"));
    checks.push(checkSanctions(input.to, "recipient"));
  } else if (input.to.trim()) {
    checks.push(checkEntitySanctions(input.to, "recipient"));
  }

  checks.push(checkAmount(input.amount));
  checks.push(checkEDD(input.amount));
  checks.push(checkReporting(input.amount));

  const failedChecks = checks.filter((c) => !c.passed);
  const compliant = failedChecks.every((c) => c.severity === "low");

  const severityOrder: Severity[] = ["low", "medium", "high", "critical"];
  const riskLevel = failedChecks.reduce<Severity>((max, c) => {
    return severityOrder.indexOf(c.severity) > severityOrder.indexOf(max)
      ? c.severity
      : max;
  }, "low");

  // Also factor in informational severity for risk level
  const allSeverities = checks.map((c) => c.severity);
  const highestOverall = allSeverities.reduce<Severity>((max, s) => {
    return severityOrder.indexOf(s) > severityOrder.indexOf(max) ? s : max;
  }, "low");

  const amount = parseFloat(input.amount);
  const recommendations = generateRecommendations(checks, amount);

  return {
    compliant,
    checks,
    riskLevel: compliant ? highestOverall : riskLevel,
    recommendations,
    screeningMode,
    listsChecked,
  };
}
