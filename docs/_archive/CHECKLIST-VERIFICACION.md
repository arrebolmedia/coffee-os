# ✅ CoffeeOS - Checklist de Verificación Pre-Desarrollo

Este checklist asegura que todo está configurado correctamente antes de comenzar el desarrollo.

---

## 🎯 Fase 1: Verificación de Sistema

### Sistema Operativo & Herramientas

- [x] ✅ Windows con PowerShell
- [x] ✅ Node.js v22.17.0 instalado
- [x] ✅ npm 10.9.2 instalado
- [ ] ⏳ Docker Desktop instalado y corriendo
- [ ] ⏳ Git configurado

**Comando de verificación**:

```powershell
node --version
npm --version
docker --version
git --version
```

---

## 🎯 Fase 2: Instalación de Dependencias

### Node Modules

- [ ] ⏳ `npm install` completado sin errores
- [ ] Todos los workspaces instalados:
  - [ ] `apps/api`
  - [ ] `apps/pos-web`
  - [ ] `apps/admin-web`
  - [ ] `apps/mobile`
  - [ ] `packages/database`
  - [ ] `packages/integrations`
  - [ ] `packages/shared`
  - [ ] `packages/ui`

**Verificar instalación**:

```powershell
# Debe existir el directorio
Test-Path node_modules
# Debe devolver True

# Ver tamaño de node_modules (debería ser ~500MB+)
Get-ChildItem node_modules -Recurse | Measure-Object -Property Length -Sum
```

---

## 🎯 Fase 3: Servicios Docker

### Contenedores Requeridos

- [ ] PostgreSQL 15 (puerto 5432)
- [ ] Redis 7 (puerto 6379)
- [ ] Baserow (puerto 8000)
- [ ] n8n (puerto 5678)
- [ ] MinIO (puertos 9000/9001)
- [ ] Metabase (puerto 3333)
- [ ] Prometheus (puerto 9090)
- [ ] Grafana (puerto 3001)

**Iniciar servicios**:

```powershell
.\scripts\start-dev.ps1
# O manualmente:
docker-compose up -d
```

**Verificar servicios**:

```powershell
docker ps
# Deberías ver 8 contenedores con estado "Up"

# Verificar logs
docker-compose logs -f postgres
```

---

## 🎯 Fase 4: Base de Datos

### PostgreSQL

- [ ] PostgreSQL está aceptando conexiones
- [ ] Base de datos `coffeeos_dev` creada
- [ ] Usuario `coffeeos` configurado

**Verificar conexión**:

```powershell
# Desde PowerShell
docker exec -it coffeeos-postgres-1 psql -U coffeeos -d coffeeos_dev -c "\dt"
```

### Prisma

- [ ] Prisma Client generado
- [ ] Migraciones aplicadas
- [ ] Seed ejecutado

**Comandos**:

```powershell
# Generar cliente
npm run db:generate

# Aplicar migraciones
npm run db:migrate

# Ejecutar seed
npm run db:seed

# Abrir Prisma Studio
npm run db:studio
```

**Verificar en Prisma Studio** (http://localhost:5555):

- [ ] Tabla `Organization` tiene 1 registro ("Coffee Demo")
- [ ] Tabla `Location` tiene 1 registro ("Sucursal Centro")
- [ ] Tabla `User` tiene 3 registros (Owner, Manager, Barista)
- [ ] Tabla `Role` tiene 7 registros
- [ ] Tabla `Category` tiene 5 registros
- [ ] Tabla `Product` tiene 11 registros
- [ ] Tabla `ModifierGroup` tiene 3 registros
- [ ] Tabla `Modifier` tiene 12+ registros

---

## 🎯 Fase 5: Variables de Entorno

### Archivo .env.local

- [x] ✅ `.env.local` existe
- [ ] DATABASE_URL apunta a PostgreSQL local
- [ ] REDIS_URL apunta a Redis local
- [ ] JWT_SECRET configurado
- [ ] API_PORT=4000
- [ ] NODE_ENV=development

**Verificar**:

```powershell
cat .env.local | Select-String "DATABASE_URL"
cat .env.local | Select-String "REDIS_URL"
```

---

## 🎯 Fase 6: Aplicaciones de Desarrollo

### API (NestJS)

- [ ] API inicia sin errores
- [ ] Conecta a PostgreSQL
- [ ] Conecta a Redis
- [ ] Health endpoint responde

**Iniciar API**:

```powershell
cd apps/api
npm run dev
```

**Verificar**:

```powershell
curl http://localhost:4000/health
# Esperado: {"status":"ok","database":"connected","redis":"connected"}

# Swagger UI disponible
Start-Process "http://localhost:4000/api-docs"
```

### POS Web (Next.js)

- [ ] Aplicación POS inicia sin errores
- [ ] Se puede acceder en navegador
- [ ] Login funciona
- [ ] Muestra productos

**Iniciar POS**:

```powershell
cd apps/pos-web
npm run dev
```

**Verificar**:

```powershell
Start-Process "http://localhost:3000"
# Login con: barista@coffeedemo.mx / password123
```

### Admin Web (Next.js)

- [ ] Aplicación Admin inicia sin errores
- [ ] Se puede acceder en navegador
- [ ] Login funciona
- [ ] Dashboard muestra datos

**Iniciar Admin**:

```powershell
cd apps/admin-web
npm run dev
```

**Verificar**:

```powershell
Start-Process "http://localhost:3001"
# Login con: owner@coffeedemo.mx / password123
```

### Todo en Paralelo (Turborepo)

- [ ] `npm run dev` inicia todas las apps

**Iniciar todo**:

```powershell
npm run dev
```

---

## 🎯 Fase 7: Integraciones Externas

### Baserow

- [ ] Baserow UI accesible
- [ ] Usuario admin creado
- [ ] Token API generado

**Acceso**:

```
URL: http://localhost:8000
Usuario: admin@coffeeos.local
Password: coffeeos123
```

**Generar token**:

1. Login en Baserow
2. Settings → API tokens
3. Create new token
4. Copiar a `.env.local` como `BASEROW_TOKEN`

### n8n

- [ ] n8n UI accesible
- [ ] Usuario creado
- [ ] Workflows importados

**Acceso**:

```
URL: http://localhost:5678
Usuario: admin@coffeeos.local
Password: coffeeos123
```

### MinIO

- [ ] MinIO Console accesible
- [ ] Bucket `coffeeos` creado
- [ ] Access/Secret keys configurados

**Acceso**:

```
Console: http://localhost:9001
Usuario: minioadmin
Password: minioadmin
```

**Crear bucket**:

1. Login en MinIO Console
2. Buckets → Create Bucket
3. Nombre: `coffeeos`
4. Permissions: Public

---

## 🎯 Fase 8: Tests & Linting

### Linting

- [ ] ESLint configurado
- [ ] Sin errores de linting

**Ejecutar**:

```powershell
npm run lint
```

### Tests Unitarios

- [ ] Jest configurado
- [ ] Tests pasan

**Ejecutar**:

```powershell
npm run test
```

### Tests E2E (Opcional para setup inicial)

- [ ] Playwright configurado
- [ ] Tests básicos pasan

**Ejecutar**:

```powershell
npm run test:e2e
```

---

## 🎯 Fase 9: Documentación

### Archivos Clave

- [x] ✅ `README.md` - Descripción general
- [x] ✅ `QUICK-START.md` - Guía de inicio
- [x] ✅ `STATUS-ACTUAL.md` - Estado actual
- [x] ✅ `PLAN-COMPLETO.md` - Plan ejecutivo
- [x] ✅ `PLAN-IMPLEMENTACION.md` - Roadmap detallado
- [x] ✅ `CONTRIBUTING.md` - Guía de contribución
- [x] ✅ `todos/README.md` - Índice de TODOs
- [x] ✅ `TODO-01.md` a `TODO-06.md` - Especificaciones

**Verificar**:

```powershell
Get-ChildItem -Filter "*.md" | Select-Object Name, Length
```

---

## 🎯 Fase 10: Git & Control de Versiones

### Repositorio

- [ ] Git inicializado
- [ ] `.gitignore` configurado
- [ ] Commit inicial creado
- [ ] Remoto configurado (GitHub/GitLab)

**Comandos**:

```powershell
git init
git add .
git commit -m "feat: initial project setup with complete infrastructure"
git branch -M main
git remote add origin <URL_REPO>
git push -u origin main
```

---

## 🎯 Verificación Final

### Checklist Completo ✅

Marca todas las casillas anteriores antes de proceder.

### Test de Integración Manual

1. **Crear una orden en POS**:
   - [ ] Login como barista
   - [ ] Agregar producto
   - [ ] Aplicar modificador
   - [ ] Procesar pago
   - [ ] Generar ticket

2. **Ver orden en Admin**:
   - [ ] Login como owner
   - [ ] Ver órdenes del día
   - [ ] Ver reporte de ventas
   - [ ] Verificar inventario

3. **Verificar en Base de Datos**:
   - [ ] Abrir Prisma Studio
   - [ ] Verificar tabla `Ticket`
   - [ ] Verificar tabla `TicketLine`
   - [ ] Verificar tabla `Payment`

### URLs de Verificación Rápida

Abre estos URLs en tu navegador para verificación final:

```powershell
# Backend
Start-Process "http://localhost:4000/health"
Start-Process "http://localhost:4000/api-docs"

# Frontend
Start-Process "http://localhost:3000"
Start-Process "http://localhost:3001"

# Tools
Start-Process "http://localhost:8000"  # Baserow
Start-Process "http://localhost:5678"  # n8n
Start-Process "http://localhost:9001"  # MinIO
Start-Process "http://localhost:5555"  # Prisma Studio
```

---

## 🚨 Troubleshooting

### Si algo falla:

1. **Verificar logs**:

```powershell
docker-compose logs -f <servicio>
npm run dev  # Ver logs de apps
```

2. **Reiniciar servicios**:

```powershell
docker-compose restart
```

3. **Limpiar y reinstalar**:

```powershell
docker-compose down -v
Remove-Item -Recurse -Force node_modules
npm install
.\scripts\start-dev.ps1
```

4. **Verificar puertos**:

```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :4000
netstat -ano | findstr :5432
```

---

## ✅ Resultado Esperado

Al completar este checklist, deberías tener:

- ✅ 8 contenedores Docker corriendo
- ✅ Base de datos con datos demo
- ✅ API REST + GraphQL funcionando
- ✅ POS Web funcionando
- ✅ Admin Web funcionando
- ✅ Todas las integraciones configuradas
- ✅ Tests pasando
- ✅ Sin errores de linting

**¡Listo para comenzar TODO-01! 🚀**

---

## 📞 Soporte

Si encuentras algún problema:

1. Revisa `QUICK-START.md`
2. Revisa `STATUS-ACTUAL.md`
3. Consulta logs de Docker: `docker-compose logs -f`
4. Revisa issues conocidos en `docs/`

---

**Fecha de última verificación**: _Pendiente_  
**Verificado por**: _Pendiente_  
**Tiempo estimado para completar checklist**: 30-45 minutos
