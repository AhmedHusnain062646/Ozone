// ABOUTME: Seed catalogue (ateliers and products) used by db/seed.ts; not served to the browser.
// ABOUTME: Ids here are seed-time keys only; the database assigns real uuids.

export interface AtelierSeller {
  id: string;
  name: string;
  tagline: string;
  location: string;
  commissionRate: number; // e.g. 0.12 (12%)
  status: 'active' | 'pending_approval' | 'suspended';
  rating: number;
  totalSalesCount: number;
  joinedDate: string;
  bannerDescription: string;
  verifiedAtelier: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  priceDelta: number;
  stock: number;
  reservedStock: number; // temporarily reserved under 10-min hold
}

export interface ProductReview {
  id: string;
  buyerName: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
}

export interface Product {
  id: string;
  title: string;
  sellerId: string;
  category: 'Timepieces' | 'Interiors' | 'Fragrance' | 'Fashion' | 'Art & Objects' | 'Audio';
  basePrice: number;
  shortDescription: string;
  description: string;
  material: string;
  origin: string;
  images: string[];
  variants: ProductVariant[];
  rating: number;
  reviewCount: number;
  reviews: ProductReview[];
  limitedEdition?: boolean;
  lowStockThreshold: number;
  isPublished: boolean;
}

export const INITIAL_SELLERS: AtelierSeller[] = [
  {
    id: 'seller-vane',
    name: 'Atelier Vane',
    tagline: 'Lapidary stone carving & architectural vessels',
    location: 'Kyoto & Zurich',
    commissionRate: 0.085, // 8.5% Guild fee from Stitch screens
    status: 'active',
    rating: 4.98,
    totalSalesCount: 142,
    joinedDate: '2024-03-15',
    bannerDescription: 'Founded by Lukas Vane and Mai Tanaka, fusing Alpine geological curation with Kyoto subtractive wabi-sabi stone mastery.',
    verifiedAtelier: true,
  },
  {
    id: 'seller-silt',
    name: 'Maison Silt',
    tagline: 'Hand-harvested French flax & archival heritage looms',
    location: 'Normandy, France',
    commissionRate: 0.085,
    status: 'active',
    rating: 5.0,
    totalSalesCount: 98,
    joinedDate: '2024-05-20',
    bannerDescription: 'Artisanal wild-spun flax textiles dyed with fermented wild indigo and roasted bancha tea leaves.',
    verifiedAtelier: true,
  },
  {
    id: 'seller-homage',
    name: 'Homage Atelier',
    tagline: 'Chronometric movements & titanium horology',
    location: 'Geneva, Switzerland',
    commissionRate: 0.10,
    status: 'active',
    rating: 4.96,
    totalSalesCount: 84,
    joinedDate: '2024-01-10',
    bannerDescription: 'High-complication titanium horology and architectural monobloc chronometers with hand-finished bevels.',
    verifiedAtelier: true,
  },
  {
    id: 'seller-kanso',
    name: 'Kanso Stoneware Guild',
    tagline: 'Volcanic basalt basins & Kuro-Bizen ceramics',
    location: 'Kyoto, Japan',
    commissionRate: 0.085,
    status: 'active',
    rating: 4.97,
    totalSalesCount: 114,
    joinedDate: '2023-11-01',
    bannerDescription: 'Basalt stoneware fired in subterranean geothermal kilns with wood-ash glazes and natural kintsugi accents.',
    verifiedAtelier: true,
  },
  {
    id: 'seller-nordic',
    name: 'Nordic Fine Foundry',
    tagline: 'Lost-wax bell bronze & brutalist illumination',
    location: 'Copenhagen, Denmark',
    commissionRate: 0.085,
    status: 'active',
    rating: 4.95,
    totalSalesCount: 62,
    joinedDate: '2024-06-01',
    bannerDescription: 'Lost-wax cast bell bronze with antique oxidized patinas designed to evolve with seasonal handling.',
    verifiedAtelier: true,
  },
  {
    id: 'seller-kurogane',
    name: 'Kurogane Forge',
    tagline: 'Handcrafted layered Damascus steel & culinary arts',
    location: 'Seki, Japan',
    commissionRate: 0.09, // 9.0% from applicant dossier
    status: 'pending_approval',
    rating: 5.0,
    totalSalesCount: 0,
    joinedDate: '2026-11-01',
    bannerDescription: 'Multi-layered Damascus kitchen knives hand-forged in historic Seki workshops, currently awaiting platform accreditation.',
    verifiedAtelier: false,
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-vane-01',
    title: 'Monolithic Travertine Vessel N°03',
    sellerId: 'seller-vane',
    category: 'Interiors',
    basePrice: 1450,
    shortDescription: 'Porous Roman travertine hand-carved with continuous fluting. Wax-sealed interior safe for seasonal botanicals.',
    description: 'Formed through centuries of hydrothermal mineral crystallization in the sedimentary thermal springs of Rapolano Terme, Tuscan travertine possesses deliberate natural voids and caverns. Vessel N°03 is unstratified—hewn directly from an unbroken quarried boulder by Master Mason Julian Vane. The facade honors the primitive balance between raw fractured stone and sculpted parabolic hollows. Its interior is delicately hand-sealed with natural beeswax and fine pine resin.',
    material: 'Rapolano Tuscan Travertine Stone, Natural Beeswax Resin Seal',
    origin: 'Rapolano Terme, Siena, Italy / Kyoto Workshop',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBNLo5rcslk-zshG60padjug6FUlqcOjUBUi-EYZbRNBm-JVlZed5QaT0fIEhOEAScFKlE-Pr8XhFPKThTGhNkBpyBFCSFiaYErIqi8w78o4MGYXzap6UzR1zulfB-fzVdvgyby2oJzpLgFTNHkmL-I-SSLa-oPrwlxkHA0U6rikU2aNHlO62YEFXDSoAaIszVuqvg0Y-Tam1jsVUMnQV42LoArKMriJyHIgYBeXAc',
      '/src/assets/images/ozone_hero_luxury_living_1794146207794.jpg',
    ],
    rating: 4.98,
    reviewCount: 14,
    limitedEdition: true,
    lowStockThreshold: 2,
    isPublished: true,
    variants: [
      { id: 'var-v01-raw', name: 'Roman Raw · Standard Studio (320mm)', sku: 'OZ-TRAV-RAW-S', priceDelta: 0, stock: 2, reservedStock: 0 },
      { id: 'var-v01-bizen', name: 'Bizen Honed · Standard Studio (320mm)', sku: 'OZ-TRAV-BIZ-S', priceDelta: 150, stock: 1, reservedStock: 0 },
      { id: 'var-v01-calacatta', name: 'Calacatta · Monumental (Exhausted)', sku: 'OZ-TRAV-CAL-M', priceDelta: 1350, stock: 0, reservedStock: 0 },
    ],
    reviews: [
      {
        id: 'rev-v1',
        buyerName: 'Helena M. (Geneva)',
        rating: 5,
        date: '2025-01-14',
        title: 'Remarkable tactile presence in raking light',
        comment: 'The unstratified voids cast long sculptural shadows along the dinner credenza. Arrived in an impeccably jointed Scandinavian spruce crate.',
        verifiedPurchase: true,
      },
      {
        id: 'rev-v2',
        buyerName: 'Dr. Dominique Laurent',
        rating: 5,
        date: '2024-12-02',
        title: 'Profound mineral density',
        comment: 'Julian Vane’s hallmark chiseled into the base confirms the museum-grade nature of this collection.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    id: 'prod-silt-01',
    title: 'Unbleached Wild-Spun Flax Kimono',
    sellerId: 'seller-silt',
    category: 'Fashion',
    basePrice: 890,
    shortDescription: 'Hand-dyed with fermented wild indigo and roasted bancha tea leaves. Unbleached 480 GSM French flax with horn toggle closure.',
    description: 'Hand-harvested in Normandy, this archival garment is woven on vintage shuttle looms from 100% long-staple French flax. The unbleached slub yarn gives each piece an irregular tactile grain that softens with every wear, providing breathable thermal equilibrium.',
    material: '100% Unbleached French Flax (480 GSM), Buffalo Horn Toggle, Fermented Tea Mordant',
    origin: 'Normandy Loom, France',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBMEPAEYW7JIQrIeq33c56dFnNX1T308Gg69GiZp3M_HHBRfFpVJQ00lZbO5VdI2vZu5PzZy1NfkSvgvC2HXc_e7ejbRp80dKndyKLsG601TRMBHl_46i0x2dJ4NAzun-qSPqLRSrPtGM5W0hDABTArenKCRhhXdajv_cvDPrA40fxdHjZI9WNTmXiW-K6MMLTHKc15NG4kJL9_nBGpaQ1PcTpn6FUxmrLEA5mzIJc',
      '/src/assets/images/product_cashmere_overcoat_1794146209378.jpg',
    ],
    rating: 5.0,
    reviewCount: 9,
    limitedEdition: true,
    lowStockThreshold: 2,
    isPublished: true,
    variants: [
      { id: 'var-s01-s2', name: 'Size II (Unisex Tailored) / Archival Ecru', sku: 'MS-FLX-EC-02', priceDelta: 0, stock: 2, reservedStock: 0 },
      { id: 'var-s01-s3', name: 'Size III (Oversized Slub) / Deep Tea Dye', sku: 'MS-FLX-TEA-03', priceDelta: 75, stock: 4, reservedStock: 0 },
    ],
    reviews: [
      {
        id: 'rev-s1',
        buyerName: 'Arthur Sterling',
        rating: 5,
        date: '2025-02-18',
        title: 'Uncompromising textile weight',
        comment: 'Drapes with aristocratic structure without stiffening. The cedar garment sleeve smells magnificent.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    id: 'prod-homage-01',
    title: 'Titanium Monolith Chronometer N°02',
    sellerId: 'seller-homage',
    category: 'Timepieces',
    basePrice: 2400,
    shortDescription: 'Grade 5 titanium integrated bracelet with matte slate sub-dials. Caliber 8900 chronometer certified movement.',
    description: 'Milled from a singular monobloc billet of aerospace Grade 5 titanium, Chronometer N°02 features sandblasted architectural bevels that dissipate ambient light. The slate dial features hand-applied white gold markers and a 60-hour chronometric reserve.',
    material: 'Grade 5 Titanium, Anti-Reflective Sapphire Crystal, Caliber 8900 Automatic',
    origin: 'Geneva Atelier, Switzerland',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBFWRVthxiol-m6ROCLzXD_WmSWA_fEDmi35hA0m_C-wHwqpn8n6lo6CNoC3NT1Qi9NTW_Drikko-Jux9nsBt4NPHazyLxU6kQNFJHGX1-RJk6NMWqIWYB6MdIVr7A-urM6IOFPx6j2CNNb-B6d0i6DY0jJA3VBmr09e0smCU6ZpZtPvMtKsJUV9UU3AOF3nVuKj24YcdQrX95aq-maJika_7f5CxB9ZD7z5DRQ6Og',
      '/src/assets/images/product_minimalist_timepiece_1794146208921.jpg',
    ],
    rating: 4.96,
    reviewCount: 22,
    limitedEdition: true,
    lowStockThreshold: 1,
    isPublished: true,
    variants: [
      { id: 'var-h01-ti', name: 'Matte Titanium Bracelet (39mm)', sku: 'HM-CHRONO-TI-01', priceDelta: 0, stock: 1, reservedStock: 0 },
      { id: 'var-h01-lea', name: 'Saddle Leather Strap Edition (39mm)', sku: 'HM-CHRONO-LEA-02', priceDelta: -200, stock: 2, reservedStock: 0 },
    ],
    reviews: [
      {
        id: 'rev-h1',
        buyerName: 'Jean-Luc V.',
        rating: 5,
        date: '2025-01-20',
        title: 'Horological perfection',
        comment: 'Weighs barely 78 grams on the wrist yet feels indestructible. The titanium hue is subtly warm in person.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    id: 'prod-vane-02',
    title: 'Subtractive Travertine Incense Bowl',
    sellerId: 'seller-vane',
    category: 'Interiors',
    basePrice: 480,
    shortDescription: 'Milled from solid ivory travertine with solid brass central needle. Heat resistant, lifetime stone patina.',
    description: 'Designed as a contemplative ritual vessel. The hand-turned travertine bowl gathers fine ash naturally while the central solid brass pin supports pure compressed incense sticks without metallic rattle.',
    material: 'Natural Tuscan Travertine, Milled Solid Brass Needle',
    origin: 'Rapolano Terme / Kyoto Studio',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAN8xaGkRgqQ-khAp7faefGS2zYAPOedDmDu2OtjkubXVsZN7cqEhiFaxbOAq3SYBXrdtyCEYX_YuoiVAWyU7UvkLA-N45J-c6f5M8mH1EAl4B1MVTFOvWodHA-S9-9EniWpCGx7AnjMVmVp_r5cfq7lGfCE-iYg-55TSBoSs3pnumCIgx7pR6A_R8jhWLGQauwL25yB6ZGCpUmxcJdj7fcOB6l2P0c9sEYjQMpQ1s',
    ],
    rating: 4.92,
    reviewCount: 31,
    limitedEdition: false,
    lowStockThreshold: 3,
    isPublished: true,
    variants: [
      { id: 'var-v02-std', name: 'Hand-Hewn Ivory Travertine (180mm)', sku: 'OZ-TRAV-INC-01', priceDelta: 0, stock: 3, reservedStock: 0 },
    ],
    reviews: [
      {
        id: 'rev-v2-1',
        buyerName: 'Chloe Bennett',
        rating: 5,
        date: '2025-03-01',
        title: 'Meditative simplicity',
        comment: 'The weight prevents any accidental tipping. The ash clears effortlessly from the honed stone basin.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    id: 'prod-nordic-01',
    title: 'Brutalist Bronze Candle Sconce',
    sellerId: 'seller-nordic',
    category: 'Interiors',
    basePrice: 620,
    shortDescription: 'Poured solid bell bronze with liver-of-sulfur antique patina. Designed to patina further with seasonal touch and ambient wax dripping.',
    description: 'Cast in Copenhagen using ancient lost-wax molds. Weighing 3.8 kg, each sconce exhibits intentional cooling textures and molten folds, reflecting warm candlelight against lime-washed plaster walls.',
    material: 'Pure Solid Bell Bronze, Oxidized Liver-of-Sulfur Patina',
    origin: 'Cornwall Foundry / Copenhagen Atelier',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDV3j9K2_4CY2T2ly9ib7oKBpsEvq48mlsZnpGa46OjpIHdpm0bT9DDh9SF75Q9LfLk03zjqJgfIuwHYMhbZSPTd_cqqyt929hgRyRlzCJz9y8O7BF63zzgVIFT28Oy9P3k-Y_FehOisksbElFA4-uxq55uz9r8ttk1CoEeHGAjr6zHM6cYZ_uFes5taB6tx5MwOmucjlc0JvFLtPGbh5SWkQGUsOZWzJXXyc02irE',
    ],
    rating: 4.95,
    reviewCount: 16,
    limitedEdition: true,
    lowStockThreshold: 2,
    isPublished: true,
    variants: [
      { id: 'var-n01-f7', name: 'Batch IV · Hand Stamped F7 (3.8 kg)', sku: 'NFF-SCONCE-BR-04', priceDelta: 0, stock: 4, reservedStock: 0 },
    ],
    reviews: [
      {
        id: 'rev-n1',
        buyerName: 'Klaus Richter',
        rating: 5,
        date: '2025-02-11',
        title: 'Heirloom architectural hardware',
        comment: 'Massive weight and profound tactile presence. The bronze glows with amber depth in candlelight.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    id: 'prod-kanso-basalt',
    title: 'Carved Basalt Tea Basin',
    sellerId: 'seller-kanso',
    category: 'Interiors',
    basePrice: 4200,
    shortDescription: 'Subterranean volcanic basalt hollowed over 32 hours with hand chisels for ceremony tea rituals.',
    description: 'Hewn from volcanic basalt stones in the northern mountains of Kyoto. Retains water temperature and features subtle crystalline inclusions that shimmer under directional tea salon light.',
    material: 'Natural Volcanic Basalt Stone',
    origin: 'Kyoto Studio, Japan',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAbFLYQ7k6DWfi6Zp1Vy13w_jf9LF7YAVW0Oe42sMnpKXPU6N2Ufg7IkUCMMqKBkUYUZNPxeXPuPGrpv8qcB769xGvSUXs2nFqr6uzIS8YZY4HkgmG4MmfyShq3MljMcKmzeap_eFKtTk_I8YDAvSEy_n5OCRThlekdS4P3Jwn3SmD1B6YZj_jXjW0UipTwrZ9U9PLOKhkYnzohCvyXY5qSaj0fArfcYM5WzzU04ms',
    ],
    rating: 4.99,
    reviewCount: 8,
    limitedEdition: true,
    lowStockThreshold: 1,
    isPublished: true,
    variants: [
      { id: 'var-k02-basin', name: 'Master Carved Basin (Single Block)', sku: 'KNS-BST-BSN-01', priceDelta: 0, stock: 1, reservedStock: 0 },
    ],
    reviews: [
      {
        id: 'rev-k1',
        buyerName: 'H. Sterling (Geneva)',
        rating: 5,
        date: '2025-01-29',
        title: 'Transcendent ritual centerpiece',
        comment: 'The basalt has an ancient presence. Worth the 4-week curatorial shipping window.',
        verifiedPurchase: true,
      },
    ],
  },
];
