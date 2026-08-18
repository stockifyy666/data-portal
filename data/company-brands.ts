// Add/update brands and subsidiaries for each PSX symbol here.
// Each entry: { name, description, logo (optional emoji or initials) }

export const COMPANY_BRANDS: Record<string, {
  name: string
  description: string
  logo?: string
}[]> = {
  NESTLE: [
    { name: 'Nescafé',    description: 'Coffee brand',              logo: '☕' },
    { name: 'Milo',       description: 'Chocolate malt drink',      logo: '🟤' },
    { name: 'Kit Kat',    description: 'Chocolate wafer bar',       logo: '🍫' },
    { name: 'Maggi',      description: 'Noodles & seasonings',      logo: '🍜' },
    { name: 'Nestlé Pure Life', description: 'Bottled water',       logo: '💧' },
    { name: 'Milkpak',    description: 'UHT milk & dairy',          logo: '🥛' },
  ],
  ENGRO: [
    { name: 'Engro Fertilizers',  description: 'Fertilizer manufacturing', logo: '🌱' },
    { name: 'Engro Foods',        description: 'Dairy & food products',    logo: '🥛' },
    { name: 'Engro Polymer',      description: 'PVC & chemical products',  logo: '⚗️' },
    { name: 'Engro Powergen',     description: 'Power generation',         logo: '⚡' },
    { name: 'Engro Vopak',        description: 'Chemical storage terminal',logo: '🏭' },
  ],
  LUCK: [
    { name: 'Lucky Cement',       description: 'Cement production',        logo: '🏗️' },
    { name: 'Lucky Electric',     description: 'Power generation',         logo: '⚡' },
    { name: 'Lucky Motor Corp',   description: 'KIA car assembly',         logo: '🚗' },
    { name: 'ICI Pakistan',       description: 'Chemicals & pharma',       logo: '⚗️' },
    { name: 'Yunus Textile',      description: 'Textile manufacturing',    logo: '🧵' },
  ],
  HBL: [
    { name: 'HBL Asset Mgmt',     description: 'Mutual fund management',   logo: '📈' },
    { name: 'HBL Microfinance',   description: 'Microfinance banking',     logo: '🏦' },
    { name: 'HBL Currency Exch.', description: 'Forex & remittances',      logo: '💱' },
  ],
  UBL: [
    { name: 'UBL Fund Managers',  description: 'Asset management',         logo: '📊' },
    { name: 'UBL Insurers',       description: 'General insurance',        logo: '🛡️' },
  ],
  MCB: [
    { name: 'MCB Islamic Bank',   description: 'Shariah-compliant banking',logo: '🕌' },
    { name: 'MCB Arif Habib',     description: 'Investment banking',       logo: '📈' },
  ],
  PSO: [
    { name: 'PSO Retail',         description: 'Fuel retail network',      logo: '⛽' },
    { name: 'PSO LNG',            description: 'LNG import & distribution',logo: '🔥' },
  ],
  OGDC: [
    { name: 'OGDC E&P',           description: 'Oil & gas exploration',    logo: '🛢️' },
    { name: 'OGDC Refineries',    description: 'Crude oil processing',     logo: '🏭' },
  ],
  EFERT: [
    { name: 'Engro Fertilizers',  description: 'Urea & NPK fertilizers',   logo: '🌾' },
    { name: 'EnVen',              description: 'Agricultural ventures',     logo: '🌱' },
  ],
  // Add more symbols below:
  // SYMBOL: [{ name: '', description: '', logo: '' }],
}
