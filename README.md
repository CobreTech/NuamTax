# Sistema de Gestión de Calificaciones Tributarias NUAM

Sistema web para la gestión centralizada de calificaciones tributarias desarrollado para el holding regional NUAM, integración de las bolsas de valores de Santiago, Lima y Colombia. La plataforma permite a los corredores gestionar calificaciones tributarias, realizar cargas masivas, generar reportes oficiales y configurar sus preferencias de trabajo.

*URL del Sistema:* [nuamtax.vercel.app](https://nuamtax.vercel.app)

## Descripción General

NUAM es una intranet especializada en la gestión de calificaciones tributarias para corredores de bolsa. El sistema implementa un modelo de control de acceso basado en roles (RBAC) que garantiza la segregación de datos por corredor, permitiendo que cada usuario gestione únicamente sus propias calificaciones tributarias.

El sistema está diseñado para cumplir con los requisitos tributarios chilenos, específicamente para la generación del formulario DJ1948 del Servicio de Impuestos Internos (SII), con capacidad de expansión futura para Perú y Colombia.

## Arquitectura del Sistema

## Tecnologías Principales

* Next.js 15.5.3 - Framework React con App Router para renderizado del lado del servidor
* React 19.1.0 - Biblioteca para construcción de interfaces de usuario
* TypeScript 5 - Tipado estático para mayor robustez y mantenibilidad
* Tailwind CSS 4.1.13 - Framework CSS utility-first para diseño responsive
* Firebase Authentication - Sistema de autenticación con email y contraseña
* Firebase Firestore - Base de datos NoSQL en tiempo real
* PapaParse 5.5.3 - Procesamiento de archivos CSV
* SheetJS (xlsx) 0.18.5 - Procesamiento de archivos Excel
* jsPDF 3.0.3 - Generación de documentos PDF
* Framer Motion 12.23.12 - Animaciones y transiciones de interfaz

## Estructura del Proyecto

```
src/app/
├── components/          # Componentes globales reutilizables
│   ├── ConfirmDialog.tsx
│   ├── CustomDatePicker.tsx
│   ├── CustomDropdown.tsx
│   └── ProtectedRoute.tsx
├── dashboard/          # Panel principal de la aplicación
│   ├── components/
│   │   ├── OverviewSection.tsx      # Resumen general y estadísticas
│   │   ├── QualificationsSection.tsx # Gestión de calificaciones
│   │   ├── EditQualificationModal.tsx # Modal de creación/edición
│   │   ├── UploadSection.tsx         # Carga masiva de datos
│   │   ├── ReportsSection.tsx        # Generación de reportes
│   │   ├── SettingsSection.tsx       # Configuración de usuario
│   │   └── types.ts                  # Definiciones de tipos
│   └── page.tsx
├── services/           # Servicios de backend y lógica de negocio
│   ├── firestoreService.ts           # CRUD y operaciones Firestore
│   ├── fileProcessingService.ts     # Procesamiento CSV/Excel
│   ├── taxValidationService.ts      # Validación de datos tributarios
│   ├── exportService.ts             # Exportación de datos
│   ├── auditService.ts              # Sistema de auditoría
│   ├── dj1948Service.ts             # Generación DJ1948 (fase inicial)
│   ├── dj1948TransformService.ts    # Transformación de datos DJ1948
│   ├── reportEventService.ts        # Reporte por evento de capital
│   ├── reportPeriodService.ts       # Reporte resumen por período
│   └── reportFactorsService.ts      # Reporte factores por instrumento
├── utils/              # Utilidades y helpers
│   ├── dateUtils.ts                 # Formateo de fechas
│   ├── rutUtils.ts                  # Validación y formateo de RUTs
│   ├── icons.tsx                    # Biblioteca de iconos
│   └── rbac.ts                      # Control de acceso por roles
└── context/
    └── AuthContext.tsx              # Contexto de autenticación
```

## Flujos Operacionales

## Flujo de Autenticación y Autorización

1. *Registro de Usuario*
   - El usuario accede a la página de login y selecciona "Registrarse"
   - Se requiere autenticación de administrador para crear nuevos usuarios
   - El formulario valida RUT chileno con algoritmo oficial del SII
   - Los datos se guardan en Firebase Authentication y Firestore (colección `users`)
   - Se asigna un rol: Corredor o Administrador

2. *Inicio de Sesión*
   - El usuario ingresa email y contraseña
   - Firebase Authentication valida las credenciales
   - El sistema carga el perfil del usuario desde Firestore
   - Se redirige al dashboard según el rol del usuario
   - Se registra el evento de login en la auditoría

3. *Control de Acceso*
   - Los corredores acceden únicamente a sus propias calificaciones
   - Los administradores acceden al panel de administración
   - Todas las operaciones sensibles verifican permisos antes de ejecutarse
   - Los intentos de acceso no autorizado se registran en auditoría

## Flujo de Gestión de Calificaciones

1. *Creación Manual de Calificación*
   - El corredor hace clic en "Nueva Calificación"
   - El sistema abre un modal con formulario completo
   - El campo RUT Contribuyente es obligatorio
   - El campo Período se prellena con la fecha actual formateada según la configuración del usuario
   - El sistema valida en tiempo real la suma de factores (F8-F19) no exceda 100%
   - Al guardar, se crea el registro en Firestore y se registra en auditoría
   - La lista de calificaciones se actualiza automáticamente

2. *Carga Masiva de Calificaciones*
   - El corredor selecciona un archivo CSV o Excel desde la sección de carga
   - El sistema procesa el archivo y valida cada registro
   - Se detectan duplicados comparando tipo de instrumento, mercado y período
   - Los registros duplicados se actualizan, los nuevos se crean
   - Se muestra un resumen con registros exitosos, actualizados y errores
   - Los errores pueden exportarse a CSV para corrección
   - Las estadísticas del dashboard se actualizan automáticamente

3. *Edición de Calificación*
   - El corredor hace clic en el botón de editar en una calificación
   - El sistema carga los datos existentes en el modal
   - El RUT Contribuyente es opcional en modo edición
   - La fecha se muestra formateada según la configuración del usuario
   - Al guardar, se actualiza el registro en Firestore y se registra en auditoría

4. *Eliminación de Calificación*
   - El corredor hace clic en el botón de eliminar
   - El sistema muestra un diálogo de confirmación personalizado
   - Al confirmar, se elimina el registro de Firestore
   - Se registra el evento en auditoría con los datos de la calificación eliminada
   - La lista se actualiza automáticamente

5. *Búsqueda y Filtrado*
   - El corredor puede buscar por texto libre (instrumento, mercado, período, tipo)
   - Puede aplicar filtros combinados: mercado, período, rango de montos
   - Los resultados se muestran con paginación configurable
   - Los filtros pueden limpiarse con un solo clic

## Flujo de Generación de Reportes

1. *Reporte DJ1948 (Fase Inicial)*
   - El corredor accede a la sección de reportes
   - Aplica filtros opcionales por evento de capital y rango de fechas
   - Si hay múltiples contribuyentes, selecciona uno del dropdown
   - Completa datos adicionales opcionales (domicilio, comuna, teléfono, etc.)
   - Selecciona formato de exportación: PDF, CSV o Excel
   - El sistema transforma las calificaciones al formato DJ1948
   - Genera el archivo y lo descarga automáticamente
   - Se registra el evento de exportación en auditoría
   - Nota: Esta funcionalidad está en fase inicial y requiere perfeccionamiento en validaciones, formato y manejo de casos especiales según el instructivo oficial del SII

2. *Reporte de Calificaciones por Evento de Capital*
   - El corredor aplica filtros opcionales (evento, fechas)
   - Hace clic en "Generar PDF"
   - El sistema agrupa las calificaciones por tipo de evento
   - Genera un PDF con estadísticas y detalles por evento
   - Se registra el evento de exportación en auditoría

3. *Reporte Resumen por Período*
   - El corredor aplica filtros opcionales por rango de fechas
   - Hace clic en "Generar PDF"
   - El sistema agrupa las calificaciones por período fiscal
   - Genera un PDF con consolidado trimestral y estadísticas
   - Se registra el evento de exportación en auditoría

4. *Reporte Factores por Instrumento*
   - El corredor aplica filtros opcionales por rango de fechas
   - Hace clic en "Generar PDF"
   - El sistema analiza la distribución de factores F8-F19 por instrumento
   - Genera un PDF con resumen general y análisis detallado
   - Se registra el evento de exportación en auditoría

## Flujo de Configuración de Usuario

1. *Carga de Configuración*
   - Al iniciar sesión, el sistema carga la configuración del usuario desde Firestore
   - Si no existe configuración, se usan valores por defecto
   - La configuración se aplica inmediatamente en la interfaz

2. *Modificación de Configuración*
   - El usuario accede a la sección de configuración
   - Modifica las preferencias (formato de fecha, separador decimal, tamaño de página, etc.)
   - Si el guardado automático está activado, los cambios se guardan después de 1 segundo de inactividad
   - El usuario puede guardar manualmente haciendo clic en el botón "Guardar"
   - El sistema muestra feedback visual del estado de guardado

3. *Aplicación de Configuración*
   - El formato de fecha se aplica automáticamente al crear nuevas calificaciones
   - El separador decimal se usa en la visualización de montos
   - El tamaño de página se aplica en todas las tablas del sistema

## Funcionalidades Principales

## Sistema de Autenticación

Implementación completa de autenticación con Firebase Auth que incluye registro de usuarios, inicio de sesión, recuperación de contraseña y gestión de sesiones. Todos los usuarios se almacenan en Firestore con validación de RUT chileno y asignación de roles.

## Gestión de Calificaciones Tributarias

Sistema completo de CRUD para calificaciones tributarias con validación en tiempo real de factores (F8-F19), búsqueda avanzada, filtrado combinable y exportación a CSV y Excel. El sistema soporta hasta 5,000 calificaciones por corredor con paginación automática.

## Carga Masiva de Datos

Módulo optimizado para procesar hasta 5,000 registros en menos de 2 minutos. Incluye validación de datos, detección de duplicados, actualización automática de registros existentes, barra de progreso en tiempo real y exportación de errores para corrección.

## Generación de Reportes

Sistema de generación de reportes en múltiples formatos:

* DJ1948: Reporte oficial del SII en PDF, CSV y Excel (fase inicial, requiere perfeccionamiento)
* Calificaciones por Evento de Capital: Análisis agrupado por tipo de evento
* Resumen por Período: Consolidado trimestral de calificaciones
* Factores por Instrumento: Análisis de distribución de factores tributarios

## Sistema de Auditoría

Registro automático de todas las operaciones significativas del sistema incluyendo creación, actualización y eliminación de calificaciones, exportación de reportes, cargas masivas y cambios de configuración. Todos los eventos incluyen timestamp, usuario, acción y detalles relevantes.

## Configuración de Usuario

Sistema de persistencia de preferencias de usuario en Firestore que incluye formato de fecha, separador decimal, tamaño de página para tablas, notificaciones y guardado automático. La configuración se carga automáticamente al iniciar sesión y se aplica en toda la interfaz.

## Validación y Formateo de RUTs

Sistema completo de validación de RUTs chilenos con algoritmo oficial del SII, formateo automático a formato estándar, soporte de múltiples formatos de entrada y validación en tiempo real en todos los campos de RUT.

## Control de Acceso y Seguridad

El sistema implementa un modelo de control de acceso basado en roles (RBAC) que garantiza:

* Los corredores solo pueden acceder a sus propias calificaciones
* Los administradores tienen acceso completo al panel de administración
* Todas las operaciones sensibles verifican permisos antes de ejecutarse
* Los intentos de acceso no autorizado se registran en auditoría
* La segregación de datos se mantiene a nivel de base de datos

## Estado de Desarrollo

## Funcionalidades Completas

* Autenticación y autorización con RBAC
* CRUD completo de calificaciones tributarias
* Carga masiva optimizada (hasta 5,000 registros)
* Búsqueda y filtrado avanzado
* Exportación de calificaciones a CSV y Excel
* Generación de reportes: Evento de Capital, Resumen por Período, Factores por Instrumento
* Persistencia de configuración de usuario
* Sistema de auditoría completo
* Validación y formateo de RUTs chilenos

## Funcionalidades en Desarrollo

* Generación de reporte DJ1948: La funcionalidad básica está implementada pero requiere perfeccionamiento en validaciones, formato y manejo de casos especiales según el instructivo oficial del SII.

## Estructura de Datos

## Calificación Tributaria

Cada calificación tributaria contiene:

* Identificador único y referencia al usuario propietario
* RUT del contribuyente (obligatorio al crear, opcional al editar)
* Tipo de instrumento, mercado de origen y período fiscal
* Monto con valor y moneda
* Factores tributarios F8-F19 (valores decimales entre 0 y 1)
* Indicador de valor no inscrito
* Fechas de creación y última modificación
* Tipo de calificación (opcional)

## Configuración de Usuario

La configuración de usuario incluye:

* Formato de fecha preferido (DD/MM/AAAA, AAAA-MM-DD, MM/DD/AAAA)
* Separador decimal (coma o punto)
* Tamaño de página para tablas (10, 25, 50, 100 registros)
* Preferencias de notificaciones
* Configuración de guardado automático

## Base de Datos

El sistema utiliza Firebase Firestore con las siguientes colecciones principales:

* `users`: Perfiles de usuario con información personal y roles
* `calificaciones`: Calificaciones tributarias con segregación por corredor
* `userConfigs`: Configuraciones de usuario por ID de usuario
* `auditLogs`: Registros de auditoría de todas las operaciones del sistema

Todas las consultas implementan paginación para manejar grandes volúmenes de datos y garantizar el rendimiento del sistema.

## Notas Técnicas

* El sistema está optimizado para procesar hasta 5,000 calificaciones por corredor
* La paginación automática permite cargar todas las calificaciones sin límites
* El formateo de fechas se aplica automáticamente según la configuración del usuario
* La validación de RUTs utiliza el algoritmo oficial del SII
* Todos los reportes se generan en formato PDF usando jsPDF
* El sistema de auditoría registra todas las operaciones críticas para trazabilidad

## Licencia y Créditos

CobreTech - Todos los derechos reservados. Cualquier uso sin los debidos créditos a los propietarios del prototipo es ilegal.
