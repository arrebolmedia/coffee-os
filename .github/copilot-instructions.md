# CoffeeOS - Multi-Tenant Coffee Shop Management Platform

## Project Overview

CoffeeOS is a comprehensive multi-tenant platform that translates the entire Master Plan into operational software for coffee shops. It includes POS, inventory management, quality control (NOM-251 compliance), recipe costing, CRM/loyalty programs, HR training (30/60/90), compliance management, and financial dashboards.

## Architecture

- **Backend**: NestJS + TypeScript + Prisma ORM + PostgreSQL + Redis
- **Frontend**: Next.js 13+ with App Router + React + TypeScript + Tailwind CSS
- **Mobile**: React Native + Expo
- **Database**: Baserow (no-code database) as primary data source
- **Automation**: n8n for workflow orchestration
- **Integrations**: Twilio (WhatsApp/SMS), Mailrelay (email marketing), PAC CFDI (Mexican invoicing)
- **Infrastructure**: Docker, GitHub Actions CI/CD, multi-tenant with RBAC
- **Offline Support**: PWA with IndexedDB synchronization

## Modules

1. **POS & Operations**: Fast POS, recipes, costing, inventory management
2. **Quality & Compliance**: NOM-251 checklists, temperature logs, food safety
3. **HR & Training**: 30/60/90 onboarding, evaluations, certifications
4. **Finance & Legal**: P&L by location, permit management, CFDI integration
5. **CRM & Loyalty**: 9+1 program, birthday campaigns, RFM segmentation
6. **Analytics**: Daily/weekly/monthly dashboards with KPIs
7. **Sustainability**: Waste tracking, eco-friendly metrics

## Mexican Market Compliance

- CFDI 4.0 electronic invoicing via PAC
- NOM-251 food safety regulations
- LFPDPPP privacy law compliance
- Local payment integrations (Clip, Mercado Pago, BBVA)

## Development Guidelines

- Use TypeScript throughout the stack
- Implement offline-first architecture with sync queues
- Follow multi-tenant isolation patterns
- Prioritize Mexican market requirements and Spanish language
- Implement comprehensive testing (unit, integration, E2E)

## Progress Tracking

- [x] ✅ Project structure created
- [ ] Scaffold backend architecture
- [ ] Configure frontend applications
- [ ] Set up database schema
- [ ] Implement core modules
- [ ] Configure integrations
- [ ] Set up deployment pipeline
