# 🚀 START HERE - CoffeeOS Testing Guide

**Última actualización**: 28 de Octubre, 2025  
**Status**: 🟢 **READY FOR TESTING**

---

## ⚡ Quick Start (2 minutos)

### 1️⃣ Verificar Sistema

```powershell
# En la raíz del proyecto
.\scripts\verify-endpoints.ps1
```

**Esperado**: ✅ Backend y Frontend activos

---

### 2️⃣ Acceder a la Aplicación

```
🌐 URL:      http://localhost:3001
📧 Email:    owner@coffeedemo.mx
🔑 Password: password123
```

---

### 3️⃣ Probar Módulos

Abre el navegador en **http://localhost:3001** y:

✅ **Login** → Debe funcionar con las credenciales de arriba  
✅ **Dashboard** → Debe cargar sin errores  
✅ **Recetas** → Debe mostrar 6 recetas  
✅ **Proveedores** → Debe mostrar 12 proveedores  
✅ **Inventario** → Debe mostrar 8 items

---

## 📚 Documentación Completa

### Para Usuarios (Non-Technical)

📖 **[TESTING-READY.md](./TESTING-READY.md)**  
→ Instrucciones paso a paso para probar el sistema

### Para Testers

📋 **[TESTING-CHECKLIST.md](./TESTING-CHECKLIST.md)**  
→ Checklist detallado de todas las pruebas a realizar

### Para Developers

🔧 **[TESTING-SUMMARY.md](./TESTING-SUMMARY.md)**  
→ Resumen técnico de todas las soluciones implementadas

### Referencia de Errores

🗺️ **[ERRORS-MAPPING.md](./ERRORS-MAPPING.md)**  
→ Mapeo completo de errores y sus soluciones

---

## 🛠️ Scripts Disponibles

### Verificación de Endpoints

```powershell
.\scripts\verify-endpoints.ps1
```

Verifica que Backend y Frontend estén activos y endpoints respondan.

### Verificación de Datos

```powershell
cd packages\database
npx tsx verify-seed.ts
```

Muestra todos los datos sembrados en la base de datos.

### Iniciar Servicios (si no están corriendo)

```powershell
# Terminal 1 - Backend
cd apps\api
npm run dev

# Terminal 2 - Frontend
cd apps\pos-web
npm run dev
```

---

## ✅ Qué Se Arregló

### 1. Global Interceptor

**Problema**: Muchos requests faltaba `organization_id`  
**Solución**: Interceptor global que lo agrega automáticamente  
**Impacto**: ✅ Elimina ~80% de errores "organization_id must be UUID"

### 2. Error Handling Mejorado

**Problema**: Cascadas de toasts rojos por errores no críticos  
**Solución**: Solo toasts para errores críticos (401/403/500)  
**Impacto**: ✅ Mejor UX, menos ruido visual

### 3. Seed Data Completo

**Problema**: Base de datos vacía, módulos mostraban 404  
**Solución**: Seed con suppliers, inventory items, recipes  
**Impacto**: ✅ Todos los módulos tienen datos para mostrar

### 4. Endpoints Implementados

**Problema**: Frontend llamaba rutas que no existían  
**Solución**: 4 nuevos endpoints en suppliers controller  
**Impacto**: ✅ Módulo de Proveedores funciona correctamente

---

## 🎯 Qué Esperar

### ✅ Debe Funcionar

- Login con credenciales demo
- Dashboard carga sin errores
- Módulos muestran datos seed
- Navegación fluida entre secciones
- Consola sin errores críticos

### ⚠️ Normal (No es error)

- Warnings de desarrollo en consola
- Primera carga lenta (compilación Next.js)
- Algunos módulos en construcción

### ❌ NO Debe Aparecer

- "organization_id must be a UUID"
- Cascadas de toasts rojos
- "Cannot GET /suppliers/organization/..."
- "categories no encontrada"

---

## 🆘 Problemas Comunes

### Backend no responde

```powershell
cd apps\api
npm install
npm run dev
```

### Frontend no responde

```powershell
cd apps\pos-web
npm install
npm run dev
```

### Base de datos sin datos

```powershell
cd packages\database
npm run seed
```

### Cache del navegador

Presiona `Ctrl + Shift + R` para hard reload

---

## 📊 Estado del Sistema

```
✅ Backend:         ACTIVO (puerto 4000)
✅ Frontend:        ACTIVO (puerto 3001)
✅ Base de Datos:   SEEDED
✅ Endpoints:       IMPLEMENTADOS
✅ Interceptor:     ACTIVO
✅ Error Handling:  MEJORADO
```

### Datos en Base de Datos

- 👥 Usuarios: 4 (admin, owner, manager, barista)
- 🏢 Organizaciones: 1 (CoffeeOS Demo)
- 📦 Proveedores: 12
- 📋 Categorías: 59
- 🛍️ Productos: 17
- 📊 Items Inventario: 8
- 📝 Recetas: 6 con 11 ingredientes

---

## 🎉 Siguiente Paso

**👉 Abre [TESTING-READY.md](./TESTING-READY.md) para instrucciones detalladas**

O directamente:

1. Abre http://localhost:3001
2. Login: owner@coffeedemo.mx / password123
3. Navega por Dashboard, Recetas, Proveedores, Inventario
4. Reporta cualquier error encontrado

---

## 📞 Ayuda

Si encuentras problemas:

1. ✅ Verifica que servicios estén corriendo
2. ✅ Hard reload del navegador (Ctrl+Shift+R)
3. ✅ Revisa consola del navegador (F12)
4. ✅ Ejecuta `.\scripts\verify-endpoints.ps1`
5. 📝 Anota error exacto y pasos para reproducir

---

**Status**: 🟢 READY FOR TESTING  
**Última verificación**: 28/10/2025 12:13  
**Documentación**: ✅ Completa
