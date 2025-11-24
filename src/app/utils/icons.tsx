/**
 * @file icons.tsx
 * @description Biblioteca centralizada de iconos del sistema
 * Usa react-icons para mantener consistencia visual
 */

// Lucide React Icons (moderno, limpio, profesional)
import {
  FiUsers, FiUserPlus, FiUserCheck, FiUserX, FiUser,
  FiLock, FiUnlock, FiKey, FiEdit2, FiTrash2,
  FiUpload, FiDownload, FiFile, FiFileText,
  FiCheck, FiX, FiAlertCircle, FiInfo,
  FiBarChart2, FiPieChart, FiTrendingUp, FiActivity,
  FiSettings, FiDatabase, FiServer, FiClock,
  FiMail, FiBell, FiCalendar, FiFilter,
  FiSearch, FiRefreshCw, FiSave, FiPlus,
  FiChevronRight, FiChevronLeft, FiChevronDown, FiChevronUp,
  FiMenu, FiHome, FiLogOut, FiLogIn,
  FiEye, FiEyeOff, FiCopy, FiExternalLink,
  FiShield, FiCheckCircle, FiXCircle, FiAlertTriangle,
  FiPercent, FiDollarSign,
} from 'react-icons/fi';

import {
  HiOutlineDocumentText, HiOutlineChartBar, HiOutlineClipboardList,
  HiOutlineCog, HiOutlineArchive, HiOutlineCloud,
} from 'react-icons/hi';

import {
  MdDashboard, MdAssessment, MdSecurity, MdSpeed,
  MdVerified, MdError, MdWarning, MdNotifications,
} from 'react-icons/md';

import {
  AiOutlineLineChart, AiOutlineAreaChart, AiOutlineFund,
} from 'react-icons/ai';

// Exportar iconos organizados por categoría
export const Icons = {
  // Usuarios
  Users: FiUsers,
  UserAdd: FiUserPlus,
  UserCheck: FiUserCheck,
  UserX: FiUserX,
  User: FiUser,

  // Seguridad
  Lock: FiLock,
  Unlock: FiUnlock,
  Key: FiKey,
  Shield: FiShield,

  // Acciones
  Edit: FiEdit2,
  Delete: FiTrash2,
  Save: FiSave,
  Add: FiPlus,
  Check: FiCheck,
  Close: FiX,
  Refresh: FiRefreshCw,
  Copy: FiCopy,

  // Archivos
  Upload: FiUpload,
  Download: FiDownload,
  File: FiFile,
  FileText: FiFileText,
  Document: HiOutlineDocumentText,
  Archive: HiOutlineArchive,

  // Estado
  Success: FiCheckCircle,
  Error: FiXCircle,
  Warning: FiAlertTriangle,
  Info: FiAlertCircle,
  Verified: MdVerified,

  // Navegación
  Menu: FiMenu,
  Home: FiHome,
  ChevronRight: FiChevronRight,
  ChevronLeft: FiChevronLeft,
  ChevronDown: FiChevronDown,
  ChevronUp: FiChevronUp,

  // Autenticación
  Login: FiLogIn,
  Logout: FiLogOut,
  Eye: FiEye,
  EyeOff: FiEyeOff,

  // Dashboard y Analytics
  Dashboard: MdDashboard,
  BarChart: FiBarChart2,
  PieChart: FiPieChart,
  TrendingUp: FiTrendingUp,
  Activity: FiActivity,
  LineChart: AiOutlineLineChart,
  AreaChart: AiOutlineAreaChart,
  ChartBar: HiOutlineChartBar,
  Assessment: MdAssessment,
  Fund: AiOutlineFund,

  // Sistema
  Settings: FiSettings,
  Cog: HiOutlineCog,
  Database: FiDatabase,
  Server: FiServer,
  Cloud: HiOutlineCloud,
  Security: MdSecurity,
  Speed: MdSpeed,

  // Comunicación
  Mail: FiMail,
  Bell: FiBell,
  Notifications: MdNotifications,

  // Utilidades
  Calendar: FiCalendar,
  Clock: FiClock,
  Filter: FiFilter,
  Search: FiSearch,
  ExternalLink: FiExternalLink,
  ClipboardList: HiOutlineClipboardList,

  // Errores y avisos
  ErrorIcon: MdError,
  WarningIcon: MdWarning,

  // Financiero
  Percent: FiPercent,
  DollarSign: FiDollarSign,
};

export default Icons;
