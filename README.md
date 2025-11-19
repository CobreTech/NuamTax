# Prototipo de Intranet NUAM para Corredores

**ACTUALIZACIÓN:** Sistema con funcionalidades core implementadas y algunas en desarrollo:
- ✅ **Autenticación completa** con Firebase Auth (registro, login, recuperación de contraseña)
- ✅ **RBAC estricto** con control de acceso por roles
- ✅ **Carga masiva optimizada** con validación, procesamiento CSV/Excel y Firestore
- ✅ **Dashboard con estadísticas en tiempo real** desde Firestore
- ✅ **Gestión de calificaciones** (edición, búsqueda, filtros, exportación)
- ✅ **Validación y formateo de RUTs chilenos** en todos los campos
- ✅ **Auditoría automática** de todas las operaciones
- ✅ **UI profesional** con React Icons y diseño responsive
- 🟡 **Generación de DJ1948** (implementación inicial, requiere perfeccionamiento)
- ⏳ **Otros reportes** (pendientes de implementación)
- ⏳ **Crear/Eliminar calificaciones** (pendientes de implementación)
- ⏳ **Persistencia de configuración** (pendiente de implementación)

**📋 ENFOQUE ACTUAL:** Completando todas las funcionalidades para Chile antes de expandir a Perú y Colombia. Ver `PLAN_TRABAJO_CHILE.md` para detalles.

Este proyecto es un prototipo funcional de la intranet NUAM (holding regional de bolsas de Santiago, Lima y Colombia) que implementa autenticación, gestión de usuarios y carga masiva de calificaciones tributarias con backend completo en Firebase.

## 1. Objetivo del Proyecto

El objetivo de este prototipo es presentar una propuesta de diseño para la intranet del holding regional NUAM (integración de las bolsas de Santiago, Lima y Colombia). La plataforma está diseñada para que los corredores puedan gestionar calificaciones tributarias, cargar información masivamente, generar reportes y configurar sus preferencias de manera centralizada y eficiente.

## 2. Tecnologías Utilizadas

Este prototipo fue desarrollado utilizando tecnologías web modernas para garantizar una experiencia fluida y escalable.

- **[Next.js](https://nextjs.org/)**: Framework de React para construir aplicaciones web renderizadas en el servidor y estáticas.
- **[React](https://react.dev/)**: Biblioteca de JavaScript para construir interfaces de usuario.
- **[TypeScript](https://www.typescriptlang.org/)**: Superset de JavaScript que añade tipado estático para un desarrollo más robusto.
- **[Tailwind CSS](https://tailwindcss.com/)**: Framework de CSS "utility-first" para un diseño rápido y personalizable.
- **[Firebase Authentication](https://firebase.google.com/products/auth)**: Sistema de autenticación completo con email/contraseña.
- **[Firebase Firestore](https://firebase.google.com/products/firestore)**: Base de datos NoSQL en tiempo real para almacenamiento de datos.
- **[PapaParse](https://www.papaparse.com/)**: Procesamiento de archivos CSV.
- **[SheetJS (xlsx)](https://sheetjs.com/)**: Procesamiento de archivos Excel.
- **[Framer Motion](https://www.framer.com/motion/)**: Animaciones y transiciones fluidas.

## 3. Estructura del Proyecto

El proyecto sigue la estructura estándar de una aplicación Next.js con el App Router. Los archivos más relevantes se encuentran en el directorio `src/app`:

```
.
└── src/
    └── app/
        ├── components/               # Componentes globales reutilizables
        │   └── RegisterModal.tsx     # Modal de registro de usuarios
        ├── dashboard/                # Panel principal de la aplicación
        │   ├── components/           # Componentes del dashboard
        │   │   ├── OverviewSection.tsx
        │   │   ├── QualificationsSection.tsx # Gestión completa de calificaciones
        │   │   ├── EditQualificationModal.tsx # Modal de edición
        │   │   ├── UploadSection.tsx # Módulo de carga masiva (100% funcional)
        │   │   ├── ReportsSection.tsx
        │   │   ├── SettingsSection.tsx # Configuración (UI completa, persistencia pendiente)
        │   │   └── types.ts          # Definiciones de tipos TypeScript
        │   ├── layout.tsx            # Layout del dashboard
        │   └── page.tsx              # Página principal del dashboard
        ├── firebase/                 # Configuración de Firebase
        │   └── config.ts             # Inicialización de Auth y Firestore
        ├── login/                    # Autenticación (100% funcional)
        │   └── page.tsx              # Login con Firebase Auth
        ├── services/                 # Servicios de backend
        │   ├── firestoreService.ts   # CRUD y carga masiva optimizada
        │   ├── fileProcessingService.ts # Procesamiento CSV/Excel
        │   ├── taxValidationService.ts # Validación de datos tributarios
        │   ├── exportService.ts       # Exportación a CSV/Excel
        │   ├── auditService.ts       # Servicio de auditoría
        │   ├── dj1948Service.ts      # Generación de reporte DJ1948 (inicial)
        │   ├── dj1948TransformService.ts # Transformación de datos para DJ1948
        │   └── dj1948Types.ts        # Tipos TypeScript para DJ1948
        ├── utils/                    # Utilidades
        │   ├── paths.ts              # Rutas de assets
        │   └── rutUtils.ts           # Validación y formateo de RUTs chilenos
        ├── globals.css               # Estilos globales
        ├── layout.tsx                # Layout raíz
        └── page.tsx                  # Landing page
```

## 4. Cómo Iniciar el Prototipo

Para ejecutar el proyecto en un entorno de desarrollo local, sigue estos pasos:

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```

2.  **Ejecutar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```

Una vez ejecutado, abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver el prototipo en acción.

### Probar el Sistema de Autenticación

1. **Registrar un nuevo usuario:**
   - Ve a [http://localhost:3000/login](http://localhost:3000/login)
   - Haz clic en "Registrarse"
   - Completa el formulario con:
     - Nombre y Apellido
     - RUT chileno válido (ej: `12345678-9` con DV correcto)
     - Email y contraseña (mínimo 6 caracteres)
     - Rol: Corredor o Administrador
   - La cuenta se crea automáticamente en Firebase Auth y Firestore

2. **Iniciar sesión:**
   - Usa las credenciales creadas
   - Accede al dashboard personalizado según tu rol

3. **Recuperar contraseña:**
   - Click en "¿Olvidaste tu contraseña?"
   - Ingresa tu email
   - Recibirás un correo de Firebase para restablecer

## 5. Funcionalidades Implementadas

### 🟢 Funcionalidad Completa (Backend + Frontend)

#### **Sistema de Autenticación** - 100% Funcional ✅

Sistema completo de autenticación y gestión de usuarios con Firebase Auth:

**Características Implementadas:**
- ✅ **Registro de usuarios** con Firebase Auth
- ✅ **Inicio de sesión** con email y contraseña
- ✅ **Recuperación de contraseña** via email
- ✅ **Registro en colección `users`** de Firestore con:
  - Nombre, Apellido, RUT (validado)
  - Email, Rol (Corredor/Administrador)
  - Timestamp de creación
- ✅ **Validación de RUT chileno** con dígito verificador
- ✅ **Manejo de errores** con mensajes amigables

**Flujo de Usuario:**
1. Usuario puede registrarse desde el modal de registro
2. Datos se guardan en Firebase Auth y Firestore
3. Usuario puede iniciar sesión con sus credenciales
4. Acceso al dashboard según su rol
5. Opción de recuperar contraseña olvidada

---

#### **Módulo de Carga Masiva** - 100% Funcional ✅

El módulo de carga masiva implementa todos los requisitos funcionales y no funcionales:

**Características Principales:**
- ✅ **RF-01**: Carga masiva de archivos CSV y Excel con validación
- ✅ **RF-02**: Resumen detallado con registros nuevos, actualizados y errores
- ✅ **RF-03**: Validación automática de factores (suma F8-F19 ≤ 100%)
- ✅ **RF-10**: Segregación de datos por corredor
- ✅ **RNF-04**: Procesa hasta 5,000 registros en menos de 2 minutos

**Funcionalidades:**
- ✅ Procesamiento real de archivos CSV/XLSX
- ✅ Validación de datos con reglas de negocio
- ✅ Detección y actualización de duplicados
- ✅ Guardado en Firestore con operaciones por lotes optimizadas
- ✅ **Barra de progreso en tiempo real** con velocidad y tiempo estimado
- ✅ **Exportar errores a CSV** para corrección fácil
- ✅ **Recarga automática de estadísticas** del dashboard
- ✅ Vista previa completa con scroll (hasta 5,000 filas)
- ✅ Selector de plantillas (Normal, Con Errores, 5,000 registros)
- ✅ Resumen detallado de errores y éxitos

📖 **[Ver documentación completa del módulo](./CARGA_MASIVA.md)**

---

#### **Dashboard con Estadísticas Reales** - 100% Funcional ✅

Dashboard principal con datos en tiempo real desde Firestore:

**Estadísticas Dinámicas:**
- ✅ **Calificaciones Activas**: Total real de registros del corredor
- ✅ **Factores Validados**: Registros con suma de factores ≤ 100%
- ✅ **Reportes Generados**: Calculado automáticamente
- ✅ **Tasa de Éxito**: Porcentaje real de validaciones exitosas
- ✅ **Actualización automática** después de cada carga masiva

---

#### **Gestión de Calificaciones** - 100% Funcional ✅

Módulo completo para gestionar calificaciones tributarias:

**Características Implementadas:**
- ✅ **RF-05**: Ingreso y modificación manual de calificaciones
- ✅ **RF-06**: Búsqueda y filtrado avanzado funcional
- ✅ **RF-07**: Exportación de calificaciones a CSV y Excel
- ✅ **Carga de datos reales** desde Firestore
- ✅ **Edición inline** con modal completo y validación en tiempo real
- ✅ **Filtros combinables** por mercado, período, rango de montos
- ✅ **Búsqueda inteligente** por instrumento, mercado, período o tipo
- ✅ **Paginación funcional** con navegación entre páginas
- ✅ **Vista responsive** adaptada a móviles y escritorio
- ✅ **Validación de factores** (suma F8-F19 ≤ 100%) en tiempo real

**Funcionalidades de Edición:**
- Modal completo con todos los campos editables
- Validación de factores en tiempo real con indicador visual
- Actualización automática de la lista después de guardar
- Manejo de errores con mensajes claros

**Funcionalidades de Filtrado:**
- Filtro por mercado (BVC, COLCAP, etc.)
- Filtro por período fiscal
- Filtro por rango de montos (mínimo y máximo)
- Búsqueda de texto libre
- Limpieza rápida de todos los filtros
- Contador de resultados filtrados

**Funcionalidades de Exportación:**
- Exportar a CSV con formato UTF-8 (BOM para Excel)
- Exportar a Excel (XLSX) con formato profesional
- Incluye todos los campos y factores tributarios
- Nombre de archivo con fecha automática

**Funcionalidades Adicionales:**
- ✅ **Asignación de RUT Contribuyente**: Campo para asociar calificaciones a contribuyentes específicos
- ✅ **Visualización de RUT Contribuyente**: Muestra RUT formateado en tablas y vistas móviles
- ✅ **Validación de RUT**: Todos los campos de RUT validan y formatean automáticamente

**Pendiente:**
- ⏳ Crear nueva calificación manualmente
- ⏳ Eliminar calificación con confirmación

---

#### **Validación y Formateo de RUTs** - 100% Funcional ✅

Sistema completo de validación y formateo de RUTs chilenos:

**Características Implementadas:**
- ✅ **Validación de RUT chileno** con algoritmo oficial del SII
- ✅ **Formateo automático** a formato estándar `11.111.111-1`
- ✅ **Soporte de múltiples formatos** de entrada (con/sin puntos y guiones)
- ✅ **Validación en tiempo real** en todos los campos de RUT
- ✅ **Manejo de dígito verificador 'K'**
- ✅ **Normalización para comparaciones** (almacena limpio, muestra formateado)

**Campos con Validación:**
- RUT Contribuyente (en edición de calificaciones)
- RUT Receptor (en generación de reportes DJ1948)
- Selector de contribuyentes (en reportes)
- Visualización en tablas y listas

---

### 🟡 Funcionalidades en Desarrollo

#### **Generación de Reporte DJ1948** - Implementación Inicial 🟡

Generación de reporte DJ1948 en múltiples formatos (PDF, CSV, Excel):

**Estado Actual:**
- ✅ Generación básica en PDF, CSV y Excel
- ✅ Transformación de datos de calificaciones a formato DJ1948
- ✅ Filtrado por contribuyente
- ✅ Validación y formateo de RUTs
- ✅ Selector de contribuyente cuando hay múltiples
- 🟡 **Requiere perfeccionamiento**: Validaciones adicionales, manejo de casos edge, mejoras en formato

**Formatos Disponibles:**
- PDF: Generación con jsPDF y autoTable
- CSV: Formato compatible con SII
- Excel: Multi-sheet con formato profesional

**Pendiente de Mejoras:**
- Validaciones más estrictas según instructivo SII
- Manejo de casos especiales (retiros en exceso, etc.)
- Optimización de formato para mejor legibilidad
- Validación de datos antes de generar

---

#### **Configuración de Usuario** - Solo UI (Sin Persistencia) 🟡

Interfaz de configuración del usuario:

**Estado Actual:**
- ✅ Interfaz completa con todas las opciones
- ✅ Cambios se reflejan en la sesión actual
- ❌ **No persiste en Firestore** (solo estado local)
- ❌ No se carga automáticamente al iniciar sesión

**Opciones Disponibles:**
- Formato de fecha (DD/MM/AAAA, AAAA-MM-DD, MM/DD/AAAA)
- Separador decimal (coma o punto)
- Tamaño de página para tablas (10, 25, 50, 100)
- Notificaciones (activar/desactivar)
- Guardado automático (activar/desactivar)

**Pendiente:**
- Implementar persistencia en Firestore (colección `userConfigs`)
- Carga automática al iniciar sesión
- Botón de guardado con feedback

---

### ⏳ Funcionalidades Pendientes

#### **CRUD Completo de Calificaciones**
- ⏳ **Crear calificación manualmente**: Botón "Nueva Calificación" con formulario completo
- ⏳ **Eliminar calificación**: Botón eliminar con confirmación y registro en auditoría

#### **Otros Reportes**
- ⏳ **Calificaciones por Evento**: Reporte agrupado por tipo de evento de capital
- ⏳ **Resumen por Período**: Consolidado de calificaciones por período fiscal
- ⏳ **Factores por Instrumento**: Análisis de factores tributarios por tipo de instrumento

#### **Mejoras Adicionales**
- ⏳ Optimización de consultas Firestore para grandes volúmenes
- ⏳ Exportación de reportes con plantillas personalizables
- ⏳ Notificaciones en tiempo real de cambios importantes

---

## Plan de Trabajo

**📋 Prioridad Actual: Completar Funcionalidades para Chile**

Antes de expandir el sistema a Perú y Colombia, estamos completando todas las funcionalidades pendientes para Chile:

1. **CRUD Completo**: Crear y eliminar calificaciones manualmente
2. **Persistencia de Configuración**: Guardar preferencias de usuario en Firestore
3. **Mejoras DJ1948**: Validaciones adicionales y mejor formato
4. **Otros Reportes**: Calificaciones por Evento, Resumen por Período, Factores por Instrumento

Ver `PLAN_TRABAJO_CHILE.md` para el plan detallado de implementación.

**🌎 Expansión Multi-País**: Una vez completadas todas las funcionalidades para Chile, procederemos con la implementación multi-país según `MULTI_PAIS_INVESTIGACION.md`.

---
*CobreTech, cualquier uso sin los debidos créditos a los propietarios del prototipo es ilegal.*
