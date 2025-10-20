# 🎨 TODO 02: Diseño UX Sistema POS

**Período**: Semana 1-2  
**Owner**: UX Designer + Frontend Lead  
**Prioridad**: 🔴 CRÍTICA  

## 📋 Objetivos

Diseñar la interfaz de usuario del sistema POS que sea intuitiva, eficiente y optimizada para el ambiente de alta presión de una cafetería durante horas pico.

## ✅ Entregables

### 1. Wireframes de Pantallas POS Core

#### 🏠 Dashboard Principal - Catálogo de Productos
- [ ] **Grid responsive de productos** (4x4 tablet, 6x6 desktop)
  - Cards con foto, nombre, precio
  - Indicadores de stock bajo
  - Badges de promociones activas
  - Filtros por categoría (Espresso, Filter, Cold, Food)

- [ ] **Carrito lateral fijo** (30% del ancho)
  - Lista de productos añadidos
  - Modificadores aplicados por ítem  
  - Subtotal actualizado en tiempo real
  - Botones: Limpiar, Descuento, Checkout

- [ ] **Header de sesión**
  - Usuario logueado + turno activo
  - Caja asignada + balance inicial
  - Hora actual + ticker de tickets del día
  - Botón emergencia + settings

```figma
┌─────────────────────────────────────────────┐
│ ☕ CoffeeOS | Juan Pérez | Caja 1 | 14:32  │
├─────────────────────────┬───────────────────┤
│ Espresso  Filter  Cold  │   CARRITO (3)     │
│ ┌─────┐ ┌─────┐ ┌─────┐ │ • Americano $45   │  
│ │Amer │ │V60  │ │Cold │ │   + Leche Oat     │
│ │$45  │ │$65  │ │$55  │ │ • Capuccino $55   │
│ └─────┘ └─────┘ └─────┘ │ • Croissant $35   │
│ ┌─────┐ ┌─────┐ ┌─────┐ │                   │
│ │Cap  │ │Ches │ │Frap │ │ Subtotal: $135    │
│ │$55  │ │$70  │ │$65  │ │ [PAGAR] [LIMPIAR] │
│ └─────┘ └─────┘ └─────┘ │                   │
└─────────────────────────┴───────────────────┘
```

#### 🔧 Modal de Modificadores
- [ ] **Overlay contextual** por categoría de producto
  - Leches: Regular, Deslactosada, Oat, Soy, Almendra
  - Tamaños: 8oz (+$0), 12oz (+$10), 16oz (+$15)  
  - Extras: Shot extra (+$15), Sirope (+$10), Crema (+$5)
  - Descafeinado: Sí/No toggle

- [ ] **Visual feedback**
  - Delta de precio por modificador
  - Preview del producto final
  - Shortcuts de teclado (1,2,3...)
  - Botón "Agregar al carrito" prominente

```figma
┌─────────────────────────────────────┐
│         AMERICANO - $45             │
├─────────────────────────────────────┤
│ LECHE                               │
│ ○ Regular  ● Oat (+$5)  ○ Soy (+$3)│
│                                     │ 
│ TAMAÑO                              │
│ ○ 8oz  ● 12oz (+$10)  ○ 16oz (+$15)│
│                                     │
│ EXTRAS                              │
│ ☐ Shot extra (+$15) ☑ Sirope (+$10)│
│                                     │
│ TOTAL: $70          [AGREGAR] [✖]   │
└─────────────────────────────────────┘
```

#### 💳 Pantalla de Checkout y Pagos
- [ ] **Resumen de orden detallado**
  - Lista expandida con modificadores
  - Subtotal, impuestos, propina sugerida
  - Opciones de descuento (empleado, loyalty, promo)

- [ ] **Métodos de pago múltiples**
  - Efectivo con calculadora de cambio
  - Tarjeta (Clip, MercadoPago, BBVA)
  - Transferencia SPEI
  - Puntos de lealtad (9+1)
  - Combinación de métodos

- [ ] **Flujo de facturación CFDI**
  - Toggle "¿Requiere factura?"
  - Captura RFC con validación SAT
  - Email del cliente
  - Uso de CFDI (dropdown)

```figma
┌─────────────────────────────────────────────┐
│              CHECKOUT - Ticket #147         │
├─────────────────────────────────────────────┤
│ • Americano 12oz + Oat + Sirope      $70   │
│ • Capuccino 8oz                      $55   │  
│ • Croissant Jamón                    $35   │
│                                             │
│ Subtotal:                           $160   │
│ IVA (16%):                          $25.6  │
│ Propina sugerida (10%):             $16    │
│ ────────────────────────────────────────── │
│ TOTAL:                              $201.6 │
│                                             │
│ PAGO: [Efectivo] [Tarjeta] [Transfer]      │
│ ☐ Requiere factura (RFC: __________)       │  
│                                             │
│ [PROCESAR PAGO]        [← MODIFICAR]       │
└─────────────────────────────────────────────┘
```

### 2. Flujo de Pagos Múltiples

#### 💵 Pago Efectivo
- [ ] **Calculadora de cambio inteligente**
  - Denominaciones comunes ($20, $50, $100, $200, $500)
  - Cálculo automático de cambio
  - Sugerencia de billetes para dar cambio
  - Validación de caja suficiente

#### 💳 Pago con Tarjeta  
- [ ] **Integración con terminales locales**
  - Clip: SDK JavaScript + webhook confirmación
  - MercadoPago: Point integration + QR dinámico
  - BBVA: Terminal API + receipt parsing
  - Status en tiempo real: procesando → aprobado/rechazado

#### 📱 Pago Combinado
- [ ] **Split payment workflow**
  - $100 efectivo + $101.6 tarjeta = ejemplo
  - Tracking de pagos parciales aplicados
  - Rollback si falla el segundo método
  - Receipt consolidado con ambos métodos

### 3. Interfaz de Impresión y Recibos

#### 🖨️ Impresión Térmica (80mm)
- [ ] **Template de recibo optimizado**
```
     ☕ COFFEE HOUSE ROMA ☕
     Sucursal Centro - Caja 1
     RFC: ABC123456789
     ─────────────────────────
     
     Ticket: #147
     Fecha: 15/10/2025 14:32
     Cajero: Juan Pérez
     
     • Americano 12oz         $45.00
       + Leche Oat            $5.00
       + Sirope Vainilla      $10.00
     • Capuccino 8oz          $55.00
     • Croissant Jamón        $35.00
     
     ─────────────────────────
     Subtotal:               $160.00
     IVA (16%):              $25.60
     Propina:                $16.00
     ─────────────────────────
     TOTAL:                  $201.60
     
     PAGO EFECTIVO:          $100.00
     PAGO TARJETA:           $101.60
     
     ¡Gracias por tu visita!
     
     ☕ Síguenos @coffeeroma
     📱 WhatsApp: 55-1234-5678
     ⭐ ¿Cómo estuvo tu experiencia?
     
     ─────────────────────────
```

- [ ] **Print queue management**  
  - Cola de impresión con retry automático
  - Fallback a PDF si impresora falla
  - Preview antes de imprimir
  - Reimpresión de último ticket

### 4. Estados de Error y Edge Cases

#### ⚠️ Manejo de Errores Críticos
- [ ] **Sin conexión a internet**
  - Modo offline completo activado
  - Queue de transacciones pendientes
  - Indicador visual de estado offline
  - Sincronización automática al reconectar

- [ ] **Impresora desconectada** 
  - Alerta visual + sonora
  - Opción de continuar sin imprimir
  - Envío de recibo por WhatsApp/Email
  - Log de tickets no impresos

- [ ] **Terminal de pago offline**
  - Modo "sólo efectivo" temporal
  - Notificación al cliente
  - Log de ventas perdidas por método
  - Reintento automático cada 5 min

#### 🔄 Loading States y Feedback
- [ ] **Micro-interactions fluidas**
  - Loading spinners contextuales  
  - Success animations (checkmark, confetti)
  - Error states con acción clara
  - Progress indicators para procesos largos

## 📱 Responsive Design Considerations

### 📏 Breakpoints Definidos
- **Tablet POS (768px - 1024px)**: Layout principal optimizado
- **Desktop manager (>1024px)**: Sidebar adicional con analytics
- **Móvil emergency (320px - 768px)**: Solo funciones críticas

### 👆 Touch Optimization
- [ ] **Targets de toque mínimo 44px**
- [ ] **Gestos intuitivos**: swipe para eliminar, tap & hold para modificar
- [ ] **Feedback háptico** en dispositivos compatibles
- [ ] **Accesibilidad**: contraste AA, focus visible, screen reader

## 🎯 Criterios de Aceptación

### Performance UX
- [ ] ✅ Transición entre pantallas < 200ms
- [ ] ✅ Respuesta a toque < 100ms  
- [ ] ✅ Carga inicial del catálogo < 2 segundos
- [ ] ✅ Flujo completo venta → recibo < 60 segundos

### Usability Testing Results
- [ ] ✅ Usuario nuevo completa venta en < 3 minutos sin ayuda
- [ ] ✅ Barista experimentado promedia < 45 segundos por orden
- [ ] ✅ 0 errores críticos en 50 transacciones de prueba
- [ ] ✅ 90%+ satisfaction rating en testing con usuarios reales

### Accessibility Compliance  
- [ ] ✅ WCAG 2.1 AA compliance verificado
- [ ] ✅ Navigation completamente por teclado
- [ ] ✅ Screen reader compatibility tested
- [ ] ✅ Color contrast ratio > 4.5:1 en todos los elementos

## 🛠️ Herramientas y Assets

### Design Tools
- **Figma**: Wireframes, prototypes, design system
- **Principle/Framer**: Micro-interactions y animations  
- **Zeplin**: Specs para developers con assets exportados
- **Stark**: Accessibility testing plugin para Figma

### Asset Requirements
- [ ] **Iconografía custom**: 50+ íconos coffee-themed
- [ ] **Ilustraciones de productos**: 20+ bebidas + 10+ food items
- [ ] **Fotografías de ambiente**: cafetería real, equipo, baristas
- [ ] **Logo variations**: horizontal, vertical, monochrome, favicon

## 🚀 Entregables Finales

### 1. Design System Documentation
```figma-specs
# CoffeeOS Design System v1.0

## Color Palette
- Primary: #8B4513 (Coffee Brown)
- Secondary: #F4E4BC (Cream)  
- Success: #22C55E
- Warning: #F59E0B
- Error: #EF4444
- Neutral: #64748B scale

## Typography  
- Headers: Inter Bold 24/32/40px
- Body: Inter Regular 14/16/18px
- Captions: Inter Medium 12/14px
- Monospace: Fira Code (receipts, codes)

## Spacing Scale
- 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px

## Component Library
- 25+ components documented con variants
- Props y states definidos
- Usage guidelines y do/don'ts
```

### 2. Interactive Prototypes
- [ ] 📱 **POS Flow completo**: navegable en Figma/Principle
- [ ] 💳 **Payment scenarios**: efectivo, tarjeta, combinado, error
- [ ] 📊 **Manager dashboard**: KPIs, reportes, configuración
- [ ] ✅ **Mobile checklists**: captura, evidencia, firma

### 3. Technical Handoff Package
- [ ] **React component architecture**: props, states, composition
- [ ] **API integration points**: endpoints necesarios por pantalla
- [ ] **Performance requirements**: loading, animations, transitions
- [ ] **PWA specifications**: offline behavior, installation prompts

## 🔗 Dependencies & Handoffs

### ⬅️ Inputs Needed  
- [ ] ✅ **User research results** de TODO 01
- [ ] ✅ **Technical constraints** del Tech Lead
- [ ] ✅ **Brand guidelines** y assets existentes
- [ ] ✅ **Hardware specs** de tablets POS a usar

### ➡️ Outputs for Next Phase
- [ ] ✅ **Component specifications** → TODO 03 (Componentes UI Base)
- [ ] ✅ **API requirements** → TODO 04 (API Core - Autenticación)
- [ ] ✅ **Responsive breakpoints** → TODO 07 (Interfaz POS Web)
- [ ] ✅ **Performance targets** → TODO 24 (Testing Integral)

---

**⏰ Deadline**: Jueves Semana 2  
**👥 Stakeholders**: UX Designer, Frontend Lead, Product Manager  
**📧 Review with**: Gerentes de cafeterías (3) + Baristas (2)  

*Great design is invisible - it just works! 🎨✨*