// Bundled OFAC SDN entity names for browser-side demo screening.
// ~200 high-profile sanctioned entities from major sanctions programs.
// Used for substring matching in the playground — not for production use.
// Production entity screening should use OpenSanctionsProvider or OFACSanctionsScreener.

export const OFAC_ENTITY_NAMES: string[] = [
  // North Korea (DPRK)
  "Lazarus Group",
  "Korea Mining Development Trading Corporation",
  "Korea Kwangson Banking Corporation",
  "Reconnaissance General Bureau",
  "Korea Ryonbong General Corporation",
  "Green Pine Associated Corporation",
  "Korea Hyoksin Trading Corporation",
  "Korea Tangun Trading Corporation",
  "Mansudae Overseas Projects Group of Companies",
  "Korea National Insurance Corporation",
  "Korea United Development Bank",
  "Daedong Credit Bank",
  "Foreign Trade Bank of the Democratic People's Republic of Korea",
  "Ocean Maritime Management Company",
  "Korea Ocean Shipping Agency",
  "Chongchongang Shipping Company",
  "Korea Heungjin Trading Company",
  "Paekho Trading Corporation",
  "Korea Kumsan Trading Corporation",

  // Iran
  "Islamic Revolutionary Guard Corps",
  "Central Bank of Iran",
  "National Iranian Oil Company",
  "National Iranian Tanker Company",
  "Bank Mellat",
  "Bank Saderat Iran",
  "Bank Melli Iran",
  "Bank Sepah",
  "Parsian Bank",
  "Bank Tejarat",
  "Bank Refah Kargaran",
  "Export Development Bank of Iran",
  "Iranian Mines and Mining Industries Development and Renovation Organization",
  "Iran Electronics Industries",
  "Khatam al-Anbiya Construction Headquarters",
  "Mahan Air",
  "Meraj Air",
  "Islamic Republic of Iran Shipping Lines",
  "South Shipping Line Iran",
  "National Iranian Gas Company",
  "Quds Force",
  "Basij Resistance Force",
  "Ministry of Intelligence and Security",

  // Russia
  "Sberbank of Russia",
  "VTB Bank",
  "Gazprombank",
  "Alfa-Bank",
  "Rosbank",
  "Bank Rossiya",
  "Promsvyazbank",
  "Vnesheconombank",
  "Russian Direct Investment Fund",
  "Rosneft",
  "Gazprom",
  "Lukoil",
  "Surgutneftegas",
  "Transneft",
  "Russian Agricultural Bank",
  "Novikombank",
  "Sovcombank",
  "Russian National Commercial Bank",
  "Wagner Group",
  "Internet Research Agency",
  "Concord Management and Consulting",
  "United Aircraft Corporation",
  "United Shipbuilding Corporation",
  "Rostec",
  "Almaz-Antey",
  "Tactical Missiles Corporation",
  "Kalashnikov Concern",
  "Russian Copper Company",
  "Severstal",
  "Evraz",

  // Syria
  "Central Bank of Syria",
  "Commercial Bank of Syria",
  "Syrian Arab Airlines",
  "Scientific Studies and Research Center",
  "Military Housing Establishment",
  "General Intelligence Directorate",
  "Air Force Intelligence",
  "Syrian General Organization of Radio and Television",
  "Cham Wings Airlines",
  "Syriatel Mobile Telecom",

  // Cuba
  "Banco Nacional de Cuba",
  "Cubana de Aviacion",
  "Gaviota S.A.",
  "Grupo de Administracion Empresarial",
  "CIMEX S.A.",
  "Fincimex S.A.",
  "Habaguanex S.A.",

  // Venezuela
  "Petroleos de Venezuela S.A.",
  "PDVSA",
  "Central Bank of Venezuela",
  "Banco de Venezuela",
  "Banco Bicentenario",
  "Minerven",
  "CVG Compania General de Mineria de Venezuela",
  "Corporacion Venezolana de Guayana",

  // Terrorist Organizations
  "Hezbollah",
  "Hamas",
  "Al-Qaeda",
  "Islamic State of Iraq and the Levant",
  "ISIS",
  "ISIL",
  "Al-Nusra Front",
  "Boko Haram",
  "Al-Shabaab",
  "Taliban",
  "Haqqani Network",
  "Palestinian Islamic Jihad",
  "Popular Front for the Liberation of Palestine",
  "Lashkar-e-Taiba",
  "Jaish-e-Mohammed",
  "Tehrik-i-Taliban Pakistan",
  "Kurdistan Workers Party",
  "PKK",
  "Real Irish Republican Army",
  "Aum Shinrikyo",

  // Drug Cartels & Narcotics
  "Sinaloa Cartel",
  "CJNG",
  "Cartel de Jalisco Nueva Generacion",
  "Los Zetas",
  "Gulf Cartel",
  "Norte del Valle Cartel",

  // Cyber Actors
  "APT28",
  "APT29",
  "Fancy Bear",
  "Cozy Bear",
  "Sandworm Team",
  "Kimsuky",
  "BlueNoroff",
  "Andariel",

  // Chinese Military-Industrial
  "Huawei Technologies",
  "China Military-Civil Fusion Contributors",
  "China National Electronics Import and Export Corporation",
  "China Academy of Space Technology",
  "China Aerospace Science and Technology Corporation",
  "China North Industries Group Corporation",
  "Semiconductor Manufacturing International Corporation",

  // Belarus
  "Belaruskali",
  "Belarusian Potash Company",
  "Beltelecom",
  "National Bank of the Republic of Belarus",
  "Belagroprombank",

  // Myanmar
  "Myanmar Economic Corporation",
  "Myanmar Economic Holdings Limited",
  "Myanma Oil and Gas Enterprise",

  // Libya
  "Libyan Investment Authority",
  "Libyan National Oil Corporation",

  // Sudan
  "Bank of Khartoum",
  "DAL Group",

  // Somalia
  "Al-Barakaat",

  // Zimbabwe
  "Zimbabwe Mining Development Corporation",

  // Eritrea
  "Red Sea Trading Corporation",
  "Eritrean People's Liberation Front",

  // Proliferation Networks
  "Khan Research Laboratories",
  "Abdul Qadeer Khan",

  // Dark Web / Crypto
  "Tornado Cash",
  "Blender.io",
  "Garantex",
  "Suex OTC",
  "Chatex",
  "Hydra Market",
  "BitRiver",

  // Additional High-Profile Entities
  "Rusal",
  "En+ Group",
  "EuroSibEnergo",
  "Oboronprom",
  "United Engine Corporation",
  "Tupolev",
  "Sukhoi",
  "MiG",
  "Kamov",
  "Mil Moscow Helicopter Plant",
  "Ural Mining and Metallurgical Company",
  "PhosAgro",
  "TMK",
  "Russian Railways",
  "Aeroflot",
  "S7 Airlines",
  "Utair Aviation",
  "Nordwind Airlines",
  "Ural Airlines",
];

/** Lowercase entity name set for O(n) substring matching */
export const ENTITY_NAME_SET = OFAC_ENTITY_NAMES.map((n) => n.toLowerCase());

/**
 * Screen an entity name against the bundled OFAC entity list.
 * Uses case-insensitive substring matching.
 * Returns the matched entity name or null.
 */
export function matchEntityName(query: string): string | null {
  const lower = query.toLowerCase().trim();
  if (!lower) return null;

  // Exact match first
  const exactIdx = ENTITY_NAME_SET.indexOf(lower);
  if (exactIdx !== -1) return OFAC_ENTITY_NAMES[exactIdx]!;

  // Substring match (query contained in entity name or entity name contained in query)
  for (let i = 0; i < ENTITY_NAME_SET.length; i++) {
    const entity = ENTITY_NAME_SET[i]!;
    if (entity.includes(lower) || lower.includes(entity)) {
      return OFAC_ENTITY_NAMES[i]!;
    }
  }

  return null;
}
