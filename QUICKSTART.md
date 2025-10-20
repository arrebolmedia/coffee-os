# 🚀 QUICK START - CoffeeOS

## ⚡ Inicio Rápido (Una vez resuelto el problema de espacio)

### 1. Liberar Espacio en Disco (CRÍTICO)

```powershell
# Limpiar node_modules corrupto
Remove-Item E:\CoffeeOS\node_modules -Recurse -Force

# Limpiar caché de npm
npm cache clean --force

# Verificar espacio libre (debe ser > 5 GB)
(Get-PSDrive E).Free / 1GB
```

### 2. Instalar Dependencias

```powershell
cd E:\CoffeeOS
npm install
```

### 3. Iniciar Docker Services

```powershell
# Iniciar Docker Desktop primero (GUI)

# Luego iniciar servicios
docker-compose up -d

# Verificar que todo esté corriendo
docker-compose ps
```

### 4. Configurar Baserow (AUTOMATIZADO)

```powershell
# Paso 1: Acceder a Baserow
Start-Process "http://localhost:8000"

# Paso 2: Crear cuenta admin en la interfaz web

# Paso 3: Generar API Token
# Settings → API tokens → Create token

# Paso 4: Ejecutar script de configuración automática
.\scripts\setup-baserow.ps1 -BaserowToken "TU_TOKEN_AQUI"

# ✅ Esto creará automáticamente:
#    • Base de datos "CoffeeOS Core"
#    • 12 tablas principales
#    • Campos de ejemplo
#    • Datos iniciales
#    • Archivo config/baserow.json
```

### 5. Verificar Configuración

```powershell
# Verificar que se creó el archivo de configuración
Get-Content .\config\baserow.json

# Acceder a Baserow y revisar tablas
Start-Process "http://localhost:8000"
```

---

## 🎯 Siguientes TODOs

### TODO 2: Autenticación y RBAC

```powershell
# Ubicación: apps/api/src/auth/
# Implementar:
# - JWT strategy con Passport
# - 7 roles del sistema
# - Permisos granulares por scope
# - 2FA con TOTP
```

### TODO 3: Módulo de Productos

```powershell
# Ubicación: apps/api/src/products/
# Implementar:
# - CRUD de productos
# - Sistema de modificadores
# - Recetas con ingredientes
# - Cálculo automático de costos
```

---

## 📚 Documentación Útil

| Documento                      | Para qué sirve                   |
| ------------------------------ | -------------------------------- |
| `STATUS.md`                    | Estado general del proyecto      |
| `SESION_RESUMEN.md`            | Resumen detallado de esta sesión |
| `docs/setup/BASEROW_SETUP.md`  | Guía manual de Baserow           |
| `docs/integrations/baserow.md` | Documentación técnica completa   |

---

## 🔗 URLs Importantes

- **Baserow**: http://localhost:8000
- **PostgreSQL**: localhost:5434 (user: postgres, pass: postgres123)
- **n8n**: http://localhost:5678
- **MinIO**: http://localhost:9000
- **Metabase**: http://localhost:3001

---

## 🆘 Problemas Comunes

### Docker no inicia

```powershell
# Asegúrate de que Docker Desktop esté corriendo
# Verifica en la bandeja del sistema
```

### Puerto ocupado

```powershell
# Ver qué proceso usa el puerto
netstat -ano | findstr :8000

# Detener servicio específico de Docker
docker-compose stop baserow
```

### Script de Baserow falla

```powershell
# Verifica que Baserow esté accesible
Invoke-WebRequest http://localhost:8000 -UseBasicParsing

# Verifica que el token sea válido
# Settings → API tokens en Baserow
```

---

## ✅ Checklist Rápido

- [ ] Espacio en disco E: > 5 GB
- [ ] Docker Desktop corriendo
- [ ] `npm install` completado sin errores
- [ ] `docker-compose ps` muestra todos los servicios healthy
- [ ] Baserow accesible en localhost:8000
- [ ] Script setup-baserow.ps1 ejecutado
- [ ] Archivo config/baserow.json existe y tiene IDs

---

**¿Listo para continuar?** → Sigue con TODO 2 en `STATUS.md`
