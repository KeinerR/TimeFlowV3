# TimeFlow - Product Requirements Document

## Original Problem Statement
Plataforma SaaS de reservas de servicios online, multi-negocio con gestión de usuarios, roles, permisos, citas, staff, contabilidad, pagos y reportes. Sistema escalable, modular, con control de acceso por roles.

## Core Requirements (Static)
- 5 roles: Super Admin, Admin, Business, Staff, Cliente
- CRUD con crear/editar/inhabilitar (no eliminar)
- Validación de usuarios duplicados
- Notificaciones automáticas
- Multi-negocio (un usuario = varios negocios)
- Multi-idioma (ES/EN)
- Modo oscuro/claro

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: JWT-based
- **Email**: Resend integration
- **Pagos**: PayU (configurable por negocio)

## User Personas
1. **Super Admin**: Control total del sistema
2. **Admin**: Gestiona sus propios negocios
3. **Business**: Gestiona un negocio específico
4. **Staff**: Atiende servicios asignados
5. **Cliente**: Reserva y gestiona sus citas

## What's Been Implemented (MVP - Feb 2026)
- [x] Sistema de autenticación JWT
- [x] Gestión de roles y permisos
- [x] Landing page con reserva pública
- [x] Dashboards por rol
- [x] CRUD de negocios
- [x] CRUD de servicios
- [x] CRUD de staff con horarios
- [x] CRUD de citas con estados
- [x] Gestión de usuarios
- [x] Sistema de notificaciones
- [x] Módulo de finanzas
- [x] Reportes básicos
- [x] Multi-idioma (ES/EN)
- [x] Modo oscuro/claro
- [x] Configuración de PayU por negocio
- [x] Email con Resend

## Prioritized Backlog

### P0 (Critical)
- [ ] Integración real de pagos PayU
- [ ] Recordatorios automáticos de citas por email

### P1 (High)
- [ ] Calendario visual de citas
- [ ] Gestión de disponibilidad de staff en tiempo real
- [ ] Subida de comprobantes de pago (transferencias)

### P2 (Medium)
- [ ] Planes SaaS y bloqueo de módulos
- [ ] Reportes avanzados con gráficos
- [ ] Exportación de datos a Excel/PDF
- [ ] App móvil (React Native)

## Next Tasks
1. Probar flujo completo de reserva pública
2. Crear servicios y staff de ejemplo
3. Implementar calendario visual
4. Agregar validaciones de disponibilidad
