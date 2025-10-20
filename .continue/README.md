# Continue Configuration

Este directorio contiene la configuración para la extensión Continue de VS Code.

## Configuración de API Key

La API key de OpenAI debe configurarse como variable de entorno para seguridad:

### Windows (PowerShell)

```powershell
# Temporal (solo sesión actual)
$env:OPENAI_API_KEY = "tu-api-key-aqui"

# Permanente (usuario actual)
[System.Environment]::SetEnvironmentVariable('OPENAI_API_KEY', 'tu-api-key-aqui', 'User')

# Luego reiniciar VS Code
```

### Linux/Mac

```bash
# Agregar a ~/.bashrc o ~/.zshrc
export OPENAI_API_KEY="tu-api-key-aqui"

# Aplicar cambios
source ~/.bashrc  # o ~/.zshrc
```

### VS Code Settings

Alternativamente, puedes configurar la API key en VS Code settings:

1. Abrir Command Palette (Ctrl+Shift+P)
2. Buscar "Preferences: Open User Settings (JSON)"
3. Agregar:

```json
{
  "continue.apiKey": "tu-api-key-aqui"
}
```

## Uso

Una vez configurada la API key:

1. Presiona `Ctrl+L` para abrir el chat de Continue
2. Usa los comandos personalizados:
   - `/test` - Generar tests unitarios
   - `/nestjs` - Ayuda con NestJS
   - `/nextjs` - Ayuda con Next.js
   - `/prisma` - Ayuda con Prisma

## Seguridad

⚠️ **IMPORTANTE**: Nunca commitees archivos con API keys en texto plano. Este archivo usa `${OPENAI_API_KEY}` para leer de variables de entorno.
