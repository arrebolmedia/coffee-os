# 🚨 SOLUCIÓN ALTERNATIVA - Instalar node_modules en otro disco

## Problema Detectado

A pesar de tener 30 GB libres reportados, el disco E:\ se llena DURANTE la instalación de npm,
causando errores ENOSPC repetidamente.

## Solución: Mover node_modules a disco C:\

### Paso 1: Crear directorio en C:\

```powershell
New-Item -ItemType Directory -Path "C:\CoffeeOS-node_modules" -Force
```

### Paso 2: Crear symbolic link desde E:\ a C:\

```powershell
# Importante: Ejecutar PowerShell como ADMINISTRADOR

# Si existe node_modules, eliminarlo primero
if (Test-Path "E:\CoffeeOS\node_modules") {
    Remove-Item -Recurse -Force "E:\CoffeeOS\node_modules"
}

# Crear junction (funciona mejor que symlink para npm en Windows)
cmd /c mklink /J "E:\CoffeeOS\node_modules" "C:\CoffeeOS-node_modules"
```

### Paso 3: Instalar dependencias (ahora se escribirán en C:\)

```powershell
cd E:\CoffeeOS
npm install
```

---

## Alternativa 2: Usar pnpm (más eficiente en espacio)

pnpm usa hard links y ocupa ~33% menos espacio que npm:

```powershell
# Instalar pnpm
npm install -g pnpm

# Instalar dependencias con pnpm
cd E:\CoffeeOS
pnpm install
```

---

## Alternativa 3: Mover TODO el proyecto a C:\

La opción más simple:

```powershell
# Copiar todo el proyecto
Copy-Item -Recurse -Force E:\CoffeeOS C:\CoffeeOS

# Cambiar al nuevo directorio
cd C:\CoffeeOS

# Instalar dependencias
npm install
```

---

## Diagnóstico Adicional

Verificar cuota de disco:

```powershell
# Ver uso real del disco
fsutil volume diskfree E:

# Ver si hay límites de cuota
fsutil quota query E:

# Ver archivos grandes en E:\
Get-ChildItem E:\ -Recurse -File -ErrorAction SilentlyContinue |
  Sort-Object Length -Descending |
  Select-Object -First 20 FullName, @{Name="SizeMB";Expression={[math]::Round($_.Length/1MB,2)}}
```

---

## Recomendación

**Opción más rápida**: Usar **Alternativa 3** (mover a C:\)

Esto evita problemas de symbolic links y garantiza que tendrás suficiente espacio.

```powershell
# Comando completo
Copy-Item -Recurse -Force E:\CoffeeOS C:\CoffeeOS
cd C:\CoffeeOS
npm cache clean --force
npm install
```

Una vez funcione, podrás continuar con:

```powershell
.\scripts\start-dev.ps1
```

---

## Si el espacio es problema en TODOS los discos

Considera instalar solo los workspaces esenciales:

```powershell
# Instalar solo el backend
cd packages\database
npm install

cd ..\..\apps\api
npm install

# Instalar solo el POS
cd ..\pos-web
npm install
```

Esto reduce significativamente el uso de espacio.
