# CoffeeOS Contributing Guidelines

¡Gracias por tu interés en contribuir a CoffeeOS! 🙏

## 📋 Índice

- [Código de Conducta](#código-de-conducta)
- [¿Cómo contribuir?](#cómo-contribuir)
- [Configuración del entorno](#configuración-del-entorno)
- [Estándares de código](#estándares-de-código)
- [Proceso de Pull Request](#proceso-de-pull-request)
- [Reportar bugs](#reportar-bugs)
- [Solicitar features](#solicitar-features)

## 🤝 Código de Conducta

Este proyecto adhiere al [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). Al participar, se espera que mantengas este código.

## 🚀 ¿Cómo contribuir?

Hay muchas formas de contribuir a CoffeeOS:

### 🐛 Reportar Bugs
- Usa el [bug report template](.github/ISSUE_TEMPLATE/bug_report.md)
- Incluye pasos detallados para reproducir el problema
- Proporciona información del entorno (OS, navegador, versión)

### ✨ Solicitar Features
- Usa el [feature request template](.github/ISSUE_TEMPLATE/feature_request.md)
- Explica el caso de uso y la justificación
- Incluye mockups o ejemplos si es posible

### 💻 Contribuir Código
- Fork el repositorio
- Crea una rama con un nombre descriptivo
- Implementa los cambios siguiendo nuestros estándares
- Escribe tests para nueva funcionalidad
- Envía un Pull Request

### 📚 Mejorar Documentación
- Corrige typos o mejora claridad
- Agrega ejemplos faltantes
- Traduce contenido a otros idiomas

## ⚙️ Configuración del entorno

### Prerrequisitos
- Node.js 18+
- Docker & Docker Compose
- Git

### Setup inicial
```bash
# Clonar repositorio
git clone https://github.com/tu-org/coffeeos.git
cd coffeeos

# Configurar entorno de desarrollo
./scripts/setup-dev.sh  # Linux/macOS
# o
./scripts/setup-dev.ps1  # Windows PowerShell

# Iniciar aplicaciones
npm run dev
```

### Estructura del proyecto
```
CoffeeOS/
├── apps/              # Aplicaciones
│   ├── api/          # Backend NestJS
│   ├── pos-web/      # POS Web App
│   ├── admin-web/    # Admin Dashboard
│   └── mobile/       # React Native App
├── packages/         # Librerías compartidas
│   ├── ui/           # Componentes UI
│   ├── shared/       # Utils & tipos
│   ├── database/     # Prisma schema
│   └── integrations/ # Integraciones externas
└── infrastructure/   # Docker, CI/CD, etc.
```

## 📏 Estándares de código

### General
- Usa **TypeScript** en todo el stack
- Sigue las convenciones de nombres:
  - `camelCase` para variables y funciones
  - `PascalCase` para componentes y clases
  - `kebab-case` para archivos y carpetas
  - `UPPER_CASE` para constantes

### Backend (NestJS)
```typescript
// ✅ Correcto
@Controller('pos')
export class PosController {
  constructor(
    private readonly posService: PosService,
    private readonly logger: Logger,
  ) {}

  @Post('tickets')
  async createTicket(@Body() createTicketDto: CreateTicketDto) {
    return this.posService.createTicket(createTicketDto);
  }
}
```

### Frontend (React/Next.js)
```typescript
// ✅ Correcto
interface PosScreenProps {
  onTicketCreate: (ticket: Ticket) => void;
}

export function PosScreen({ onTicketCreate }: PosScreenProps) {
  const [products, setProducts] = useState<Product[]>([]);
  
  return (
    <div className="pos-screen">
      {/* Contenido */}
    </div>
  );
}
```

### Base de datos
- Usa migraciones Prisma para cambios de schema
- Nombres de tablas en `snake_case` plural
- Campos en `camelCase` en Prisma, `snake_case` en BD
- Siempre incluye `createdAt` y `updatedAt`

### CSS/Styling
- Usa **Tailwind CSS** para estilos
- Prefiere utility classes sobre CSS custom
- Usa componentes para patrones repetitivos

```tsx
// ✅ Correcto
<button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
  Procesar Venta
</button>
```

## 🔄 Proceso de Pull Request

### 1. Antes de empezar
- Crea un issue describiendo el cambio
- Espera confirmación del maintainer
- Asigna el issue a ti mismo

### 2. Desarrollo
```bash
# Crea rama desde main
git checkout main
git pull origin main
git checkout -b feature/pos-offline-sync

# Realiza cambios
# ... codifica ...

# Commit con mensaje descriptivo
git add .
git commit -m "feat: agregar sincronización offline para POS

- Implementa cola de transacciones con IndexedDB
- Agrega reconciliación automática al reconectar  
- Incluye UI para estado de conexión

Closes #123"
```

### 3. Testing
```bash
# Tests unitarios
npm run test

# Tests E2E
npm run test:e2e

# Lint y formato
npm run lint
npm run format

# Type checking
npm run type-check
```

### 4. Pull Request
- Título descriptivo en español
- Descripción detallada del cambio
- Screenshots para cambios de UI
- Lista de cambios realizados
- Referencias a issues relacionados

### Template de PR
```markdown
## 📝 Descripción
Breve descripción del cambio realizado.

## 🔗 Issue relacionado
Closes #123

## 📋 Tipo de cambio
- [ ] Bug fix
- [ ] Nueva funcionalidad
- [ ] Breaking change
- [ ] Documentación

## ✅ Checklist
- [ ] He probado los cambios localmente
- [ ] He agregado tests para nueva funcionalidad
- [ ] He actualizado la documentación
- [ ] Los cambios siguen las guías de estilo
- [ ] He verificado que no hay conflictos

## 📱 Screenshots (si aplica)
Agrega capturas de pantalla para cambios visuales.

## 🧪 Testing
Describe cómo se puede probar el cambio.
```

### 5. Review
- El código será revisado por al menos 1 maintainer
- Responde a comentarios constructivamente
- Realiza cambios solicitados promptamente
- Una vez aprobado, será merged por un maintainer

## 🐛 Reportar bugs

Usa el template de bug report e incluye:

### Información esencial
- **Descripción**: ¿Qué pasó?
- **Comportamiento esperado**: ¿Qué debería pasar?
- **Pasos para reproducir**: Paso a paso
- **Environment**: OS, navegador, versión de CoffeeOS

### Información adicional
- Screenshots o videos
- Logs de consola/error
- Configuración relevante

### Labels de bugs
- `bug` - Error confirmado
- `critical` - Afecta funcionalidad principal
- `ui` - Problema visual/interfaz
- `performance` - Problema de rendimiento
- `mobile` - Específico de app móvil

## ✨ Solicitar features

### Antes de solicitar
1. Busca si ya existe el issue
2. Considera si encaja en la visión del producto
3. Piensa en la implementación y costo

### Template de feature
```markdown
## 🎯 ¿Cuál es el problema a resolver?
Describe el problema o necesidad actual.

## 💡 ¿Cuál es la solución propuesta?
Describe tu idea de solución.

## 🎨 Mockups o ejemplos (opcional)
Agrega diseños, wireframes o referencias.

## 📊 Casos de uso
- Como [rol], quiero [acción] para [beneficio]
- Como [rol], necesito [funcionalidad] porque [razón]

## 🔄 Alternativas consideradas
¿Qué otras soluciones evaluaste?

## 📈 Impacto estimado
- Usuarios beneficiados: [número/porcentaje]
- Frecuencia de uso: [diario/semanal/mensual]
- Prioridad: [baja/media/alta/crítica]
```

### Labels de features
- `enhancement` - Mejora a funcionalidad existente
- `feature` - Nueva funcionalidad
- `ux` - Mejora de experiencia de usuario
- `performance` - Optimización
- `integration` - Nueva integración externa

## 📋 Módulos y áreas

### 🏪 POS & Operaciones
- Sistema de punto de venta
- Gestión de productos y precios
- Procesamiento de pagos
- Impresión de tickets

### 📦 Inventario
- Control de stock
- Recepción de mercancía
- Costeo por receta
- Alertas de reorden

### ☕ Recetas
- Fichas técnicas
- Parámetros de preparación
- Cálculo de costos
- Control de alérgenos

### ✅ Calidad
- Checklists NOM-251
- Bitácoras de temperatura
- Control de PPM/TDS
- Protocolos de limpieza

### 👥 CRM & Lealtad
- Programa 9+1
- Segmentación de clientes
- Campañas de marketing
- NPS y feedback

### 💰 Finanzas
- P&L por tienda
- CFDI 4.0 / Facturación
- Gestión de permisos
- KPIs financieros

### 📊 Analytics
- Dashboards operativos
- Reportes automáticos
- Métricas de desempeño
- Inteligencia de negocio

## 🏷️ Convenciones de commit

Usamos [Conventional Commits](https://conventionalcommits.org/):

```
<type>(<scope>): <description>

<body>

<footer>
```

### Tipos
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Solo documentación
- `style`: Cambios de formato/estilo
- `refactor`: Refactorización de código
- `test`: Agregar o modificar tests
- `chore`: Tareas de mantenimiento

### Scopes
- `pos`: Punto de venta
- `inventory`: Inventario
- `recipes`: Recetas
- `quality`: Control de calidad
- `crm`: CRM y lealtad
- `finance`: Finanzas
- `analytics`: Analytics
- `api`: Backend API
- `web`: Aplicaciones web
- `mobile`: App móvil
- `db`: Base de datos
- `ci`: CI/CD

### Ejemplos
```bash
feat(pos): agregar soporte para modificadores de producto
fix(inventory): corregir cálculo de stock disponible
docs(api): actualizar documentación de endpoints
test(crm): agregar tests para segmentación RFM
```

## 🚦 Workflow de desarrollo

### Ramas
- `main` - Producción estable
- `develop` - Integración continua
- `feature/*` - Nuevas funcionalidades
- `hotfix/*` - Correcciones urgentes
- `release/*` - Preparación de releases

### Proceso
1. **Feature branch** desde `develop`
2. **Development** y testing local
3. **Pull Request** a `develop`
4. **Code review** y aprobación
5. **Merge** a `develop`
6. **Release branch** para deploy
7. **Merge** a `main` y tag

## 🔧 Herramientas recomendadas

### IDE/Editor
- **VS Code** (recomendado)
- Extensions útiles:
  - Prisma
  - Tailwind CSS IntelliSense
  - ES7+ React/Redux/React-Native snippets
  - Auto Rename Tag
  - Bracket Pair Colorizer

### Testing
- **Jest** - Tests unitarios
- **Playwright** - Tests E2E
- **React Testing Library** - Tests de componentes

### Database
- **Prisma Studio** - GUI para base de datos
- **TablePlus** o **DataGrip** - Clientes SQL

### API Testing
- **Insomnia** o **Postman** - Testing de APIs
- **Bruno** - Cliente API colaborativo

## 📞 Soporte

¿Necesitas ayuda?

- 💬 **Discord**: [Comunidad CoffeeOS](https://discord.gg/coffeeos)
- 📧 **Email**: dev@coffeeos.mx  
- 📖 **Docs**: https://docs.coffeeos.mx
- 🐛 **Issues**: https://github.com/tu-org/coffeeos/issues

## 📄 Licencia

Al contribuir a CoffeeOS, aceptas que tus contribuciones serán licenciadas bajo la [MIT License](LICENSE).

---

**¡Gracias por contribuir a CoffeeOS! ☕️❤️**