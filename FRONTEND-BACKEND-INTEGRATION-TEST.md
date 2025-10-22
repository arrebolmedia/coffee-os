# Frontend-Backend Integration Testing Guide

## 🚀 Quick Start

### Prerequisites

1. **Docker Desktop** must be running (for PostgreSQL database)
2. **Node.js 18+** installed
3. **PowerShell** (for Windows) or Bash (for Linux/Mac)

### Step 1: Start Backend Services

```powershell
# Navigate to project root
cd c:\Projects\CoffeeOS

# Start Docker containers and database
.\scripts\start-services.ps1

# This will:
# - Start PostgreSQL on port 5434
# - Run Prisma migrations
# - Start NestJS API on port 4000
```

### Step 2: Start Frontend Application

```powershell
# In a new terminal
cd c:\Projects\CoffeeOS

# Start Admin Dashboard
npm run dev:admin

# Or manually:
cd apps\admin-web
npm run dev
```

The admin dashboard will be available at: **http://localhost:3002**

---

## 🧪 Testing Workflow

### 1. Register a New User

Since this is the first time running the app, you'll need to register a user.

**Option A: Using the API directly**

```powershell
# Run the auth test script
.\scripts\test-auth.ps1

# This will register a test user and get tokens
```

**Option B: Using Postman/Insomnia**

```http
POST http://localhost:4000/api/v1/auth/register
Content-Type: application/json

{
  "email": "admin@coffeeos.com",
  "password": "Admin123!",
  "name": "Admin User",
  "phone": "+52 55 1234 5678"
}
```

**Option C: Create a register page** (TODO)

---

### 2. Login via Admin Dashboard

1. Navigate to: **http://localhost:3002/login**
2. Enter credentials:
   - Email: `admin@coffeeos.com`
   - Password: `Admin123!`
3. Click "Iniciar Sesión"
4. You should be redirected to the dashboard

---

### 3. Test Dashboard

Once logged in, verify the following:

#### ✅ Dashboard Stats
- Sales stats should load (may show $0.00 if no orders yet)
- Orders count
- Customers count
- Average ticket

#### ✅ Recent Orders Table
- Should display recent orders
- Empty state if no orders

#### ✅ Sales Chart
- Should show last 7 days trend
- May be empty initially

---

### 4. Test Products CRUD

Navigate to **Productos** from the sidebar.

#### Create Product

```powershell
# Using test-api.ps1
.\scripts\test-api.ps1

# This will create sample products
```

Or manually via API:

```http
POST http://localhost:4000/api/v1/products
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "Café Americano",
  "description": "Café negro preparado en cafetera",
  "type": "SIMPLE",
  "price": 35.00,
  "cost": 15.00,
  "sku": "CAF-001",
  "track_inventory": true,
  "current_stock": 100,
  "min_stock": 20
}
```

#### View Products List
1. Navigate to **Productos**
2. Verify products appear in table
3. Check pagination works
4. Test search functionality

#### Edit Product
1. Click edit button on any product
2. Modify fields
3. Save changes
4. Verify changes reflect immediately

#### Upload Product Image
1. Click on a product
2. Upload image (max 5MB, JPG/PNG/WebP)
3. Verify image appears
4. Check thumbnails generated (small, medium, large)

#### Delete Product
1. Click delete button
2. Confirm deletion
3. Verify product removed from list

#### Bulk Operations
1. Select multiple products (checkboxes)
2. Click "Eliminar" bulk button
3. Confirm bulk deletion
4. Verify all selected products deleted

---

### 5. Test Authentication Flow

#### Token Refresh
1. Wait for token to expire (or manually invalidate)
2. Make an API call
3. Verify automatic token refresh
4. Request should succeed after refresh

#### Logout
1. Click user menu (top right)
2. Click "Cerrar Sesión"
3. Verify redirect to login page
4. Verify tokens cleared from localStorage

#### Protected Routes
1. Log out
2. Try accessing `/dashboard` or `/productos`
3. Should redirect to `/login`
4. After login, should redirect back to original URL

---

## 🔍 Testing Checklist

### Backend API

- [x] ✅ Products CRUD (18 endpoints)
- [x] ✅ Categories CRUD (15 endpoints)
- [x] ✅ Orders CRUD (14 endpoints)
- [x] ✅ JWT Authentication (6 endpoints)
- [x] ✅ Image Upload (2 endpoints)
- [x] ✅ Global JWT Guard
- [x] ✅ Prisma ORM Integration

### Frontend Integration

- [ ] 🔄 User Registration Flow
- [ ] 🔄 Login Authentication
- [ ] 🔄 Dashboard Data Fetching
  - [ ] Stats cards with real data
  - [ ] Recent orders table
  - [ ] Sales chart
- [ ] 🔄 Products Management
  - [ ] List products (pagination)
  - [ ] Create product
  - [ ] Edit product
  - [ ] Delete product
  - [ ] Bulk delete
  - [ ] Search products
  - [ ] Filter products
- [ ] 🔄 Image Upload
  - [ ] Upload product image
  - [ ] Display thumbnails
  - [ ] Delete image
- [ ] 🔄 Error Handling
  - [ ] 401 Unauthorized (auto logout)
  - [ ] 404 Not Found
  - [ ] 500 Server Error
  - [ ] Network errors (backend down)
- [ ] 🔄 Loading States
  - [ ] Skeleton screens
  - [ ] Loading spinners
  - [ ] Progress indicators (image upload)

---

## 🐛 Troubleshooting

### Backend Not Starting

**Error: Docker not running**
```
Solution: Start Docker Desktop manually
```

**Error: Port 4000 already in use**
```powershell
# Find process using port 4000
netstat -ano | findstr :4000

# Kill the process
taskkill /PID <PID> /F
```

**Error: Database connection failed**
```powershell
# Verify PostgreSQL is running
docker ps

# Check logs
docker logs coffeeos-postgres
```

### Frontend Not Connecting to Backend

**Error: CORS errors in console**
```typescript
// In apps/api/src/main.ts
app.enableCors({
  origin: 'http://localhost:3002',
  credentials: true,
});
```

**Error: 404 on API calls**
```
Verify API_URL in .env.local:
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

**Error: Network error**
```
1. Check backend is running: http://localhost:4000/api/v1/health
2. Check browser console for errors
3. Verify auth token in localStorage
```

### Authentication Issues

**Error: 401 Unauthorized on all requests**
```
1. Check auth_token in localStorage
2. Verify token hasn't expired
3. Try logging out and back in
4. Check API response in Network tab
```

**Error: Infinite redirect loop**
```
Solution: Clear localStorage and cookies
localStorage.clear();
```

---

## 📊 Expected Results

### With Empty Database

- Dashboard shows $0.00 sales
- Recent orders: "No hay órdenes recientes"
- Products: "No hay productos"
- All components should render without errors

### After Creating Test Data

- Dashboard shows real statistics
- Recent orders table populated
- Products list shows items
- All CRUD operations work smoothly

---

## 🎯 Next Steps

After successful integration testing:

1. **Implement Missing Features**
   - [ ] Product creation form/modal
   - [ ] Product edit form/modal
   - [ ] Category management
   - [ ] Order creation (POS)
   - [ ] Customer management

2. **Add More Endpoints**
   - [ ] Categories API service
   - [ ] Customers API service
   - [ ] Inventory management

3. **Improve UX**
   - [ ] Better error messages
   - [ ] Toast notifications on actions
   - [ ] Optimistic updates
   - [ ] Infinite scroll for long lists

4. **Production Ready**
   - [ ] Environment variables validation
   - [ ] Error boundaries
   - [ ] Logging and monitoring
   - [ ] Performance optimization
   - [ ] Security hardening

---

## 📝 Notes

- Backend runs on **http://localhost:4000**
- Frontend runs on **http://localhost:3002**
- PostgreSQL runs on **localhost:5434**
- All API endpoints are under `/api/v1` prefix
- All routes except `/login` require authentication
- Tokens are stored in localStorage
- Images are served from `/uploads/*` (public access)

---

## 🆘 Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review backend logs in terminal
3. Check browser console for errors
4. Verify all services are running
5. Check `STATUS.md` for known issues

---

**Last Updated:** October 22, 2025
**Version:** 1.0.0
