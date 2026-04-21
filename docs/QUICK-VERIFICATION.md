# 🎯 Guía de Verificación Rápida - CoffeeOS

## 🚀 Verificación Diaria (30 segundos)

```powershell
cd C:\Projects\CoffeeOS
.\scripts\quick-check.ps1
```

**Resultado esperado:**

```
⚡ QUICK HEALTH CHECK
Backend API:      ✅ Running (port 4000)
Frontend POS:     ✅ Running (port 3001)
PostgreSQL:       ✅ Running (port 5434)
API Health:       ✅ Responding
Products API:     ✅ 17 products
Frontend Access:  ✅ POS accessible
✅ ALL SYSTEMS OPERATIONAL (6/6)
```

---

## 🔍 Verificación Completa (60 segundos)

```powershell
cd C:\Projects\CoffeeOS
.\scripts\health-check.ps1
```

**Verifica 40 componentes:**

- Infraestructura (Node, npm, PostgreSQL)
- Servicios (Backend, Frontend)
- API y CORS
- Base de datos
- Integración productos-recetas
- Endpoints principales
- Frontend (páginas)
- Archivos y configuración
- Módulos del sistema
- Dependencias

**Score actual: 87.5% ⭐⭐**

---

## 🧪 Test de Integración (15 segundos)

```powershell
cd C:\Projects\CoffeeOS
.\scripts\integration-test.ps1
```

**Simula flujo completo:**

1. ✅ Obtener categorías
2. ✅ Obtener productos
3. ✅ Seleccionar producto
4. ✅ Obtener receta y costeo
5. ✅ Análisis de rentabilidad
6. ✅ Simular orden POS
7. ✅ Verificar inventario
8. ✅ Health check

**Score actual: 100% 🎉**

---

## 📊 Estado Actual del Sistema

### ✅ Componentes Operacionales

- Frontend Next.js en puerto 3001
- Backend NestJS en puerto 4000
- PostgreSQL en puerto 5434
- 17 productos con precios reales
- 29 categorías
- 6 recetas con costeo completo
- Integración productos-recetas funcionando
- Cálculo de rentabilidad operativo

### ⚠️ Requiere Atención

- Dashboard con errores de autenticación
- Endpoint Organizations no expuesto
- Endpoints Users/Locations protegidos
- Implementar flujo de login completo

---

## 🛠️ Comandos Útiles

### Iniciar servicios

```powershell
# Backend
npm run dev --workspace=apps/api

# Frontend
npm run dev --workspace=apps/pos-web
```

### Verificar puertos

```powershell
netstat -ano | findstr ":3001"  # Frontend
netstat -ano | findstr ":4000"  # Backend
netstat -ano | findstr ":5434"  # PostgreSQL
```

### Reiniciar todo

```powershell
Get-Process node | Stop-Process -Force
Start-Sleep -Seconds 2
# Luego iniciar servicios manualmente
```

### Verificar datos

```powershell
# Productos
curl http://localhost:4000/api/v1/products | ConvertFrom-Json

# Categorías
curl http://localhost:4000/api/v1/categories | ConvertFrom-Json

# Receta de un producto
$productId = (curl http://localhost:4000/api/v1/products | ConvertFrom-Json)[0].id
curl "http://localhost:4000/api/v1/recipes/product/$productId"
```

---

## 📚 Documentación

- **[Plan de Verificación Completo](./VERIFICATION-PLAN.md)** - Detalles exhaustivos
- **[Scripts README](../scripts/README.md)** - Guía de scripts
- **[README Principal](../README.md)** - Documentación general

---

## 🎯 Métricas de Calidad

| Componente      | Score     | Estado         |
| --------------- | --------- | -------------- |
| Infraestructura | 100%      | ✅ Excelente   |
| Servicios       | 100%      | ✅ Excelente   |
| API             | 100%      | ✅ Excelente   |
| Base de Datos   | 66%       | ⚠️ Funcional   |
| Integración     | 100%      | ✅ Excelente   |
| Endpoints       | 60%       | ⚠️ Parcial     |
| Frontend        | 100%      | ✅ Excelente   |
| Config          | 100%      | ✅ Excelente   |
| Módulos         | 100%      | ✅ Excelente   |
| Dependencias    | 75%       | ⚠️ Funcional   |
| **GLOBAL**      | **87.5%** | **⭐⭐ Bueno** |

---

## ✅ Checklist Pre-commit

Antes de hacer commit, verifica:

- [ ] `.\scripts\quick-check.ps1` pasa (6/6)
- [ ] No hay errores en terminal del backend
- [ ] No hay errores en terminal del frontend
- [ ] POS carga correctamente en navegador
- [ ] No hay console errors críticos en DevTools

---

## 🚨 Troubleshooting Rápido

### Backend no responde

```powershell
Get-Process node | Stop-Process -Force
cd C:\Projects\CoffeeOS
npm run dev --workspace=apps/api
```

### Frontend no carga

```powershell
Get-Process node | Stop-Process -Force
cd C:\Projects\CoffeeOS
npm run dev --workspace=apps/pos-web
```

### Base de datos no conecta

```powershell
netstat -ano | findstr ":5434"
# Si no hay output, iniciar PostgreSQL
```

### Datos corruptos

```powershell
cd C:\Projects\CoffeeOS\packages\database
npm run seed
npm run seed:recipes
```

---

**Última actualización:** 27 de Octubre, 2025  
**Próxima revisión:** Al completar autenticación
