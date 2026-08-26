/**
 * Seed de desarrollo — Organización A ("Coffee Demo").
 *
 * IDEMPOTENTE: se puede correr N veces sin duplicar ni borrar nada.
 * Todo se resuelve con upsert / find-or-create y ninguna operación es destructiva.
 *
 * NO TOCA la organización B ("Tenant B Testing"), que se usa para probar el
 * aislamiento multi-tenant y debe permanecer casi vacía.
 */
import {
  CostingStatus,
  DiscountType,
  ModifierType,
  PrismaClient,
  TaxCategory,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Organización de pruebas multi-tenant: prohibido escribir en ella desde este seed. */
const TENANT_B_ORG_ID = 'cmsqgjl9k000110vxxg1iqzqa';

const ORG_SLUG = 'coffee-demo';

// ============================================================
// Catálogo
// ============================================================

const CATEGORIES = [
  {
    key: 'cafe-caliente',
    name: 'Café Caliente',
    icon: '☕',
    color: '#6F4E37',
    sortOrder: 1,
  },
  {
    key: 'cafe-frio',
    name: 'Café Frío',
    icon: '🧊',
    color: '#4682B4',
    sortOrder: 2,
  },
  {
    key: 'sin-cafe',
    name: 'Bebidas sin Café',
    icon: '🍵',
    color: '#8FBC8F',
    sortOrder: 3,
  },
  {
    key: 'panaderia',
    name: 'Panadería',
    icon: '🥐',
    color: '#DEB887',
    sortOrder: 4,
  },
  {
    key: 'alimentos',
    name: 'Alimentos',
    icon: '🥪',
    color: '#F4A460',
    sortOrder: 5,
  },
  {
    key: 'postres',
    name: 'Postres',
    icon: '🍰',
    color: '#C71585',
    sortOrder: 6,
  },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'];

interface ProductSeed {
  sku: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  category: CategoryKey;
  isFeatured?: boolean;
  prepMinutes?: number;
  calories?: number;
  tags?: string[];
}

/** Precios en MXN, típicos de cafetería de especialidad en México (2026). */
const PRODUCTS: ProductSeed[] = [
  // ---- Café Caliente ----
  {
    sku: 'CAF-001',
    name: 'Espresso',
    description: 'Shot sencillo de café de Chiapas, 30 ml',
    price: 42,
    cost: 7.5,
    category: 'cafe-caliente',
    isFeatured: true,
    prepMinutes: 2,
    calories: 5,
    tags: ['espresso', 'clásico'],
  },
  {
    sku: 'CAF-002',
    name: 'Espresso Doble',
    description: 'Doble shot de 60 ml, cuerpo intenso',
    price: 52,
    cost: 11,
    category: 'cafe-caliente',
    prepMinutes: 2,
    calories: 10,
    tags: ['espresso'],
  },
  {
    sku: 'CAF-003',
    name: 'Americano',
    description: 'Espresso doble con agua caliente a 92 °C',
    price: 48,
    cost: 8,
    category: 'cafe-caliente',
    isFeatured: true,
    prepMinutes: 3,
    calories: 15,
    tags: ['clásico'],
  },
  {
    sku: 'CAF-004',
    name: 'Capuchino',
    description: 'Espresso, leche vaporizada y espuma en tercios',
    price: 62,
    cost: 14,
    category: 'cafe-caliente',
    isFeatured: true,
    prepMinutes: 4,
    calories: 140,
    tags: ['leche'],
  },
  {
    sku: 'CAF-005',
    name: 'Latte',
    description: 'Espresso doble con leche texturizada y arte latte',
    price: 65,
    cost: 15,
    category: 'cafe-caliente',
    isFeatured: true,
    prepMinutes: 4,
    calories: 190,
    tags: ['leche'],
  },
  {
    sku: 'CAF-006',
    name: 'Flat White',
    description: 'Doble ristretto con microespuma sedosa',
    price: 68,
    cost: 15,
    category: 'cafe-caliente',
    prepMinutes: 4,
    calories: 160,
    tags: ['leche'],
  },
  {
    sku: 'CAF-007',
    name: 'Mocha',
    description: 'Espresso con chocolate de mesa oaxaqueño y leche',
    price: 74,
    cost: 19,
    category: 'cafe-caliente',
    prepMinutes: 5,
    calories: 290,
    tags: ['leche', 'chocolate'],
  },
  {
    sku: 'CAF-008',
    name: 'Filtrado de Origen V60',
    description: 'Método V60, 250 ml, grano de temporada',
    price: 78,
    cost: 16,
    category: 'cafe-caliente',
    prepMinutes: 6,
    calories: 5,
    tags: ['filtrado', 'especialidad'],
  },

  // ---- Café Frío ----
  {
    sku: 'FRI-001',
    name: 'Cold Brew',
    description: 'Extracción en frío 16 h, servido con hielo',
    price: 68,
    cost: 13,
    category: 'cafe-frio',
    isFeatured: true,
    prepMinutes: 2,
    calories: 10,
    tags: ['frío'],
  },
  {
    sku: 'FRI-002',
    name: 'Latte Frío',
    description: 'Espresso doble, leche fría y hielo',
    price: 70,
    cost: 16,
    category: 'cafe-frio',
    prepMinutes: 3,
    calories: 180,
    tags: ['frío', 'leche'],
  },
  {
    sku: 'FRI-003',
    name: 'Frappé de Café',
    description: 'Café, leche y hielo licuados con crema batida',
    price: 88,
    cost: 24,
    category: 'cafe-frio',
    isFeatured: true,
    prepMinutes: 5,
    calories: 340,
    tags: ['frío', 'leche'],
  },
  {
    sku: 'FRI-004',
    name: 'Affogato',
    description: 'Bola de helado de vainilla ahogada en espresso',
    price: 78,
    cost: 21,
    category: 'cafe-frio',
    prepMinutes: 3,
    calories: 250,
    tags: ['frío', 'postre'],
  },
  {
    sku: 'FRI-005',
    name: 'Espresso Tónic',
    description: 'Espresso sobre agua tónica y hielo, con cítrico',
    price: 80,
    cost: 18,
    category: 'cafe-frio',
    prepMinutes: 4,
    calories: 90,
    tags: ['frío', 'especialidad'],
  },

  // ---- Bebidas sin Café ----
  {
    sku: 'BEB-001',
    name: 'Chocolate Caliente Oaxaqueño',
    description: 'Chocolate de metate con leche vaporizada',
    price: 68,
    cost: 18,
    category: 'sin-cafe',
    prepMinutes: 5,
    calories: 320,
    tags: ['sin café', 'chocolate'],
  },
  {
    sku: 'BEB-002',
    name: 'Matcha Latte',
    description: 'Matcha ceremonial batido con leche',
    price: 82,
    cost: 22,
    category: 'sin-cafe',
    isFeatured: true,
    prepMinutes: 4,
    calories: 180,
    tags: ['sin café'],
  },
  {
    sku: 'BEB-003',
    name: 'Té de la Casa',
    description: 'Infusión de la casa, servicio de 350 ml',
    price: 45,
    cost: 6,
    category: 'sin-cafe',
    prepMinutes: 4,
    calories: 0,
    tags: ['sin café'],
  },
  {
    sku: 'BEB-004',
    name: 'Agua de Jamaica',
    description: 'Agua fresca del día, 500 ml',
    price: 38,
    cost: 6,
    category: 'sin-cafe',
    prepMinutes: 1,
    calories: 80,
    tags: ['sin café', 'frío'],
  },

  // ---- Panadería ----
  {
    sku: 'PAN-001',
    name: 'Concha de Vainilla',
    description: 'Pan dulce tradicional recién horneado',
    price: 32,
    cost: 9,
    category: 'panaderia',
    prepMinutes: 1,
    calories: 290,
    tags: ['pan dulce'],
  },
  {
    sku: 'PAN-002',
    name: 'Croissant de Mantequilla',
    description: 'Hojaldre de mantequilla, laminado a mano',
    price: 46,
    cost: 14,
    category: 'panaderia',
    isFeatured: true,
    prepMinutes: 1,
    calories: 310,
    tags: ['hojaldre'],
  },
  {
    sku: 'PAN-003',
    name: 'Croissant de Almendra',
    description: 'Croissant relleno de crema de almendra',
    price: 58,
    cost: 18,
    category: 'panaderia',
    prepMinutes: 1,
    calories: 420,
    tags: ['hojaldre'],
  },
  {
    sku: 'PAN-004',
    name: 'Pan de Chocolate',
    description: 'Hojaldre con dos barras de chocolate amargo',
    price: 52,
    cost: 16,
    category: 'panaderia',
    prepMinutes: 1,
    calories: 380,
    tags: ['hojaldre', 'chocolate'],
  },
  {
    sku: 'PAN-005',
    name: 'Garibaldi',
    description: 'Panqué con mermelada de chabacano y chochitos',
    price: 35,
    cost: 10,
    category: 'panaderia',
    prepMinutes: 1,
    calories: 340,
    tags: ['pan dulce'],
  },

  // ---- Alimentos ----
  {
    sku: 'ALI-001',
    name: 'Chilaquiles Verdes con Huevo',
    description: 'Totopos en salsa verde, crema, queso y dos huevos',
    price: 129,
    cost: 40,
    category: 'alimentos',
    isFeatured: true,
    prepMinutes: 12,
    calories: 620,
    tags: ['desayuno'],
  },
  {
    sku: 'ALI-002',
    name: 'Molletes Clásicos',
    description: 'Bolillo con frijol, queso gratinado y pico de gallo',
    price: 95,
    cost: 27,
    category: 'alimentos',
    prepMinutes: 10,
    calories: 540,
    tags: ['desayuno'],
  },
  {
    sku: 'ALI-003',
    name: 'Sándwich de Jamón y Queso',
    description: 'Pan de masa madre, jamón de pierna y queso manchego',
    price: 89,
    cost: 29,
    category: 'alimentos',
    prepMinutes: 8,
    calories: 480,
    tags: ['comida'],
  },
  {
    sku: 'ALI-004',
    name: 'Avocado Toast',
    description: 'Masa madre, aguacate, huevo pochado y ajonjolí',
    price: 115,
    cost: 36,
    category: 'alimentos',
    isFeatured: true,
    prepMinutes: 10,
    calories: 450,
    tags: ['desayuno'],
  },
  {
    sku: 'ALI-005',
    name: 'Bowl de Yogurt con Granola',
    description: 'Yogurt natural, granola de la casa y fruta de temporada',
    price: 85,
    cost: 26,
    category: 'alimentos',
    prepMinutes: 5,
    calories: 380,
    tags: ['desayuno', 'saludable'],
  },

  // ---- Postres ----
  {
    sku: 'POS-001',
    name: 'Pastel de Zanahoria',
    description: 'Rebanada con betún de queso crema',
    price: 78,
    cost: 23,
    category: 'postres',
    prepMinutes: 2,
    calories: 460,
    tags: ['postre'],
  },
  {
    sku: 'POS-002',
    name: 'Cheesecake de Zarzamora',
    description: 'Rebanada con coulis de zarzamora',
    price: 88,
    cost: 27,
    category: 'postres',
    isFeatured: true,
    prepMinutes: 2,
    calories: 490,
    tags: ['postre'],
  },
  {
    sku: 'POS-003',
    name: 'Brownie con Nuez',
    description: 'Brownie de chocolate 70 % con nuez pecana',
    price: 62,
    cost: 17,
    category: 'postres',
    prepMinutes: 2,
    calories: 410,
    tags: ['postre', 'chocolate'],
  },
];

const MODIFIERS: { name: string; type: ModifierType; priceDelta: number }[] = [
  { name: 'Chico 8 oz', type: ModifierType.SIZE, priceDelta: 0 },
  { name: 'Mediano 12 oz', type: ModifierType.SIZE, priceDelta: 10 },
  { name: 'Grande 16 oz', type: ModifierType.SIZE, priceDelta: 18 },

  { name: 'Leche entera', type: ModifierType.MILK, priceDelta: 0 },
  { name: 'Leche deslactosada', type: ModifierType.MILK, priceDelta: 8 },
  { name: 'Leche de almendra', type: ModifierType.MILK, priceDelta: 15 },
  { name: 'Leche de avena', type: ModifierType.MILK, priceDelta: 18 },
  { name: 'Leche de soya', type: ModifierType.MILK, priceDelta: 12 },

  { name: 'Shot extra', type: ModifierType.EXTRA, priceDelta: 18 },
  { name: 'Crema batida', type: ModifierType.EXTRA, priceDelta: 12 },
  { name: 'Canela', type: ModifierType.EXTRA, priceDelta: 0 },
  { name: 'Hielo extra', type: ModifierType.EXTRA, priceDelta: 0 },

  { name: 'Jarabe de vainilla', type: ModifierType.SYRUP, priceDelta: 12 },
  { name: 'Jarabe de caramelo', type: ModifierType.SYRUP, priceDelta: 12 },
  { name: 'Jarabe de avellana', type: ModifierType.SYRUP, priceDelta: 12 },

  { name: 'Descafeinado', type: ModifierType.DECAF, priceDelta: 5 },
];

interface SupplierSeed {
  key: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: string;
  leadTime: number;
}

const SUPPLIERS: SupplierSeed[] = [
  {
    key: 'cafe',
    name: 'Tostadores del Soconusco',
    contactName: 'Carlos Rodríguez',
    email: 'ventas@soconuscocoffee.mx',
    phone: '55-1234-5678',
    address: 'Av. Reforma 123, Cuauhtémoc, CDMX 06600',
    paymentTerms: '30 días',
    leadTime: 3,
  },
  {
    key: 'lacteos',
    name: 'Lácteos La Purísima',
    contactName: 'María González',
    email: 'pedidos@lapurisima.mx',
    phone: '722-345-6789',
    address: 'Calle Industria 45, Toluca, EDOMEX 50000',
    paymentTerms: '15 días',
    leadTime: 1,
  },
  {
    key: 'panaderia',
    name: 'Panadería Artesanal La Espiga',
    contactName: 'Juan Pérez',
    email: 'contacto@laespiga.mx',
    phone: '55-3456-7890',
    address: 'Calle Hornos 89, Benito Juárez, CDMX 03100',
    paymentTerms: 'Contado',
    leadTime: 1,
  },
];

interface InventoryItemSeed {
  code: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  costPerUnit: number;
  parLevel: number;
  reorderPoint: number;
  currentStock: number;
  category: string;
  supplier?: string;
}

const INVENTORY_ITEMS: InventoryItemSeed[] = [
  {
    code: 'INS-CAFE-001',
    name: 'Café en grano Chiapas',
    description: 'Arábica lavado, tueste medio',
    unitOfMeasure: 'kg',
    costPerUnit: 420,
    parLevel: 40,
    reorderPoint: 12,
    currentStock: 26,
    category: 'COFFEE_BEANS',
    supplier: 'cafe',
  },
  {
    code: 'INS-CAFE-002',
    name: 'Café en grano descafeinado',
    description: 'Descafeinado por agua, tueste medio',
    unitOfMeasure: 'kg',
    costPerUnit: 480,
    parLevel: 10,
    reorderPoint: 3,
    currentStock: 6,
    category: 'COFFEE_BEANS',
    supplier: 'cafe',
  },
  {
    code: 'INS-LECH-001',
    name: 'Leche entera',
    description: 'Leche entera pasteurizada, 1 L',
    unitOfMeasure: 'l',
    costPerUnit: 26,
    parLevel: 120,
    reorderPoint: 40,
    currentStock: 84,
    category: 'DAIRY',
    supplier: 'lacteos',
  },
  {
    code: 'INS-LECH-002',
    name: 'Leche deslactosada',
    description: 'Leche deslactosada, 1 L',
    unitOfMeasure: 'l',
    costPerUnit: 32,
    parLevel: 40,
    reorderPoint: 15,
    currentStock: 22,
    category: 'DAIRY',
    supplier: 'lacteos',
  },
  {
    code: 'INS-LECH-003',
    name: 'Bebida de avena barista',
    description: 'Bebida vegetal de avena para barismo',
    unitOfMeasure: 'l',
    costPerUnit: 68,
    parLevel: 30,
    reorderPoint: 10,
    currentStock: 14,
    category: 'DAIRY_ALT',
    supplier: 'lacteos',
  },
  {
    code: 'INS-LECH-004',
    name: 'Bebida de almendra',
    description: 'Bebida vegetal de almendra sin azúcar',
    unitOfMeasure: 'l',
    costPerUnit: 62,
    parLevel: 24,
    reorderPoint: 8,
    currentStock: 11,
    category: 'DAIRY_ALT',
    supplier: 'lacteos',
  },
  {
    code: 'INS-AGUA-001',
    name: 'Agua purificada',
    description: 'Agua filtrada para extracción',
    unitOfMeasure: 'l',
    costPerUnit: 3,
    parLevel: 300,
    reorderPoint: 100,
    currentStock: 210,
    category: 'WATER',
  },
  {
    code: 'INS-CHOC-001',
    name: 'Chocolate de mesa oaxaqueño',
    description: 'Tablilla de chocolate con canela',
    unitOfMeasure: 'kg',
    costPerUnit: 210,
    parLevel: 12,
    reorderPoint: 4,
    currentStock: 7,
    category: 'CHOCOLATE',
  },
  {
    code: 'INS-MATC-001',
    name: 'Matcha ceremonial',
    description: 'Té verde matcha grado ceremonial',
    unitOfMeasure: 'kg',
    costPerUnit: 2800,
    parLevel: 2,
    reorderPoint: 0.5,
    currentStock: 1.2,
    category: 'TEA',
  },
  {
    code: 'INS-JARA-001',
    name: 'Jarabe de vainilla',
    description: 'Jarabe saborizante de vainilla, 1 L',
    unitOfMeasure: 'l',
    costPerUnit: 180,
    parLevel: 8,
    reorderPoint: 3,
    currentStock: 5,
    category: 'SYRUPS',
  },
  {
    code: 'INS-JARA-002',
    name: 'Jarabe de caramelo',
    description: 'Jarabe saborizante de caramelo, 1 L',
    unitOfMeasure: 'l',
    costPerUnit: 180,
    parLevel: 8,
    reorderPoint: 3,
    currentStock: 4,
    category: 'SYRUPS',
  },
  {
    code: 'INS-AZUC-001',
    name: 'Azúcar estándar',
    description: 'Azúcar refinada a granel',
    unitOfMeasure: 'kg',
    costPerUnit: 28,
    parLevel: 30,
    reorderPoint: 10,
    currentStock: 18,
    category: 'SWEETENERS',
  },
  {
    code: 'INS-HIEL-001',
    name: 'Hielo',
    description: 'Hielo en cubo para bebidas frías',
    unitOfMeasure: 'kg',
    costPerUnit: 6,
    parLevel: 80,
    reorderPoint: 25,
    currentStock: 45,
    category: 'OTHER',
  },
  {
    code: 'INS-VASO-001',
    name: 'Vaso 12 oz con tapa',
    description: 'Vaso de cartón compostable con tapa',
    unitOfMeasure: 'unit',
    costPerUnit: 3.2,
    parLevel: 1000,
    reorderPoint: 300,
    currentStock: 620,
    category: 'PACKAGING',
  },
  {
    code: 'INS-PAN-001',
    name: 'Masa de croissant congelada',
    description: 'Pieza de hojaldre lista para hornear',
    unitOfMeasure: 'unit',
    costPerUnit: 12,
    parLevel: 200,
    reorderPoint: 60,
    currentStock: 130,
    category: 'BAKERY',
    supplier: 'panaderia',
  },
];

interface RecipeSeed {
  sku: string;
  name: string;
  description: string;
  instructions: string;
  prepTime: number;
  allergens: string[];
  ingredients: { code: string; quantity: number; notes?: string }[];
}

const RECIPES: RecipeSeed[] = [
  {
    sku: 'CAF-001',
    name: 'Espresso',
    description: 'Shot sencillo de 30 ml',
    instructions:
      '1. Moler 9 g de café fino\n2. Prensar nivelado\n3. Extraer 30 ml en 25-30 s a 93 °C',
    prepTime: 2,
    allergens: [],
    ingredients: [
      { code: 'INS-CAFE-001', quantity: 0.009, notes: 'Molienda fina' },
      { code: 'INS-AGUA-001', quantity: 0.03 },
    ],
  },
  {
    sku: 'CAF-003',
    name: 'Americano',
    description: 'Espresso doble con agua caliente',
    instructions:
      '1. Extraer espresso doble (18 g)\n2. Añadir 180 ml de agua a 92 °C\n3. Servir de inmediato',
    prepTime: 3,
    allergens: [],
    ingredients: [
      { code: 'INS-CAFE-001', quantity: 0.018 },
      { code: 'INS-AGUA-001', quantity: 0.21, notes: 'Extracción + dilución' },
      { code: 'INS-VASO-001', quantity: 1, notes: 'Solo para llevar' },
    ],
  },
  {
    sku: 'CAF-004',
    name: 'Capuchino',
    description: 'Espresso, leche y espuma en tercios',
    instructions:
      '1. Extraer espresso doble (18 g)\n2. Texturizar 120 ml de leche a 60-65 °C\n3. Verter en tercios',
    prepTime: 4,
    allergens: ['dairy'],
    ingredients: [
      { code: 'INS-CAFE-001', quantity: 0.018 },
      { code: 'INS-LECH-001', quantity: 0.12, notes: 'Texturizada a 65 °C' },
      { code: 'INS-VASO-001', quantity: 1 },
    ],
  },
  {
    sku: 'CAF-005',
    name: 'Latte',
    description: 'Espresso doble con leche texturizada',
    instructions:
      '1. Extraer espresso doble (18 g)\n2. Texturizar 240 ml de leche\n3. Verter con arte latte',
    prepTime: 4,
    allergens: ['dairy'],
    ingredients: [
      { code: 'INS-CAFE-001', quantity: 0.018 },
      { code: 'INS-LECH-001', quantity: 0.24 },
      { code: 'INS-VASO-001', quantity: 1 },
    ],
  },
  {
    sku: 'CAF-006',
    name: 'Flat White',
    description: 'Doble ristretto con microespuma',
    instructions:
      '1. Extraer doble ristretto (20 g / 40 ml)\n2. Texturizar 150 ml de leche con microespuma fina\n3. Verter sin capa de espuma',
    prepTime: 4,
    allergens: ['dairy'],
    ingredients: [
      { code: 'INS-CAFE-001', quantity: 0.02, notes: 'Ristretto' },
      { code: 'INS-LECH-001', quantity: 0.15 },
      { code: 'INS-VASO-001', quantity: 1 },
    ],
  },
  {
    sku: 'CAF-007',
    name: 'Mocha',
    description: 'Espresso con chocolate de mesa y leche',
    instructions:
      '1. Fundir 25 g de chocolate de mesa\n2. Extraer espresso doble\n3. Texturizar 200 ml de leche y mezclar',
    prepTime: 5,
    allergens: ['dairy'],
    ingredients: [
      { code: 'INS-CAFE-001', quantity: 0.018 },
      { code: 'INS-CHOC-001', quantity: 0.025 },
      { code: 'INS-LECH-001', quantity: 0.2 },
      { code: 'INS-VASO-001', quantity: 1 },
    ],
  },
  {
    sku: 'CAF-008',
    name: 'Filtrado V60',
    description: 'Método V60, 250 ml',
    instructions:
      '1. Moler 16 g medio\n2. Bloom 40 ml, 30 s\n3. Vertidos hasta 250 ml, total 2:45-3:15',
    prepTime: 6,
    allergens: [],
    ingredients: [
      { code: 'INS-CAFE-001', quantity: 0.016, notes: 'Molienda media' },
      { code: 'INS-AGUA-001', quantity: 0.26 },
    ],
  },
  {
    sku: 'FRI-001',
    name: 'Cold Brew',
    description: 'Extracción en frío, rinde 10 porciones',
    instructions:
      '1. Moler 200 g grueso\n2. Reposar en 1.5 L de agua fría 16 h\n3. Filtrar y refrigerar\n4. Servir 300 ml con hielo',
    prepTime: 5,
    allergens: [],
    ingredients: [
      {
        code: 'INS-CAFE-001',
        quantity: 0.02,
        notes: 'Prorrateado por porción',
      },
      { code: 'INS-AGUA-001', quantity: 0.15 },
      { code: 'INS-HIEL-001', quantity: 0.12 },
      { code: 'INS-VASO-001', quantity: 1 },
    ],
  },
  {
    sku: 'FRI-002',
    name: 'Latte Frío',
    description: 'Espresso doble con leche fría y hielo',
    instructions:
      '1. Extraer espresso doble sobre hielo\n2. Añadir 200 ml de leche fría\n3. Remover y servir',
    prepTime: 3,
    allergens: ['dairy'],
    ingredients: [
      { code: 'INS-CAFE-001', quantity: 0.018 },
      { code: 'INS-LECH-001', quantity: 0.2 },
      { code: 'INS-HIEL-001', quantity: 0.12 },
      { code: 'INS-VASO-001', quantity: 1 },
    ],
  },
  {
    sku: 'FRI-003',
    name: 'Frappé de Café',
    description: 'Café, leche y hielo licuados',
    instructions:
      '1. Licuar espresso doble, 180 ml de leche, 150 g de hielo y 20 ml de jarabe\n2. Servir con crema batida',
    prepTime: 5,
    allergens: ['dairy'],
    ingredients: [
      { code: 'INS-CAFE-001', quantity: 0.018 },
      { code: 'INS-LECH-001', quantity: 0.18 },
      { code: 'INS-HIEL-001', quantity: 0.15 },
      { code: 'INS-JARA-001', quantity: 0.02 },
      { code: 'INS-VASO-001', quantity: 1 },
    ],
  },
  {
    sku: 'BEB-001',
    name: 'Chocolate Caliente Oaxaqueño',
    description: 'Chocolate de metate con leche',
    instructions:
      '1. Fundir 40 g de tablilla en 50 ml de leche\n2. Añadir 200 ml de leche vaporizada\n3. Batir con molinillo',
    prepTime: 5,
    allergens: ['dairy'],
    ingredients: [
      { code: 'INS-CHOC-001', quantity: 0.04 },
      { code: 'INS-LECH-001', quantity: 0.25 },
      { code: 'INS-VASO-001', quantity: 1 },
    ],
  },
  {
    sku: 'BEB-002',
    name: 'Matcha Latte',
    description: 'Matcha ceremonial batido con leche',
    instructions:
      '1. Tamizar 3 g de matcha\n2. Batir con 60 ml de agua a 80 °C\n3. Añadir 200 ml de leche texturizada',
    prepTime: 4,
    allergens: ['dairy'],
    ingredients: [
      { code: 'INS-MATC-001', quantity: 0.003 },
      { code: 'INS-AGUA-001', quantity: 0.06 },
      { code: 'INS-LECH-001', quantity: 0.2 },
      { code: 'INS-VASO-001', quantity: 1 },
    ],
  },
  {
    sku: 'PAN-002',
    name: 'Croissant de Mantequilla',
    description: 'Horneado en tienda a partir de masa congelada',
    instructions:
      '1. Fermentar 90 min a temperatura ambiente\n2. Hornear 18 min a 180 °C\n3. Enfriar 10 min antes de vender',
    prepTime: 20,
    allergens: ['gluten', 'dairy'],
    ingredients: [
      { code: 'INS-PAN-001', quantity: 1, notes: 'Pieza congelada' },
    ],
  },
];

interface CustomerSeed {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  favoriteDrink: string;
  loyaltyPoints: number;
  totalVisits: number;
  totalSpent: number;
  consentMarketing: boolean;
  notes?: string;
  allergies?: string;
}

const CUSTOMERS: CustomerSeed[] = [
  {
    email: 'sofia.martinez@example.mx',
    phone: '5544120087',
    firstName: 'Sofía',
    lastName: 'Martínez',
    favoriteDrink: 'Latte con leche de avena',
    loyaltyPoints: 340,
    totalVisits: 42,
    totalSpent: 5480,
    consentMarketing: true,
    notes:
      'Cliente frecuente de la mañana, trabaja en el edificio de enfrente.',
  },
  {
    email: 'diego.hernandez@example.mx',
    phone: '5544120088',
    firstName: 'Diego',
    lastName: 'Hernández',
    favoriteDrink: 'Americano',
    loyaltyPoints: 120,
    totalVisits: 16,
    totalSpent: 1890,
    consentMarketing: false,
  },
  {
    email: 'valeria.ramos@example.mx',
    phone: '5544120089',
    firstName: 'Valeria',
    lastName: 'Ramos',
    favoriteDrink: 'Matcha Latte',
    loyaltyPoints: 610,
    totalVisits: 73,
    totalSpent: 9310,
    consentMarketing: true,
    allergies: 'Nuez y almendra',
    notes: 'Alergia a frutos secos: nunca usar bebida de almendra.',
  },
  {
    email: 'ricardo.lopez@example.mx',
    phone: '5544120090',
    firstName: 'Ricardo',
    lastName: 'López',
    favoriteDrink: 'Cold Brew',
    loyaltyPoints: 45,
    totalVisits: 6,
    totalSpent: 720,
    consentMarketing: false,
  },
];

// ============================================================
// Helpers idempotentes
// ============================================================

function modifiersForSku(sku: string): ModifierType[] {
  // Bebidas con leche: todo aplica.
  const milkBased = [
    'CAF-004',
    'CAF-005',
    'CAF-006',
    'CAF-007',
    'FRI-002',
    'FRI-003',
    'BEB-001',
    'BEB-002',
  ];
  // Café negro: tamaño, extras, jarabes y descafeinado (sin tipo de leche).
  const blackCoffee = [
    'CAF-001',
    'CAF-002',
    'CAF-003',
    'CAF-008',
    'FRI-001',
    'FRI-004',
    'FRI-005',
  ];
  // Bebidas sin café que solo admiten tamaño y extras.
  const simpleDrinks = ['BEB-003', 'BEB-004'];

  if (milkBased.includes(sku)) {
    return [
      ModifierType.SIZE,
      ModifierType.MILK,
      ModifierType.EXTRA,
      ModifierType.SYRUP,
      ModifierType.DECAF,
    ];
  }
  if (blackCoffee.includes(sku)) {
    return [
      ModifierType.SIZE,
      ModifierType.EXTRA,
      ModifierType.SYRUP,
      ModifierType.DECAF,
    ];
  }
  if (simpleDrinks.includes(sku)) {
    return [ModifierType.SIZE, ModifierType.EXTRA];
  }
  return [];
}

/** Conteos del tenant B, usados como testigo antes/después del seed. */
async function tenantBSnapshot() {
  const [products, categories, customers, users, locations] = await Promise.all(
    [
      prisma.product.count({ where: { organizationId: TENANT_B_ORG_ID } }),
      prisma.category.count({ where: { organizationId: TENANT_B_ORG_ID } }),
      prisma.customer.count({ where: { organizationId: TENANT_B_ORG_ID } }),
      prisma.user.count({ where: { organizationId: TENANT_B_ORG_ID } }),
      prisma.location.count({ where: { organizationId: TENANT_B_ORG_ID } }),
    ],
  );
  return { products, categories, customers, users, locations };
}

async function main() {
  console.log('🌱 Seed de desarrollo — Coffee Demo (idempotente)\n');

  // ----------------------------------------------------------
  // 0. Organización B — la que existe para probar el aislamiento
  // ----------------------------------------------------------
  // Se crea aquí, con id fijo, para que las pruebas de tenancy salgan de una
  // base limpia. Antes vivía sólo en la base de desarrollo de quien la hubiera
  // creado a mano, así que el testigo de abajo comparaba contra una
  // organización que en otra máquina no existía.
  //
  // Se queda deliberadamente **vacía**: sin productos, sin categorías, sin
  // clientes. Su valor es justamente ese — cualquier dato que aparezca en ella
  // después de un seed es una fuga.
  await prisma.organization.upsert({
    where: { id: TENANT_B_ORG_ID },
    update: {},
    create: {
      id: TENANT_B_ORG_ID,
      name: 'Tenant B Testing',
      slug: 'tenant-b-testing',
      description:
        'Organización vacía para probar aislamiento multi-tenant. No sembrar datos aquí.',
      timezone: 'America/Mexico_City',
    },
  });

  const tenantBRole = await prisma.role.upsert({
    where: { id: 'role-tenant-b-owner' },
    update: {},
    create: {
      id: 'role-tenant-b-owner',
      organizationId: TENANT_B_ORG_ID,
      name: 'Owner Tenant B',
      code: 'OWNER_TENANT_B',
      scopes: ['*'],
    },
  });

  await prisma.user.upsert({
    where: { email: 'owner@tenant-b.test' },
    update: {},
    create: {
      email: 'owner@tenant-b.test',
      password: await bcrypt.hash('password123', 10),
      firstName: 'Owner',
      lastName: 'Tenant B',
      organizationId: TENANT_B_ORG_ID,
      roleId: tenantBRole.id,
      active: true,
    },
  });
  console.log('✅ Organización B de pruebas (vacía, con su usuario)');

  // Testigo tomado ANTES de escribir nada de la organización A: al final se
  // compara y se falla si cambió algo del tenant B. Imprimir sus conteos sin
  // compararlos no prueba aislamiento — mostraría "intacto" igual si lo
  // hubiéramos pisado.
  const tenantBBefore = await tenantBSnapshot();

  // ----------------------------------------------------------
  // 1. Organización A + guardia anti tenant B
  // ----------------------------------------------------------
  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: {},
    create: {
      name: 'Coffee Demo',
      slug: ORG_SLUG,
      description: 'Organización de demostración',
      timezone: 'America/Mexico_City',
    },
  });

  if (org.id === TENANT_B_ORG_ID) {
    throw new Error(
      'ABORTADO: el slug coffee-demo resolvió a la organización de pruebas multi-tenant.',
    );
  }
  const organizationId = org.id;
  console.log(`✅ Organización: ${org.name} (${organizationId})`);

  // ----------------------------------------------------------
  // 2. Ubicación (reutiliza la existente, no crea duplicados)
  // ----------------------------------------------------------
  let location = await prisma.location.findFirst({
    where: { organizationId, name: 'Sucursal Centro' },
  });
  if (!location) {
    location = await prisma.location.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
  }
  if (!location) {
    location = await prisma.location.create({
      data: {
        organizationId,
        name: 'Sucursal Centro',
        address: 'Av. Juárez 123, Centro',
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '06000',
        country: 'MX',
        phone: '55-1234-5678',
        email: 'centro@coffeedemo.mx',
        timezone: 'America/Mexico_City',
        taxRate: 0.16,
        currency: 'MXN',
      },
    });
  }
  console.log(`✅ Ubicación: ${location.name}`);

  // ----------------------------------------------------------
  // 3. Usuarios demo
  //    Los roles los administra el módulo RBAC, aquí solo se reutilizan:
  //    si el rol no existe todavía, se omite la creación del usuario.
  // ----------------------------------------------------------
  const passwordHash = await bcrypt.hash('password123', 10);
  const USERS = [
    {
      email: 'owner@coffeedemo.mx',
      firstName: 'Roberto',
      lastName: 'Dueño',
      role: 'owner',
    },
    {
      email: 'manager@coffeedemo.mx',
      firstName: 'Ana',
      lastName: 'Gerente',
      role: 'manager',
    },
    {
      email: 'barista@coffeedemo.mx',
      firstName: 'Juan',
      lastName: 'Barista',
      role: 'barista',
    },
  ];

  let usersReady = 0;
  for (const u of USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
    });
    if (existing) {
      await prisma.userLocation.createMany({
        data: [{ userId: existing.id, locationId: location.id }],
        skipDuplicates: true,
      });
      usersReady += 1;
      continue;
    }

    const role = await prisma.role.findFirst({ where: { name: u.role } });
    if (!role) {
      console.warn(`   ⚠️  Rol "${u.role}" inexistente; se omite ${u.email}`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email: u.email,
        password: passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        organizationId,
        roleId: role.id,
        emailVerified: new Date(),
      },
    });
    await prisma.userLocation.createMany({
      data: [{ userId: user.id, locationId: location.id }],
      skipDuplicates: true,
    });
    usersReady += 1;
  }
  console.log(`✅ Usuarios (${usersReady})`);

  // ----------------------------------------------------------
  // 4. Categorías (find-or-create por nombre + organización)
  // ----------------------------------------------------------
  const categoryIdByKey = new Map<string, string>();
  for (const cat of CATEGORIES) {
    let category = await prisma.category.findFirst({
      where: { organizationId, name: cat.name },
    });
    if (!category) {
      category = await prisma.category.create({
        data: {
          organizationId,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          sortOrder: cat.sortOrder,
          active: true,
        },
      });
    }
    categoryIdByKey.set(cat.key, category.id);
  }
  console.log(`✅ Categorías (${CATEGORIES.length})`);

  // ----------------------------------------------------------
  // 5. Proveedores (find-or-create por nombre + organización)
  // ----------------------------------------------------------
  const supplierIdByKey = new Map<string, string>();
  for (const s of SUPPLIERS) {
    let supplier = await prisma.supplier.findFirst({
      where: { organizationId, name: s.name },
    });
    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: {
          organizationId,
          name: s.name,
          contactName: s.contactName,
          email: s.email,
          phone: s.phone,
          address: s.address,
          paymentTerms: s.paymentTerms,
          leadTime: s.leadTime,
          active: true,
        },
      });
    }
    supplierIdByKey.set(s.key, supplier.id);
  }
  console.log(`✅ Proveedores (${SUPPLIERS.length})`);

  // ----------------------------------------------------------
  // 6. Insumos de inventario (upsert por code + organización)
  // ----------------------------------------------------------
  const inventoryItemByCode = new Map<
    string,
    { id: string; costPerUnit: number; unitOfMeasure: string; name: string }
  >();
  for (const item of INVENTORY_ITEMS) {
    const created = await prisma.inventoryItem.upsert({
      where: { code_organizationId: { code: item.code, organizationId } },
      update: {
        name: item.name,
        description: item.description,
        unitOfMeasure: item.unitOfMeasure,
        costPerUnit: item.costPerUnit,
        parLevel: item.parLevel,
        reorderPoint: item.reorderPoint,
        currentStock: item.currentStock,
        category: item.category,
        supplierId: item.supplier ? supplierIdByKey.get(item.supplier) : null,
        costingStatus: CostingStatus.COMPLETE,
      },
      create: {
        organizationId,
        code: item.code,
        name: item.name,
        description: item.description,
        unitOfMeasure: item.unitOfMeasure,
        costPerUnit: item.costPerUnit,
        parLevel: item.parLevel,
        reorderPoint: item.reorderPoint,
        currentStock: item.currentStock,
        category: item.category,
        supplierId: item.supplier ? supplierIdByKey.get(item.supplier) : null,
        costingStatus: CostingStatus.COMPLETE,
        active: true,
      },
    });
    inventoryItemByCode.set(item.code, {
      id: created.id,
      costPerUnit: created.costPerUnit,
      unitOfMeasure: created.unitOfMeasure,
      name: created.name,
    });
  }
  console.log(`✅ Insumos de inventario (${INVENTORY_ITEMS.length})`);

  // ----------------------------------------------------------
  // 7. Productos (upsert por sku + organización — SKU único POR org)
  // ----------------------------------------------------------
  const productIdBySku = new Map<string, string>();
  for (const p of PRODUCTS) {
    const categoryId = categoryIdByKey.get(p.category)!;
    const data = {
      categoryId,
      name: p.name,
      description: p.description,
      price: p.price,
      cost: p.cost,
      taxRate: 0.16,
      taxIncluded: false,
      isFeatured: p.isFeatured ?? false,
      isAvailable: true,
      preparationTimeMinutes: p.prepMinutes ?? null,
      calories: p.calories ?? null,
      tags: p.tags ?? [],
      active: true,
    };
    const product = await prisma.product.upsert({
      where: { sku_organizationId: { sku: p.sku, organizationId } },
      update: data,
      create: { ...data, sku: p.sku, organizationId },
    });
    productIdBySku.set(p.sku, product.id);
  }
  console.log(`✅ Productos (${PRODUCTS.length})`);

  // ----------------------------------------------------------
  // 8. Modificadores + enlace a productos
  //    El catálogo es por organización desde la migración
  //    20260826_modifier_organization: antes no tenía organizationId y
  //    GET /modifiers devolvía los 16 a cualquier tenant.
  // ----------------------------------------------------------
  const modifiersByType = new Map<ModifierType, string[]>();
  for (const m of MODIFIERS) {
    let modifier = await prisma.modifier.findFirst({
      where: { organizationId, name: m.name, type: m.type },
    });
    if (!modifier) {
      modifier = await prisma.modifier.create({
        data: {
          organizationId,
          name: m.name,
          type: m.type,
          priceDelta: m.priceDelta,
          active: true,
        },
      });
    }
    const list = modifiersByType.get(m.type) ?? [];
    list.push(modifier.id);
    modifiersByType.set(m.type, list);
  }

  const productModifierRows: { productId: string; modifierId: string }[] = [];
  for (const p of PRODUCTS) {
    const productId = productIdBySku.get(p.sku)!;
    for (const type of modifiersForSku(p.sku)) {
      for (const modifierId of modifiersByType.get(type) ?? []) {
        productModifierRows.push({ productId, modifierId });
      }
    }
  }
  if (productModifierRows.length > 0) {
    await prisma.productModifier.createMany({
      data: productModifierRows,
      skipDuplicates: true,
    });
  }
  console.log(
    `✅ Modificadores (${MODIFIERS.length}) y ${productModifierRows.length} enlaces producto-modificador`,
  );

  // ----------------------------------------------------------
  // 9. Impuestos (IVA 16 % general + 0 % panadería para llevar)
  // ----------------------------------------------------------
  const TAXES = [
    {
      name: 'IVA 16%',
      description: 'Impuesto al Valor Agregado, tasa general',
      category: TaxCategory.IVA,
      rate: 0.16,
      applicableTo: 'all',
      categoryIds: [] as string[],
      included: false,
    },
    {
      name: 'IVA 0% Panadería para llevar',
      description:
        'Pan y bollería sin transformación: tasa 0 % (art. 2-A LIVA)',
      category: TaxCategory.IVA,
      rate: 0,
      applicableTo: 'category',
      categoryIds: [categoryIdByKey.get('panaderia')!],
      included: false,
    },
  ];

  for (const t of TAXES) {
    const existing = await prisma.tax.findFirst({
      where: { organizationId, name: t.name },
    });
    if (existing) {
      await prisma.tax.update({
        where: { id: existing.id },
        data: {
          description: t.description,
          category: t.category,
          rate: t.rate,
          applicableTo: t.applicableTo,
          categoryIds: t.categoryIds,
          included: t.included,
        },
      });
    } else {
      await prisma.tax.create({ data: { organizationId, ...t, active: true } });
    }
  }
  console.log(`✅ Impuestos (${TAXES.length})`);

  // ----------------------------------------------------------
  // 10. Descuentos (code es único global → upsert por code)
  // ----------------------------------------------------------
  const DISCOUNTS = [
    {
      code: 'BIENVENIDO10',
      name: 'Bienvenida 10%',
      description: '10 % de descuento en la primera compra',
      type: DiscountType.PERCENTAGE,
      percentage: 10,
      applicableTo: 'total',
      minPurchase: 100,
      maxUsesPerUser: 1,
    },
    {
      code: 'EMPLEADO20',
      name: 'Descuento empleado',
      description: '20 % para personal de la cafetería',
      type: DiscountType.PERCENTAGE,
      percentage: 20,
      applicableTo: 'total',
    },
    {
      code: 'MARTES2X1',
      name: 'Martes 2x1 en café caliente',
      description: 'Lleva 2 bebidas calientes y paga 1',
      type: DiscountType.BUY_X_GET_Y,
      buyQuantity: 2,
      getQuantity: 1,
      applicableTo: 'category',
      categoryIds: [categoryIdByKey.get('cafe-caliente')!],
    },
  ];

  for (const d of DISCOUNTS) {
    await prisma.discount.upsert({
      where: { code: d.code },
      update: {},
      create: { organizationId, ...d, active: true },
    });
  }
  console.log(`✅ Descuentos (${DISCOUNTS.length})`);

  // ----------------------------------------------------------
  // 11. Recetas + ingredientes (con costeo calculado)
  // ----------------------------------------------------------
  let recipesTouched = 0;
  for (const r of RECIPES) {
    const productId = productIdBySku.get(r.sku);
    if (!productId) continue;

    let totalCost = 0;
    const ingredientRows = r.ingredients.map((ing) => {
      const item = inventoryItemByCode.get(ing.code)!;
      const lineCost = ing.quantity * item.costPerUnit;
      totalCost += lineCost;
      return {
        inventoryItemId: item.id,
        quantity: ing.quantity,
        unit: item.unitOfMeasure,
        notes: ing.notes ?? null,
        unitCost: item.costPerUnit,
        totalCost: lineCost,
        isCosted: true,
      };
    });
    totalCost = Math.round(totalCost * 100) / 100;

    const recipeData = {
      name: r.name,
      description: r.description,
      instructions: r.instructions,
      yield: 1,
      yieldUnit: 'porción',
      prepTime: r.prepTime,
      allergens: r.allergens,
      totalCost,
      costingStatus: CostingStatus.COMPLETE,
      readyForPos: true,
      lastCostedAt: new Date(),
      active: true,
    };

    let recipe = await prisma.recipe.findFirst({
      where: { organizationId, productId, name: r.name },
    });
    if (recipe) {
      recipe = await prisma.recipe.update({
        where: { id: recipe.id },
        data: recipeData,
      });
    } else {
      recipe = await prisma.recipe.create({
        data: { organizationId, productId, ...recipeData },
      });
    }

    for (const row of ingredientRows) {
      await prisma.recipeIngredient.upsert({
        where: {
          recipeId_inventoryItemId: {
            recipeId: recipe.id,
            inventoryItemId: row.inventoryItemId,
          },
        },
        update: row,
        create: { recipeId: recipe.id, ...row },
      });
    }

    // El costo del producto refleja el costeo real de su receta.
    await prisma.product.update({
      where: { id: productId },
      data: { cost: totalCost },
    });
    recipesTouched += 1;
  }
  console.log(`✅ Recetas costeadas (${recipesTouched})`);

  // ----------------------------------------------------------
  // 12. Clientes (email y phone son únicos globales → upsert por email)
  // ----------------------------------------------------------
  for (const c of CUSTOMERS) {
    const payload = {
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      favoriteDrink: c.favoriteDrink,
      loyaltyPoints: c.loyaltyPoints,
      totalVisits: c.totalVisits,
      totalSpent: c.totalSpent,
      consentMarketing: c.consentMarketing,
      consentEmail: c.consentMarketing,
      consentDate: c.consentMarketing ? new Date('2026-01-15T10:00:00Z') : null,
      notes: c.notes ?? null,
      allergies: c.allergies ?? null,
      preferredLanguage: 'es',
    };
    // NO usar upsert por email: Customer.email es @unique GLOBAL, así que un
    // upsert sobre esa clave puede caer sobre la fila de OTRA organización y
    // sobrescribirla. Se busca acotado por organización y, si el email ya
    // pertenece a otro tenant, se aborta en vez de pisarlo.
    const existing = await prisma.customer.findUnique({
      where: { email: c.email },
      select: { id: true, organizationId: true },
    });

    if (existing && existing.organizationId !== organizationId) {
      throw new Error(
        `El email ${c.email} ya pertenece a la organización ${existing.organizationId}. ` +
          'El seed no sobrescribe datos de otro tenant.',
      );
    }

    if (existing) {
      await prisma.customer.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      await prisma.customer.create({
        data: { organizationId, email: c.email, ...payload },
      });
    }
  }
  console.log(`✅ Clientes (${CUSTOMERS.length})`);

  // ----------------------------------------------------------
  // 13. Existencias por producto en la ubicación (deterministas)
  // ----------------------------------------------------------
  let stockRows = 0;
  for (const [index, p] of PRODUCTS.entries()) {
    const productId = productIdBySku.get(p.sku)!;
    const currentStock = 20 + ((index * 7) % 60); // determinista: mismas cifras en cada corrida
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    const unitCost = product.cost || product.price * 0.3;

    await prisma.inventory.upsert({
      where: {
        productId_organizationId_locationId: {
          productId,
          organizationId,
          locationId: location.id,
        },
      },
      update: {
        unitCost,
        totalValue: Math.round(currentStock * unitCost * 100) / 100,
      },
      create: {
        productId,
        organizationId,
        locationId: location.id,
        currentStock,
        minStock: 5,
        maxStock: 120,
        reorderPoint: 15,
        unitCost,
        totalValue: Math.round(currentStock * unitCost * 100) / 100,
      },
    });
    stockRows += 1;
  }
  console.log(`✅ Existencias por producto (${stockRows})`);

  // --------------------------------------------------------
  // 14. Descuento automático de inventario
  // --------------------------------------------------------
  // El default del código es `enabled: false` — opt-in deliberado para un
  // tenant real. Pero la demo con el flag apagado enseña justo la ilusión que
  // este módulo tuvo durante meses: un inventario que nunca se mueve por más
  // que se venda. Las 14 recetas sembradas tienen unidades que sí convierten,
  // así que aquí se enciende para que una venta descuente de verdad.
  await prisma.setting.upsert({
    where: {
      organizationId_category_key: {
        organizationId,
        category: 'inventory',
        key: 'auto_deduct',
      },
    },
    create: {
      organizationId,
      category: 'inventory',
      key: 'auto_deduct',
      type: 'json',
      description: 'Descuento automático de insumos al servir una orden',
      value: {
        enabled: true,
        deduct_on_order_complete: true,
        allow_negative_stock: false,
        send_low_stock_alerts: true,
        reconciliation_frequency: 'weekly',
      },
    },
    update: {},
  });
  console.log('✅ Descuento automático de inventario activado');

  // ----------------------------------------------------------
  // Resumen
  // ----------------------------------------------------------
  const [
    catCount,
    prodCount,
    modCount,
    taxCount,
    discCount,
    itemCount,
    recCount,
    custCount,
    invCount,
  ] = await Promise.all([
    prisma.category.count({ where: { organizationId } }),
    prisma.product.count({ where: { organizationId } }),
    prisma.modifier.count({ where: { organizationId } }),
    prisma.tax.count({ where: { organizationId } }),
    prisma.discount.count({ where: { organizationId } }),
    prisma.inventoryItem.count({ where: { organizationId } }),
    prisma.recipe.count({ where: { organizationId } }),
    prisma.customer.count({ where: { organizationId } }),
    prisma.inventory.count({ where: { organizationId } }),
  ]);

  console.log('\n📊 Coffee Demo:');
  console.log(`   categorías        ${catCount}`);
  console.log(`   productos         ${prodCount}`);
  console.log(`   modificadores     ${modCount}`);
  console.log(`   impuestos         ${taxCount}`);
  console.log(`   descuentos        ${discCount}`);
  console.log(`   insumos           ${itemCount}`);
  console.log(`   recetas           ${recCount}`);
  console.log(`   clientes          ${custCount}`);
  console.log(`   existencias       ${invCount}`);
  // Verificación real de aislamiento: comparar contra el testigo inicial.
  const tenantBAfter = await tenantBSnapshot();
  const cambios = Object.entries(tenantBAfter)
    .filter(([k, v]) => v !== (tenantBBefore as Record<string, number>)[k])
    .map(
      ([k, v]) =>
        `${k}: ${(tenantBBefore as Record<string, number>)[k]} → ${v}`,
    );

  if (cambios.length > 0) {
    throw new Error(
      `El seed modificó datos del tenant B (${cambios.join(', ')}). ` +
        'Es una fuga de aislamiento multi-tenant, no un aviso.',
    );
  }

  console.log(
    `\n🔒 Tenant B sin cambios (verificado): ${tenantBAfter.products} productos, ` +
      `${tenantBAfter.categories} categorías, ${tenantBAfter.customers} clientes`,
  );
  console.log('\n📝 Credenciales: owner@coffeedemo.mx / password123\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
