# 🎯 Performance Optimization Guide

## 📊 Performance Targets

| Metric | Target | Tool |
|--------|--------|------|
| **Lighthouse Performance** | > 90 | Lighthouse CI |
| **First Contentful Paint (FCP)** | < 1.5s | Web Vitals |
| **Largest Contentful Paint (LCP)** | < 2.5s | Web Vitals |
| **Cumulative Layout Shift (CLS)** | < 0.1 | Web Vitals |
| **First Input Delay (FID)** | < 100ms | Web Vitals |
| **Time to Interactive (TTI)** | < 3.5s | Lighthouse |
| **Bundle Size (JS)** | < 200KB (gzipped) | Webpack Bundle Analyzer |

---

## ⚡ Optimizations Implemented

### **1. Image Optimization**

```typescript
// ✅ Using Next.js Image component
import Image from 'next/image';

<Image
  src={product.image_url}
  alt={product.name}
  fill
  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
  className="object-cover"
/>
```

**Benefits:**
- Automatic WebP/AVIF conversion
- Responsive images
- Lazy loading by default
- Blur placeholder support

### **2. Code Splitting**

```typescript
// ✅ Dynamic imports for heavy components
const PaymentModal = dynamic(() => import('@/components/pos/PaymentModal'), {
  loading: () => <Spinner />,
  ssr: false,
});

const ReceiptPrinter = dynamic(() => import('@/components/pos/ReceiptPrinter'), {
  ssr: false,
});
```

### **3. React Query Configuration**

```typescript
// ✅ Optimized caching strategy
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### **4. Zustand Persistence**

```typescript
// ✅ Selective persistence
persist(
  (set, get) => ({
    // store logic
  }),
  {
    name: 'coffeeos-cart',
    partialize: (state) => ({ cart: state.cart }), // Only persist cart
  }
)
```

### **5. IndexedDB for Offline**

- Products cached locally
- Orders queued for sync
- Reduces API calls
- Instant load times

---

## 🚀 Additional Optimizations to Implement

### **1. Virtual Scrolling** (Large Product Catalogs)

```bash
npm install @tanstack/react-virtual
```

```typescript
// src/components/pos/ProductCatalogVirtual.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function ProductCatalogVirtual({ products }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280, // Product card height
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ProductCard product={products[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**When to use:**
- Catalogs with > 200 products
- Mobile devices
- Slow networks

### **2. Debounced Search**

```typescript
// src/hooks/use-debounced-value.ts
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

```typescript
// Usage in SearchInput
const [search, setSearch] = useState('');
const debouncedSearch = useDebouncedValue(search, 300);

useEffect(() => {
  // Trigger search with debouncedSearch
}, [debouncedSearch]);
```

### **3. Memoization**

```typescript
// ✅ Expensive calculations
const cartTotal = useMemo(() => {
  return cart.items.reduce((sum, item) => sum + item.subtotal, 0);
}, [cart.items]);

// ✅ Callbacks that shouldn't recreate
const handleAddToCart = useCallback((product: Product) => {
  addItem(product, 1);
}, [addItem]);

// ✅ Heavy components
const ProductList = memo(({ products, onSelect }: Props) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});
```

### **4. Bundle Analysis**

```bash
# Add to package.json
npm install -D @next/bundle-analyzer

# Enable in next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true npm run build
```

**Identify:**
- Large dependencies
- Duplicate code
- Unnecessary imports
- Tree-shaking opportunities

### **5. Service Worker Strategies**

```typescript
// public/sw.js - Already using Workbox

// Cache strategies by resource type:
// - App shell: Cache First
// - API calls: Network First with cache fallback
// - Images: Cache First with network update
// - Static assets: Cache First (immutable)
```

**Optimizations:**
- Precache app shell and critical routes
- Runtime caching for dynamic content
- Background sync for failed requests
- Cache versioning for updates

### **6. Font Optimization**

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }: Props) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

```css
/* globals.css */
:root {
  font-family: var(--font-inter), system-ui, sans-serif;
}
```

### **7. Prefetching Critical Routes**

```typescript
// app/pos/page.tsx
import Link from 'next/link';

// ✅ Prefetch on hover
<Link href="/inventory" prefetch={true}>
  Inventario
</Link>

// Or programmatic prefetch
import { useRouter } from 'next/navigation';

const router = useRouter();

useEffect(() => {
  // Prefetch likely next route
  router.prefetch('/checkout');
}, [router]);
```

### **8. API Response Compression**

```typescript
// Backend (NestJS) - Already configured
// apps/api/src/main.ts
import compression from 'compression';

app.use(compression());
```

### **9. Database Query Optimization**

```typescript
// ✅ Use indexes
// packages/database/prisma/schema.prisma
model Product {
  @@index([category_id])
  @@index([status])
  @@index([organization_id, location_id])
}

// ✅ Select only needed fields
const products = await prisma.product.findMany({
  select: {
    id: true,
    name: true,
    price: true,
    image_url: true,
    status: true,
  },
  where: { status: 'ACTIVE' },
});

// ✅ Pagination
const products = await prisma.product.findMany({
  take: 50, // Limit
  skip: (page - 1) * 50, // Offset
});
```

### **10. Reduce Re-renders**

```typescript
// ✅ Split large components
// Instead of one giant POS component:
// - ProductCatalog
// - Cart
// - CategoryFilter
// - SearchBar

// ✅ Use React.memo for pure components
export const CategoryFilter = memo(({ categories, onSelect }: Props) => {
  // ...
});

// ✅ Avoid inline object/function creation
// ❌ Bad
<ProductCard product={product} style={{ margin: 10 }} />

// ✅ Good
const cardStyle = { margin: 10 };
<ProductCard product={product} style={cardStyle} />
```

---

## 📈 Monitoring Tools

### **1. Web Vitals**

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: Props) {
  return (
    <html lang="es">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### **2. Lighthouse CI**

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm install -g @lhci/cli
      - run: lhci autorun
```

```json
// lighthouserc.json
{
  "ci": {
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "performance": ["error", { "minScore": 0.9 }],
        "accessibility": ["error", { "minScore": 0.9 }],
        "best-practices": ["error", { "minScore": 0.9 }],
        "seo": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

### **3. Bundle Size Tracking**

```bash
# Check bundle size
npm run build

# Compare before/after
bundlewatch --config bundlewatch.config.json
```

---

## 🎯 Performance Checklist

### **Images**
- [x] Using Next.js Image component
- [x] Responsive sizes attribute
- [ ] WebP/AVIF format
- [ ] Lazy loading
- [ ] Blur placeholder

### **JavaScript**
- [x] Code splitting with dynamic()
- [x] Tree shaking (automatic with Next.js)
- [ ] Minification (production build)
- [ ] Bundle analysis
- [ ] Remove console.logs in prod

### **Caching**
- [x] Service Worker (Workbox)
- [x] IndexedDB for offline
- [x] React Query caching
- [x] HTTP caching headers
- [ ] CDN (Vercel Edge Network)

### **CSS**
- [x] Tailwind CSS (JIT mode)
- [x] CSS purging (automatic)
- [ ] Critical CSS inline
- [ ] Remove unused styles

### **Network**
- [x] API response compression (gzip)
- [ ] HTTP/2 server push
- [ ] Resource hints (preload, prefetch)
- [ ] Reduce API calls with batching

### **Rendering**
- [x] Server Components where possible
- [ ] Streaming SSR
- [ ] Partial hydration
- [ ] Lazy load below-the-fold

---

## 🔍 Profiling

### **React DevTools Profiler**

1. Install React DevTools extension
2. Open Profiler tab
3. Click "Record"
4. Perform actions
5. Stop recording
6. Analyze flamegraph

Look for:
- Long render times (> 16ms)
- Frequent re-renders
- Large component trees

### **Chrome DevTools Performance**

1. Open DevTools → Performance
2. Click Record
3. Perform user interactions
4. Stop recording
5. Analyze timeline

Focus on:
- Long tasks (> 50ms)
- Layout thrashing
- Forced reflows
- Memory leaks

---

## 📚 Resources

- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Web.dev Performance](https://web.dev/performance/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

---

**Status**: Configuration complete, implementation of advanced optimizations pending

**Priority**: Medium (can be done iteratively as performance issues arise)

**Estimated Impact**: 20-30% improvement in load times and FCP with virtual scrolling and further code splitting
