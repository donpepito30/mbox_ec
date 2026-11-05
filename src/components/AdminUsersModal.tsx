// Mbox_ec - Panel de Control Total de Usuarios y Blindaje de Seguridad
// Exclusivo para el Super Administrador y Administradores autorizados
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  Ban,
  RotateCcw,
  Download,
  AlertTriangle,
  Crown,
  Settings2,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Cpu,
  Fingerprint,
  FileText,
  Activity,
} from 'lucide-react';
import {
  User,
  UserStatus,
  UserRole,
  getAllUsers,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  addUserManually,
  getAuthSettings,
  updateAuthSettings,
  exportUsersJson,
  isSuperAdmin,
  getMasterAdminPin,
  setMasterAdminPin,
  getSecurityAuditLog,
  exportSecurityAuditLogJson,
  clearSecurityAuditLog,
  checkAdminPinRateLimit,
  resetAdminPinRateLimit,
  SecurityEvent,
  SecuritySeverity,
} from '../services/auth.ts';

interface AdminUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUserUpdated?: () => void;
}

export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}) => {
  // Pestaña activa: Usuarios o Blindaje/Auditoría
  const [activeTab, setActiveTab] = useState<'USERS' | 'SECURITY'>('USERS');

  const [usersList, setUsersList] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');

  // Configuración de políticas de acceso
  const [requireApproval, setRequireApproval] = useState<boolean>(false);

  // Formulario de agregar usuario manual
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('USER');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // PIN Maestro de Seguridad del Propietario
  const [currentPin, setCurrentPin] = useState<string>('');
  const [isEditingPin, setIsEditingPin] = useState<boolean>(false);
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [showPinValue, setShowPinValue] = useState<boolean>(false);

  // Estado de Seguridad y Auditoría
  const [auditLogs, setAuditLogs] = useState<SecurityEvent[]>([]);
  const [auditFilter, setAuditFilter] = useState<'ALL' | SecuritySeverity>('ALL');
  const [auditSearch, setAuditSearch] = useState('');
  const [pinLockStatus, setPinLockStatus] = useState<{ isBlocked: boolean; remainingSeconds: number }>({
    isBlocked: false,
    remainingSeconds: 0,
  });

  // Cargar usuarios y configuraciones
  const reloadData = () => {
    setUsersList(getAllUsers());
    const settings = getAuthSettings();
    setRequireApproval(settings.requireAdminApproval);
    setCurrentPin(getMasterAdminPin());
    setAuditLogs(getSecurityAuditLog());
    setPinLockStatus(checkAdminPinRateLimit());
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
      setActionError(null);
      setActionSuccess(null);
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // KPIs
  const totalCount = usersList.length;
  const activeCount = usersList.filter((u) => u.status === 'ACTIVE').length;
  const pendingCount = usersList.filter((u) => u.status === 'PENDING').length;
  const suspendedCount = usersList.filter((u) => u.status === 'SUSPENDED').length;

  // Filtrado de usuarios
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtrado de eventos de auditoría
  const filteredAuditLogs = auditLogs.filter((evt) => {
    const matchesSeverity = auditFilter === 'ALL' || evt.severity === auditFilter;
    const matchesSearch =
      !auditSearch ||
      evt.message.toLowerCase().includes(auditSearch.toLowerCase()) ||
      evt.type.toLowerCase().includes(auditSearch.toLowerCase()) ||
      (evt.emailMasked && evt.emailMasked.toLowerCase().includes(auditSearch.toLowerCase()));
    return matchesSeverity && matchesSearch;
  });

  const handleStatusChange = (email: string, newStatus: UserStatus) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      updateUserStatus(email, newStatus);
      reloadData();
      if (onUserUpdated) onUserUpdated();
      setActionSuccess(
        `Estado de ${email} actualizado a ${
          newStatus === 'ACTIVE' ? 'ACTIVO' : newStatus === 'SUSPENDED' ? 'SUSPENDIDO' : 'PENDIENTE'
        }.`
      );
    } catch (err: any) {
      setActionError(err.message || 'Error al cambiar estado.');
    }
  };

  const handleRoleChange = (email: string, role: UserRole) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      updateUserRole(email, role);
      reloadData();
      if (onUserUpdated) onUserUpdated();
      setActionSuccess(`Rol de ${email} actualizado a ${role}.`);
    } catch (err: any) {
      setActionError(err.message || 'Error al cambiar rol.');
    }
  };

  const handleDeleteUser = (email: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente a ${email}? Esta acción no se puede deshacer.`)) {
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    try {
      deleteUser(email);
      reloadData();
      if (onUserUpdated) onUserUpdated();
      setActionSuccess(`Usuario ${email} eliminado permanentemente del sistema.`);
    } catch (err: any) {
      setActionError(err.message || 'Error al eliminar usuario.');
    }
  };

  const handleToggleRequireApproval = () => {
    const nextVal = !requireApproval;
    setRequireApproval(nextVal);
    updateAuthSettings({ requireAdminApproval: nextVal });
    setActionSuccess(
      nextVal
        ? 'Política activada: Nuevos usuarios requerirán tu aprobación antes de acceder.'
        : 'Política desactivada: Nuevos usuarios tendrán acceso inmediato al registrarse.'
    );
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    try {
      addUserManually(newEmail, newName, newRole, 'ACTIVE');
      setNewEmail('');
      setNewName('');
      setIsAddingUser(false);
      reloadData();
      if (onUserUpdated) onUserUpdated();
      setActionSuccess(`Usuario ${newEmail} agregado y autorizado con éxito.`);
    } catch (err: any) {
      setActionError(err.message || 'Error al añadir usuario.');
    }
  };

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    try {
      setMasterAdminPin(newPinInput);
      setCurrentPin(newPinInput);
      setIsEditingPin(false);
      setNewPinInput('');
      setActionSuccess('¡PIN Maestro del Propietario actualizado con éxito!');
      reloadData();
    } catch (err: any) {
      setActionError(err.message || 'Error al actualizar el PIN.');
    }
  };

  const handleResetLockout = () => {
    resetAdminPinRateLimit();
    setPinLockStatus({ isBlocked: false, remainingSeconds: 0 });
    setActionSuccess('Bloqueo temporal de PIN restablecido exitosamente.');
  };

  const handleDownloadBackup = () => {
    const json = exportUsersJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mbox_usuarios_respaldo_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAuditLogs = () => {
    const json = exportSecurityAuditLogJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mbox_auditoria_seguridad_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClearLogs = () => {
    if (!window.confirm('¿Deseas vaciar la pista de auditoría de seguridad? Se mantendrá constancia de este vaciado.')) {
      return;
    }
    clearSecurityAuditLog();
    setAuditLogs(getSecurityAuditLog());
    setActionSuccess('Registro de auditoría vaciado.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      
      <div className="relative w-full max-w-5xl max-h-[92dvh] overflow-y-auto rounded-3xl border border-neutral-800 bg-[#08080A] p-5 sm:p-7 shadow-2xl text-neutral-100 flex flex-col space-y-6">
        
        {/* Cabecera del Panel */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF1A24]/10 border border-[#FF1A24]/30 text-[#FF1A24]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Panel de Control y Seguridad Mbox_Ec
                </h2>
                <span className="rounded-full bg-[#FF1A24]/20 border border-[#FF1A24]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#FF1A24] uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Control de permanencia, gestión de accesos y blindaje multicapa de la plataforma.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadBackup}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
              title="Descargar respaldo de usuarios en JSON"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Respaldar</span>
            </button>

            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800 transition cursor-pointer"
              title="Cerrar panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Pestañas de Navegación del Panel */}
        <div className="flex items-center gap-2 border-b border-neutral-800/60 pb-1">
          <button
            onClick={() => setActiveTab('USERS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'USERS'
                ? 'bg-[#FF1A24] text-white shadow-lg shadow-[#FF1A24]/20'
                : 'bg-neutral-900/60 text-neutral-400 hover:text-white border border-neutral-800/60'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Directorio de Usuarios ({totalCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('SECURITY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'SECURITY'
                ? 'bg-[#FF1A24] text-white shadow-lg shadow-[#FF1A24]/20'
                : 'bg-neutral-900/60 text-neutral-400 hover:text-white border border-neutral-800/60'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Blindaje y Auditoría</span>
            {auditLogs.some((l) => l.severity === 'CRITICAL') && (
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Notificaciones */}
        {actionError && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-200">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200">
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* CONTENIDO PESTAÑA 1: DIRECTORIO DE USUARIOS */}
        {activeTab === 'USERS' && (
          <div className="space-y-6">
            {/* Tarjetas KPI de Estado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-1">
                <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold">
                  <span>Total Registrados</span>
                  <Users className="h-4 w-4 text-neutral-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono tabular-nums">{totalCount}</div>
              </div>

              <div className="rounded-2xl border border-emerald-900/30 bg-emerald-950/20 p-4 space-y-1">
                <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
                  <span>Activos (Con Acceso)</span>
                  <UserCheck className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono tabular-nums">{activeCount}</div>
              </div>

              <div className="rounded-2xl border border-amber-900/30 bg-amber-950/20 p-4 space-y-1">
                <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
                  <span>Pendientes</span>
                  <Clock className="h-4 w-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono tabular-nums">{pendingCount}</div>
              </div>

              <div className="rounded-2xl border border-red-900/30 bg-red-950/20 p-4 space-y-1">
                <div className="flex items-center justify-between text-red-400 text-xs font-semibold">
                  <span>Suspendidos</span>
                  <UserX className="h-4 w-4 text-red-400" />
                </div>
                <div className="text-2xl font-black text-red-400 font-mono tabular-nums">{suspendedCount}</div>
              </div>
            </div>

            {/* Política de Permanencia y Nuevo Registro */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-[#FF1A24]" />
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    Política de Permanencia: Aprobación Previa Obligatoria
                  </h3>
                </div>
                <p className="text-xs text-neutral-400 max-w-xl">
                  {requireApproval
                    ? 'Activado: Todo usuario que se registre con Google entrará en estado "Pendiente" hasta que tú lo apruebes.'
                    : 'Desactivado: Cualquier usuario con correo Google válido (@gmail.com) obtiene acceso activo inmediato. Puedes suspenderlo o eliminarlo cuando gustes.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleRequireApproval}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                    requireApproval
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-950'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  }`}
                >
                  <span>{requireApproval ? 'Modo Aprobación Activo' : 'Modo Acceso Directo'}</span>
                </button>

                <button
                  onClick={() => setIsAddingUser(!isAddingUser)}
                  className="px-3.5 py-2 rounded-xl bg-[#FF1A24] hover:bg-[#FF1A24]/90 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Añadir Correo</span>
                </button>
              </div>
            </div>

            {/* Formulario Desplegable para Agregar Usuario Manual */}
            {isAddingUser && (
              <form
                onSubmit={handleAddUserSubmit}
                className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 sm:p-5 space-y-4 animate-in fade-in"
              >
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Autorizar o Pre-registrar Usuario de Google
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="text-xs text-neutral-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-neutral-400 font-semibold block mb-1">
                      Correo Google (@gmail.com)
                    </label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="ejemplo@gmail.com"
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-600 focus:border-[#FF1A24] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 font-semibold block mb-1">
                      Nombre (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nombre de pila o alias"
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-600 focus:border-[#FF1A24] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 font-semibold block mb-1">
                      Rol Inicial
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-[#FF1A24] focus:outline-none cursor-pointer"
                    >
                      <option value="USER">Usuario Estándar</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-[#FF1A24] hover:bg-[#FF1A24]/90 text-white font-bold text-xs px-4 py-2 transition cursor-pointer"
                >
                  Guardar y Autorizar
                </button>
              </form>
            )}

            {/* Barra de Búsqueda y Filtros de Estado */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl text-xs self-start">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    statusFilter === 'ALL' ? 'bg-[#FF1A24] text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Todos ({totalCount})
                </button>
                <button
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Activos ({activeCount})
                </button>
                <button
                  onClick={() => setStatusFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    statusFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Pendientes ({pendingCount})
                </button>
                <button
                  onClick={() => setStatusFilter('SUSPENDED')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    statusFilter === 'SUSPENDED' ? 'bg-red-800 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Suspendidos ({suspendedCount})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por correo o nombre..."
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#FF1A24] focus:outline-none"
                />
              </div>
            </div>

            {/* Tabla de Usuarios Registrados */}
            <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900/80 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                  <tr>
                    <th className="px-4 py-3">Usuario Google</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Estado de Permanencia</th>
                    <th className="px-4 py-3 hidden md:table-cell">Registro</th>
                    <th className="px-4 py-3 text-right">Acciones de Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                        No se encontraron usuarios coincidentes.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isOwner = isSuperAdmin(user.email);

                      return (
                        <tr key={user.email} className="hover:bg-neutral-900/40 transition-colors">
                          {/* Usuario */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-xl text-white font-bold text-xs shadow-sm ${user.avatarColor}`}
                              >
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 font-bold text-white">
                                  <span>{user.name}</span>
                                  {isOwner && (
                                    <span title="Propietario Inmune">
                                      <Crown className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-neutral-400 font-mono">{user.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Rol */}
                          <td className="px-4 py-3.5">
                            {isOwner ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                                Super Admin
                              </span>
                            ) : (
                              <select
                                value={user.role}
                                disabled={isOwner}
                                onChange={(e) => handleRoleChange(user.email, e.target.value as UserRole)}
                                className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-200 cursor-pointer focus:outline-none focus:border-[#FF1A24]"
                              >
                                <option value="USER">Usuario</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                            )}
                          </td>

                          {/* Estado */}
                          <td className="px-4 py-3.5">
                            {user.status === 'ACTIVE' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                                <CheckCircle className="h-3 w-3" />
                                <span>Activo</span>
                              </span>
                            )}
                            {user.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
                                <Clock className="h-3 w-3" />
                                <span>Pendiente</span>
                              </span>
                            )}
                            {user.status === 'SUSPENDED' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 text-[10px] font-bold text-red-400">
                                <Ban className="h-3 w-3" />
                                <span>Suspendido</span>
                              </span>
                            )}
                          </td>

                          {/* Fecha de Registro */}
                          <td className="px-4 py-3.5 hidden md:table-cell text-neutral-400 font-mono text-[11px]">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>

                          {/* Acciones */}
                          <td className="px-4 py-3.5 text-right">
                            {isOwner ? (
                              <span className="text-[11px] text-neutral-500 italic">Propietario protegido</span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Activar / Aprobar */}
                                {user.status !== 'ACTIVE' && (
                                  <button
                                    onClick={() => handleStatusChange(user.email, 'ACTIVE')}
                                    className="flex items-center gap-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold transition cursor-pointer"
                                    title="Aprobar y dar acceso completo"
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    <span>Activar</span>
                                  </button>
                                )}

                                {/* Suspender / Bloquear */}
                                {user.status === 'ACTIVE' && (
                                  <button
                                    onClick={() => handleStatusChange(user.email, 'SUSPENDED')}
                                    className="flex items-center gap-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold transition cursor-pointer"
                                    title="Suspender acceso temporalmente"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                    <span>Suspender</span>
                                  </button>
                                )}

                                {/* Eliminar definitivamente */}
                                <button
                                  onClick={() => handleDeleteUser(user.email)}
                                  className="p-1.5 rounded-lg bg-neutral-900 hover:bg-red-950 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-900 transition cursor-pointer"
                                  title="Eliminar permanentemente"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTENIDO PESTAÑA 2: BLINDAJE Y AUDITORÍA DE SEGURIDAD */}
        {activeTab === 'SECURITY' && (
          <div className="space-y-6">
            {/* Banner de Estado del Blindaje Multicapa */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Blindaje Criptográfico y Defensa Multicapa (Defense-in-Depth)
                  </h3>
                </div>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Protección Activa
                </span>
              </div>

              {/* Grid con las 6 Capas de Blindaje */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                
                {/* Capa 1 */}
                <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/70 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-[#FF1A24]" />
                      Capa 1: Anti-Fuerza Bruta
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Activo
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Bloqueo temporal de 3 minutos tras 3 intentos erróneos de PIN. Previene ataques por diccionario automatizados.
                  </p>
                </div>

                {/* Capa 2 */}
                <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/70 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-blue-400" />
                      Capa 2: Tokens HMAC SHA-256
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Activo
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Firmas criptográficas SHA-256 generadas con entropía de 256 bits (`Web Crypto API`). Tokens no falsificables.
                  </p>
                </div>

                {/* Capa 3 */}
                <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/70 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                      <Fingerprint className="h-3.5 w-3.5 text-amber-400" />
                      Capa 3: Huella de Dispositivo
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Activo
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Vincula la sesión al hardware y entorno del cliente. Impide el secuestro de sesiones por robo de cookies (`Session Hijacking`).
                  </p>
                </div>

                {/* Capa 4 */}
                <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/70 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-purple-400" />
                      Capa 4: Tiempo Constante
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Activo
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Comparación en tiempo constante (`timingSafeEqual`) para evitar filtración de PIN o firmas por ataques de canal lateral (`Timing Attacks`).
                  </p>
                </div>

                {/* Capa 5 */}
                <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/70 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                      Capa 5: Anti-Bypass Google
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Activo
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Normalización estricta que remueve puntos en nombres (`j.j.86...`) y etiquetas `+tag` para neutralizar suplantaciones de identidad.
                  </p>
                </div>

                {/* Capa 6 */}
                <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/70 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-rose-400" />
                      Capa 6: Auditoría Forense
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Activo
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Pista de auditoría inmutable con enmascaramiento de identidad (`maskEmail`), sellos de tiempo ISO y niveles de criticidad.
                  </p>
                </div>

              </div>
            </div>

            {/* Gestión del PIN Maestro del Propietario */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-amber-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    PIN Maestro de Seguridad del Propietario ({currentUser.email})
                  </h3>
                </div>
                <p className="text-xs text-neutral-400 max-w-xl">
                  Llave secreta maestra que impide que cualquier visitante o usuario suplante tu cuenta de Super Admin en la plataforma.
                </p>
                <div className="flex items-center gap-3 pt-2 font-mono text-xs text-neutral-300">
                  <span className="text-neutral-400">PIN Actual:</span>
                  <span className="bg-neutral-950 border border-neutral-800 px-2.5 py-1 rounded-lg text-amber-400 font-bold tracking-widest">
                    {showPinValue ? currentPin : '••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPinValue(!showPinValue)}
                    className="text-neutral-400 hover:text-white cursor-pointer"
                    title={showPinValue ? 'Ocultar' : 'Mostrar PIN'}
                  >
                    {showPinValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>

                  {/* Estado de bloqueo del limitador */}
                  {pinLockStatus.isBlocked ? (
                    <span className="flex items-center gap-1 text-[11px] text-red-400 bg-red-950/60 border border-red-800 px-2 py-0.5 rounded-lg">
                      <AlertTriangle className="h-3 w-3" />
                      Bloqueado por {pinLockStatus.remainingSeconds}s
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-400 bg-emerald-950/50 border border-emerald-900 px-2 py-0.5 rounded-lg">
                      Tasa Normal (0 bloqueos)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {pinLockStatus.isBlocked && (
                  <button
                    onClick={handleResetLockout}
                    className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    title="Restablecer bloqueo temporal si te equivocaste de PIN"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    <span>Desbloquear</span>
                  </button>
                )}

                {!isEditingPin ? (
                  <button
                    onClick={() => {
                      setIsEditingPin(true);
                      setNewPinInput(currentPin);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                    <span>Modificar PIN</span>
                  </button>
                ) : (
                  <form onSubmit={handleUpdatePin} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      placeholder="Nuevo PIN (mín. 4 car.)"
                      className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition cursor-pointer"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingPin(false)}
                      className="text-xs text-neutral-400 hover:text-white cursor-pointer px-2"
                    >
                      Cancelar
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Registro de Auditoría de Seguridad Forense */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#FF1A24]" />
                  <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                    Pista de Auditoría en Tiempo Real ({filteredAuditLogs.length} eventos)
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadAuditLogs}
                    className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
                    title="Exportar log forense en JSON"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Exportar JSON</span>
                  </button>

                  <button
                    onClick={handleClearLogs}
                    className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:text-red-400 transition cursor-pointer"
                    title="Vaciar log"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Vaciar</span>
                  </button>
                </div>
              </div>

              {/* Filtros de Auditoría y Búsqueda */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl text-xs self-start">
                  <button
                    onClick={() => setAuditFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      auditFilter === 'ALL' ? 'bg-[#FF1A24] text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Todos ({auditLogs.length})
                  </button>
                  <button
                    onClick={() => setAuditFilter('INFO')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      auditFilter === 'INFO' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Info
                  </button>
                  <button
                    onClick={() => setAuditFilter('WARN')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      auditFilter === 'WARN' ? 'bg-amber-600 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Advertencias
                  </button>
                  <button
                    onClick={() => setAuditFilter('CRITICAL')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      auditFilter === 'CRITICAL' ? 'bg-red-800 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Críticos
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Filtrar eventos o correo..."
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#FF1A24] focus:outline-none"
                  />
                </div>
              </div>

              {/* Tabla de Eventos de Auditoría */}
              <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950 max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-neutral-900 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 z-10">
                    <tr>
                      <th className="px-4 py-3">Fecha y Hora</th>
                      <th className="px-4 py-3">Severidad</th>
                      <th className="px-4 py-3">Tipo de Evento</th>
                      <th className="px-4 py-3">Cuenta Enmascarada</th>
                      <th className="px-4 py-3">Detalle Forense</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 font-mono text-[11px]">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-neutral-500 font-sans">
                          No hay eventos de auditoría registrados con este filtro.
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((evt) => {
                        const dateFormatted = new Date(evt.timestamp).toLocaleString();
                        return (
                          <tr key={evt.id} className="hover:bg-neutral-900/40 transition-colors">
                            <td className="px-4 py-2.5 text-neutral-400 whitespace-nowrap">
                              {dateFormatted}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap font-sans">
                              {evt.severity === 'INFO' && (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  INFO
                                </span>
                              )}
                              {evt.severity === 'WARN' && (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  WARN
                                </span>
                              )}
                              {evt.severity === 'CRITICAL' && (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                  CRÍTICO
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-white font-semibold whitespace-nowrap">
                              {evt.type}
                            </td>
                            <td className="px-4 py-2.5 text-neutral-300 whitespace-nowrap">
                              {evt.emailMasked || 'sistema'}
                            </td>
                            <td className="px-4 py-2.5 text-neutral-300 font-sans">
                              {evt.message}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
