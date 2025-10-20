# 🧱 TODO 03: Componentes UI Base

**Período**: Semana 2-3  
**Owner**: Frontend Lead + UI Developer  
**Prioridad**: 🟡 ALTA  

## 📋 Objetivos

Construir la biblioteca de componentes UI reutilizables que servirá de base para todas las aplicaciones del ecosistema CoffeeOS, asegurando consistencia visual y eficiencia de desarrollo.

## ✅ Entregables

### 1. Design System Foundation

#### 🎨 Tokens de Diseño (Design Tokens)
```typescript
// tokens/colors.ts
export const colors = {
  // Semantic Colors
  primary: {
    50: '#FEF7ED',
    100: '#FDEED3', 
    500: '#8B4513', // Coffee Brown
    600: '#7A3E11',
    900: '#5D2F0D'
  },
  secondary: {
    50: '#FEFBF3',
    100: '#F4E4BC', // Cream
    500: '#D4AF37', // Gold
  },
  success: {
    50: '#F0FDF4',
    500: '#22C55E',
    600: '#16A34A'
  },
  warning: {
    50: '#FFFBEB', 
    500: '#F59E0B',
    600: '#D97706'
  },
  error: {
    50: '#FEF2F2',
    500: '#EF4444', 
    600: '#DC2626'
  },
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0', 
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A'
  }
}

// tokens/typography.ts  
export const typography = {
  fonts: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['Fira Code', 'Consolas', 'monospace']
  },
  sizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px  
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem'  // 36px
  },
  weights: {
    normal: '400',
    medium: '500', 
    semibold: '600',
    bold: '700'
  }
}

// tokens/spacing.ts
export const spacing = {
  px: '1px',
  0: '0',
  1: '0.25rem', // 4px
  2: '0.5rem',  // 8px
  3: '0.75rem', // 12px
  4: '1rem',    // 16px
  5: '1.25rem', // 20px
  6: '1.5rem',  // 24px
  8: '2rem',    // 32px
  10: '2.5rem', // 40px
  12: '3rem',   // 48px  
  16: '4rem',   // 64px
  20: '5rem',   // 80px
  24: '6rem'    // 96px
}
```

#### 📐 Layout & Grid System
- [ ] **Grid responsivo** basado en CSS Grid y Flexbox
- [ ] **Breakpoints** optimizados para POS: sm(640px), md(768px), lg(1024px), xl(1280px)
- [ ] **Container** con max-width por breakpoint
- [ ] **Spacing utilities** basado en sistema de 8px

### 2. Componentes Atómicos (Atoms)

#### 🔘 Button Component
```typescript
// components/Button/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost'
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
  loading?: boolean
  disabled?: boolean  
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  children: ReactNode
  onClick?: () => void
}

// Variants necesarias para POS:
<Button variant="primary" size="lg">Procesar Pago</Button>
<Button variant="success" size="md" icon={<CheckIcon />}>Confirmar</Button>  
<Button variant="error" size="sm" fullWidth>Cancelar Orden</Button>
<Button variant="ghost" size="xs" icon={<TrashIcon />} />
```

- [ ] **Estados**: default, hover, active, disabled, loading
- [ ] **Accesibilidad**: focus visible, aria-labels, keyboard navigation
- [ ] **Touch optimization**: min 44px touch target
- [ ] **Loading state**: spinner + disabled interaction

#### 📝 Input Component
```typescript
interface InputProps {
  type: 'text' | 'number' | 'email' | 'password' | 'search' | 'tel'
  size: 'sm' | 'md' | 'lg'
  variant: 'default' | 'error' | 'success'
  placeholder?: string
  label?: string
  helperText?: string
  errorText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode  
  disabled?: boolean
  required?: boolean
  value?: string
  onChange?: (value: string) => void
}

// Casos de uso POS:
<Input 
  label="RFC Cliente"
  placeholder="XAXX010101000"
  pattern="[A-Z]{4}[0-9]{6}[A-Z0-9]{3}"
  errorText="RFC inválido"
/>
<Input 
  type="number" 
  label="Efectivo recibido"
  leftIcon={<CurrencyIcon />}
  size="lg"
/>
```

- [ ] **Validación visual** en tiempo real
- [ ] **Formato automático** para RFC, teléfono, moneda
- [ ] **Teclado optimizado** móvil (numeric, email, tel)
- [ ] **Error states** con mensajes contextuales

#### 🏷️ Badge Component  
```typescript
interface BadgeProps {
  variant: 'default' | 'success' | 'warning' | 'error' | 'info'
  size: 'sm' | 'md' | 'lg'
  children: ReactNode
}

// Para inventario y estado de órdenes:
<Badge variant="error">Stock Bajo</Badge>
<Badge variant="warning">Pendiente</Badge> 
<Badge variant="success">Completado</Badge>
```

#### 🔄 Spinner Component
```typescript  
interface SpinnerProps {
  size: 'xs' | 'sm' | 'md' | 'lg'
  color?: string
  thickness?: number
}

// Estados de carga en POS:
<Spinner size="lg" /> // Loading general
<Spinner size="sm" color="white" /> // Loading en botón
```

### 3. Componentes Moleculares (Molecules)

#### 🃏 Card Component
```typescript
interface CardProps {
  variant: 'elevated' | 'outlined' | 'flat'
  padding: 'none' | 'sm' | 'md' | 'lg'
  clickable?: boolean
  header?: ReactNode
  footer?: ReactNode  
  children: ReactNode
  onClick?: () => void
}

// Para productos en catálogo:
<Card variant="elevated" clickable onClick={addToCart}>
  <img src={product.image} alt={product.name} />
  <CardContent>
    <h3>{product.name}</h3>
    <p>${product.price}</p>
  </CardContent>
</Card>
```

#### 📊 DataTable Component
```typescript
interface Column<T> {
  key: keyof T
  label: string
  sortable?: boolean
  render?: (value: any, row: T) => ReactNode
  width?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  pagination?: {
    page: number
    pageSize: number  
    total: number
    onPageChange: (page: number) => void
  }
  onRowClick?: (row: T) => void
}

// Para inventario y reportes:
<DataTable
  data={inventoryItems}
  columns={[
    { key: 'name', label: 'Producto', sortable: true },
    { key: 'stock', label: 'Stock', render: (stock) => <Badge variant={stock < 10 ? 'error' : 'success'}>{stock}</Badge> },
    { key: 'parLevel', label: 'Par Level' }
  ]}
  pagination={{ page: 1, pageSize: 20, total: 100, onPageChange: setPage }}
/>
```

#### 🎛️ FormGroup Component
```typescript
interface FormGroupProps {
  label?: string
  required?: boolean
  error?: string
  helpText?: string
  children: ReactNode
}

// Agrupación de inputs relacionados:
<FormGroup label="Datos de Facturación" required>
  <Input label="RFC" required />
  <Input label="Email" type="email" />
  <Select label="Uso de CFDI" options={cfdiUses} />
</FormGroup>
```

### 4. Componentes Organizacionales (Organisms)

#### 🧭 Navigation Component  
```typescript
interface NavItem {
  label: string
  icon: ReactNode
  href?: string
  onClick?: () => void
  badge?: number
  active?: boolean
  disabled?: boolean
}

interface NavigationProps {
  items: NavItem[]
  variant: 'sidebar' | 'bottom' | 'top'
  collapsed?: boolean
  onToggle?: () => void
}

// Navegación principal POS:
<Navigation 
  variant="sidebar"
  items={[
    { label: 'POS', icon: <CashRegisterIcon />, href: '/pos' },
    { label: 'Inventario', icon: <BoxIcon />, href: '/inventory', badge: 5 },
    { label: 'Reportes', icon: <ChartIcon />, href: '/reports' },
    { label: 'Configuración', icon: <SettingsIcon />, href: '/settings' }
  ]}
/>
```

#### 🛒 ShoppingCart Component
```typescript  
interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  modifiers?: Array<{ name: string; price: number }>
  image?: string
}

interface ShoppingCartProps {
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemoveItem: (id: string) => void
  onClear: () => void
  onCheckout: () => void
}

// Carrito lateral del POS:
<ShoppingCart 
  items={cartItems}
  subtotal={160}
  tax={25.6}
  total={185.6}
  onUpdateQuantity={updateQuantity}
  onCheckout={goToCheckout}
/>
```

#### 📋 ChecklistExecutor Component
```typescript
interface ChecklistItem {
  id: string
  label: string
  type: 'boolean' | 'number' | 'photo' | 'signature' | 'temperature'
  required: boolean
  value?: any
  options?: string[]
}

interface ChecklistExecutorProps {
  title: string
  items: ChecklistItem[]
  onItemChange: (id: string, value: any) => void
  onSubmit: (data: Record<string, any>) => void
  onCancel: () => void
}

// Para checklists de calidad:
<ChecklistExecutor
  title="Checklist Apertura - Turno Mañana" 
  items={openingChecklist}
  onItemChange={updateChecklistItem}
  onSubmit={submitChecklist}
/>
```

### 5. Layout Templates

#### 🏪 POS Layout
```typescript
interface POSLayoutProps {
  sidebar?: ReactNode
  navigation?: ReactNode  
  main: ReactNode
  cart?: ReactNode
  header?: ReactNode
}

// Layout principal del POS:
<POSLayout
  header={<POSHeader user={currentUser} shift={activeShift} />}
  navigation={<Navigation items={navItems} />}
  main={<ProductCatalog products={products} />}
  cart={<ShoppingCart items={cartItems} />}
/>
```

#### 📊 Dashboard Layout  
```typescript
interface DashboardLayoutProps {
  sidebar: ReactNode
  header: ReactNode
  main: ReactNode
  breadcrumbs?: ReactNode
}

// Layout para reportes y administración:
<DashboardLayout
  header={<DashboardHeader />}
  sidebar={<DashboardSidebar />}
  breadcrumbs={<Breadcrumbs items={breadcrumbItems} />}
  main={<KPIDashboard />}
/>
```

## 🎯 Criterios de Aceptación

### Component Quality Gates
- [ ] ✅ **TypeScript compliance**: 100% tipado estático
- [ ] ✅ **Accessibility**: WCAG 2.1 AA para todos los componentes  
- [ ] ✅ **Responsive design**: Funciona en todos los breakpoints
- [ ] ✅ **Performance**: <16ms render time, memoization apropiada

### Testing Requirements
- [ ] ✅ **Unit tests**: >90% coverage con Jest + React Testing Library
- [ ] ✅ **Visual regression**: Chromatic para detectar cambios UI
- [ ] ✅ **Accessibility tests**: axe-core integration
- [ ] ✅ **Cross-browser**: Chrome, Safari, Firefox, Edge

### Documentation Standards  
- [ ] ✅ **Storybook**: Todos los componentes documentados con casos de uso
- [ ] ✅ **Props documentation**: JSDoc completa para cada prop
- [ ] ✅ **Design tokens**: Exportados para uso en Figma/Sketch
- [ ] ✅ **Migration guide**: Para actualizar entre versiones

## 🛠️ Stack Tecnológico

### Core Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0", 
  "typescript": "^5.0.0",
  "tailwindcss": "^3.3.0",
  "framer-motion": "^10.0.0",
  "clsx": "^2.0.0",
  "class-variance-authority": "^0.7.0"
}
```

### Development Tools
```json
{
  "@storybook/react": "^7.0.0",
  "@testing-library/react": "^14.0.0",
  "@testing-library/jest-dom": "^6.0.0",
  "chromatic": "^7.0.0",
  "@axe-core/react": "^4.8.0",
  "rollup": "^3.0.0"
}
```

### Build Configuration
- [ ] **Rollup**: Bundling optimizado con tree-shaking
- [ ] **PostCSS**: Procesamiento de Tailwind + autoprefixer  
- [ ] **ESLint + Prettier**: Linting y formatting consistency
- [ ] **Husky**: Pre-commit hooks para quality gates

## 🚀 Entregables Finales

### 1. NPM Package: @coffeeos/ui
```bash
npm install @coffeeos/ui

# Usage in apps:
import { Button, Input, Card } from '@coffeeos/ui'
import '@coffeeos/ui/styles.css'
```

### 2. Storybook Documentation  
- [ ] **Component library**: https://ui.coffeeos.dev
- [ ] **Design tokens**: Página dedicada con valores exportables  
- [ ] **Usage guidelines**: Do's and don'ts para cada componente
- [ ] **Playground**: Sandbox para probar combinaciones

### 3. Figma Design System
- [ ] **Component library**: Símbolos sincronizados con código
- [ ] **Design tokens**: Variables de color, tipografía, spacing
- [ ] **Usage examples**: Pantallas reales usando los componentes
- [ ] **Developer handoff**: Specs automáticas con medidas exactas

### 4. Testing Infrastructure
```typescript
// Ejemplo de test automatizado
describe('Button Component', () => {
  it('renders with correct variant styling', () => {
    render(<Button variant="primary">Click me</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary-500')
  })
  
  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
  
  it('meets accessibility standards', async () => {
    const { container } = render(<Button>Accessible button</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

## 🔗 Dependencies & Handoffs

### ⬅️ Inputs Needed
- [ ] ✅ **Design specifications** de TODO 02
- [ ] ✅ **Brand assets**: logos, iconografía, fotografías
- [ ] ✅ **Accessibility requirements**: nivel de compliance esperado
- [ ] ✅ **Performance targets**: tiempo de render, bundle size

### ➡️ Outputs for Next Phase  
- [ ] ✅ **Component library** → TODO 07 (Interfaz POS Web PWA)
- [ ] ✅ **Design system** → TODO 11 (Interfaz Inventario y Recetas)  
- [ ] ✅ **Testing patterns** → TODO 24 (Testing Integral)
- [ ] ✅ **Performance baseline** → TODO 25 (Infraestructura Producción)

---

**⏰ Deadline**: Viernes Semana 3  
**👥 Stakeholders**: Frontend Lead, UI Developer, UX Designer  
**📦 Deliverable**: @coffeeos/ui v1.0.0 published to NPM  

*Consistency is key - build once, use everywhere! 🧱✨*