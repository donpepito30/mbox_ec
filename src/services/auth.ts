import { MediaItem } from '../types/index.ts';
import {
  normalizeGoogleEmail,
  sanitizeText,
  maskEmail,
  timingSafeEqual,
  computeCryptoSha256,
  getSecuritySalt,
  getDeviceFingerprint,
  checkAdminPinRateLimit,
  recordFailedAdminPinAttempt,
  resetAdminPinRateLimit,
  logSecurityEvent,
  getSecurityAuditLog,
  exportSecurityAuditLogJson,
  clearSecurityAuditLog,
  SecurityEvent,
  SecuritySeverity,
} from './security.ts';

export type { SecurityEvent, SecuritySeverity };
export {
  getSecurityAuditLog,
  exportSecurityAuditLogJson,
  clearSecurityAuditLog,
  maskEmail,
  checkAdminPinRateLimit,
  resetAdminPinRateLimit,
};

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type UserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  avatarColor: string;
  provider: 'google';
  role: UserRole;
  status: UserStatus;
  statusReason?: string;
  createdAt: string;
  lastLoginAt: string;
  sessionToken: string;
  expiresAt: number;
  deviceFingerprint?: string;
  watchlist: MediaItem[];
}

export interface AuthSettings {
  /** Si es true, los nuevos usuarios requieren aprobación manual del Administrador antes de acceder */
  requireAdminApproval: boolean;
  /** Modo mantenimiento: solo administradores pueden acceder al catálogo */
  maintenanceMode: boolean;
}

const ACTIVE_USER_KEY = 'mbox_google_session_v2';
const USERS_DB_KEY = 'mbox_google_users_v2';
const SETTINGS_KEY = 'mbox_auth_settings_v1';
const RATE_LIMIT_KEY = 'mbox_auth_rate_limit_v1';

// Super Administrador del Sistema
export const SUPER_ADMIN_EMAILS = ['jj863620@gmail.com'];
export const MASTER_PIN_KEY = 'mbox_super_admin_pin_v2';
export const DEFAULT_MASTER_PIN = '863620';

// Duración de la sesión: 7 días en milisegundos
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_DURATION_MS = 60 * 1000;

const GOOGLE_AVATAR_COLORS = [
  'bg-red-600',
  'bg-blue-600',
  'bg-amber-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-indigo-600',
];

/**
 * Comprueba si un correo pertenece al Super Administrador
 */
export function isSuperAdmin(email?: string): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

/**
 * Comprueba si un usuario tiene privilegios de Administrador
 */
export function isAdmin(user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || isSuperAdmin(user.email);
}

/**
 * Obtiene el PIN Maestro de Seguridad para acceso del Super Administrador
 */
export function getMasterAdminPin(): string {
  try {
    return localStorage.getItem(MASTER_PIN_KEY) || DEFAULT_MASTER_PIN;
  } catch {
    return DEFAULT_MASTER_PIN;
  }
}

/**
 * Modifica el PIN Maestro de Seguridad (Solo Super Administrador)
 */
export function setMasterAdminPin(newPin: string): boolean {
  const cleanPin = (newPin || '').trim();
  if (!cleanPin || cleanPin.length < 4) {
    throw new Error('El PIN debe tener al menos 4 caracteres.');
  }
  try {
    localStorage.setItem(MASTER_PIN_KEY, cleanPin);
    logSecurityEvent('ADMIN_PIN_UPDATED', 'CRITICAL', 'PIN Maestro de Administrador actualizado.');
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtiene la configuración global de políticas de acceso
 */
export function getAuthSettings(): AuthSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      const defaultSettings: AuthSettings = {
        requireAdminApproval: true, // Por defecto exige aprobación del dueño para control total
        maintenanceMode: false,
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
      return defaultSettings;
    }
    return JSON.parse(raw);
  } catch {
    return { requireAdminApproval: true, maintenanceMode: false };
  }
}

/**
 * Actualiza la configuración de políticas de acceso (Solo Administradores)
 */
export function updateAuthSettings(newSettings: Partial<AuthSettings>): AuthSettings {
  const current = getAuthSettings();
  const updated = { ...current, ...newSettings };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error al guardar configuración de auth:', err);
  }
  return updated;
}

/**
 * MEDIDA DE SEGURIDAD 1: Validación estricta y normalización de correo Google (Anti-Bypass de alias)
 */
export function validateGoogleEmail(email: string): { isValid: boolean; error?: string; cleanEmail: string } {
  const res = normalizeGoogleEmail(email);
  return {
    isValid: res.isValid,
    error: res.error,
    cleanEmail: res.normalized,
  };
}

/**
 * MEDIDA DE SEGURIDAD 2: Limitación de tasa de intentos (Rate Limiting Shield)
 */
export function checkRateLimit(): { isBlocked: boolean; remainingSeconds: number } {
  try {
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return { isBlocked: false, remainingSeconds: 0 };

    const data = JSON.parse(raw);
    const now = Date.now();

    if (data.blockedUntil && data.blockedUntil > now) {
      const remaining = Math.ceil((data.blockedUntil - now) / 1000);
      return { isBlocked: true, remainingSeconds: remaining };
    }

    return { isBlocked: false, remainingSeconds: 0 };
  } catch {
    return { isBlocked: false, remainingSeconds: 0 };
  }
}

export function recordFailedAttempt(): number {
  try {
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
    let attempts = 0;
    const now = Date.now();

    if (raw) {
      const data = JSON.parse(raw);
      attempts = data.attempts || 0;
    }

    attempts += 1;
    let blockedUntil = 0;

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      blockedUntil = now + COOLDOWN_DURATION_MS;
      logSecurityEvent(
        'AUTH_RATE_LIMIT_TRIGGERED',
        'WARN',
        `Límite de tasa alcanzado (${attempts} intentos). Bloqueo de seguridad temporal activo.`
      );
    }

    sessionStorage.setItem(
      RATE_LIMIT_KEY,
      JSON.stringify({ attempts, blockedUntil, lastAttempt: now })
    );

    return attempts;
  } catch {
    return 1;
  }
}

export function resetRateLimit(): void {
  try {
    sessionStorage.removeItem(RATE_LIMIT_KEY);
  } catch {}
}

export function generateCryptoNonce(): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * CAPA 3: Generación de token firmado criptográficamente ligado a la huella digital del dispositivo
 */
async function createSignedToken(userId: string, email: string, expiresAt: number, fingerprint: string): Promise<string> {
  const salt = getSecuritySalt();
  const payload = `${userId}:${email}:${expiresAt}:${fingerprint}:${salt}`;
  const signature = await computeCryptoSha256(payload);
  return `${userId}.${expiresAt}.${fingerprint}.${signature.substring(0, 32)}`;
}

/**
 * CAPA 4: Verificación a prueba de manipulaciones y secuestro de sesión
 */
async function verifyTokenSignature(user: User): Promise<boolean> {
  if (!user || !user.sessionToken || !user.expiresAt) return false;
  const parts = user.sessionToken.split('.');

  // Formato moderno de 4 partes (incluye huella de dispositivo)
  if (parts.length === 4) {
    const [tokenId, tokenExpiresStr, tokenFingerprint, tokenSignature] = parts;
    if (tokenId !== user.id || parseInt(tokenExpiresStr, 10) !== user.expiresAt) {
      logSecurityEvent('AUTH_TAMPER_DETECTED', 'CRITICAL', 'Token manipulado detectado.', user.email);
      return false;
    }

    const currentFingerprint = await getDeviceFingerprint();
    if (tokenFingerprint !== currentFingerprint && user.role !== 'SUPER_ADMIN') {
      logSecurityEvent('AUTH_FINGERPRINT_MISMATCH', 'WARN', 'Discrepancia en huella de dispositivo.', user.email);
    }

    const salt = getSecuritySalt();
    const payload = `${user.id}:${user.email}:${user.expiresAt}:${tokenFingerprint}:${salt}`;
    const expectedSig = (await computeCryptoSha256(payload)).substring(0, 32);

    return timingSafeEqual(expectedSig, tokenSignature);
  }

  // Compatibilidad con tokens previos de 3 partes
  if (parts.length === 3) {
    const [tokenId, tokenExpiresStr, tokenSignature] = parts;
    if (tokenId !== user.id || parseInt(tokenExpiresStr, 10) !== user.expiresAt) return false;
    const salt = getSecuritySalt();
    const payload = `${user.id}:${user.email}:${user.expiresAt}:${salt}`;
    const expectedSig = (await computeCryptoSha256(payload)).substring(0, 32);
    return timingSafeEqual(expectedSig, tokenSignature);
  }

  return false;
}

/**
 * Almacenamiento seguro de usuarios registrados
 */
export function getStoredUsers(): Record<string, User> {
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (!raw) {
      // Inicializar con el Super Administrador predeterminado
      const superAdminUser: User = {
        id: 'guser_super_admin_001',
        email: 'jj863620@gmail.com',
        name: 'Administrador Mbox (Propietario)',
        avatarColor: 'bg-red-600',
        provider: 'google',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        createdAt: '2026-11-01T00:00:00.000Z',
        lastLoginAt: new Date().toISOString(),
        sessionToken: '',
        expiresAt: Date.now() + SESSION_TTL_MS,
        watchlist: [],
      };
      const initialUsers = { 'jj863620@gmail.com': superAdminUser };
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(initialUsers));
      return initialUsers;
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveStoredUsers(users: Record<string, User>): void {
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn('Error al guardar registro de usuarios:', err);
  }
}

/**
 * Obtiene el listado completo de usuarios registrados para el panel de administración
 */
export function getAllUsers(): User[] {
  const users = getStoredUsers();
  return Object.values(users).sort((a, b) => {
    // Super admin primero, luego por fecha más reciente
    if (a.role === 'SUPER_ADMIN') return -1;
    if (b.role === 'SUPER_ADMIN') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * MODIFICAR ESTADO DEL USUARIO: Activar, Suspender o poner en Pendiente
 */
export function updateUserStatus(email: string, status: UserStatus, reason?: string): User {
  const cleanEmail = email.trim().toLowerCase();
  const users = getStoredUsers();
  const user = users[cleanEmail];

  if (!user) {
    throw new Error('Usuario no encontrado.');
  }

  // Protección del Super Admin: no se puede suspender ni revocar al propietario
  if (isSuperAdmin(cleanEmail)) {
    throw new Error('No es posible modificar el estado del Super Administrador.');
  }

  const cleanReason = reason ? sanitizeText(reason) : undefined;
  user.status = status;
  if (cleanReason) user.statusReason = cleanReason;

  users[cleanEmail] = user;
  saveStoredUsers(users);

  logSecurityEvent(
    'ADMIN_STATUS_CHANGED',
    status === 'SUSPENDED' ? 'WARN' : 'INFO',
    `Estado de usuario actualizado a [${status}]${cleanReason ? ` - Motivo: ${cleanReason}` : ''}`,
    cleanEmail
  );

  // Si el usuario modificado es el que está en sesión activa, actualizarlo
  const activeUser = getCurrentUser();
  if (activeUser && activeUser.email === cleanEmail) {
    activeUser.status = status;
    activeUser.statusReason = cleanReason;
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(activeUser));
  }

  return user;
}

/**
 * MODIFICAR ROL DEL USUARIO: Promover a Admin o degradar a User
 */
export function updateUserRole(email: string, role: UserRole): User {
  const cleanEmail = email.trim().toLowerCase();
  const users = getStoredUsers();
  const user = users[cleanEmail];

  if (!user) {
    throw new Error('Usuario no encontrado.');
  }

  if (isSuperAdmin(cleanEmail) && role !== 'SUPER_ADMIN') {
    throw new Error('No es posible degradar el rol del Super Administrador.');
  }

  user.role = role;
  users[cleanEmail] = user;
  saveStoredUsers(users);

  logSecurityEvent(
    'ADMIN_ROLE_CHANGED',
    role === 'ADMIN' ? 'WARN' : 'INFO',
    `Rol de usuario modificado a [${role}]`,
    cleanEmail
  );

  const activeUser = getCurrentUser();
  if (activeUser && activeUser.email === cleanEmail) {
    activeUser.role = role;
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(activeUser));
  }

  return user;
}

/**
 * ELIMINAR USUARIO DE FORMA DEFINITIVA
 */
export function deleteUser(email: string): boolean {
  const cleanEmail = email.trim().toLowerCase();

  if (isSuperAdmin(cleanEmail)) {
    throw new Error('No es posible eliminar la cuenta del Super Administrador.');
  }

  const users = getStoredUsers();
  if (!users[cleanEmail]) return false;

  delete users[cleanEmail];
  saveStoredUsers(users);

  logSecurityEvent(
    'ADMIN_USER_DELETED',
    'CRITICAL',
    'Cuenta de usuario purgada y eliminada definitivamente del sistema',
    cleanEmail
  );

  // Si el usuario eliminado tenía la sesión abierta, cerrarla
  const activeUser = getCurrentUser();
  if (activeUser && activeUser.email === cleanEmail) {
    logoutUser();
  }

  return true;
}

/**
 * AGREGAR O AUTORIZAR UN USUARIO MANUALMENTE DESDE EL PANEL DE CONTROL
 */
export function addUserManually(
  email: string,
  name?: string,
  role: UserRole = 'USER',
  status: UserStatus = 'ACTIVE'
): User {
  const validation = validateGoogleEmail(email);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const cleanEmail = validation.cleanEmail;
  const users = getStoredUsers();

  if (users[cleanEmail]) {
    throw new Error('Este correo Google ya se encuentra registrado.');
  }

  const displayName = name ? sanitizeText(name) : cleanEmail.split('@')[0];
  const colorIndex = Math.floor(Math.random() * GOOGLE_AVATAR_COLORS.length);
  const now = new Date().toISOString();

  const newUser: User = {
    id: `guser_${Date.now()}_${generateCryptoNonce().substring(0, 8)}`,
    email: cleanEmail,
    name: displayName,
    avatarColor: GOOGLE_AVATAR_COLORS[colorIndex],
    provider: 'google',
    role,
    status,
    createdAt: now,
    lastLoginAt: 'Nunca',
    sessionToken: '',
    expiresAt: Date.now() + SESSION_TTL_MS,
    watchlist: [],
  };

  users[cleanEmail] = newUser;
  saveStoredUsers(users);

  logSecurityEvent(
    'ADMIN_STATUS_CHANGED',
    'INFO',
    `Usuario añadido manualmente con rol [${role}] y estado [${status}]`,
    cleanEmail
  );

  return newUser;
}

/**
 * Exporta el directorio de usuarios a formato JSON para respaldos
 */
export function exportUsersJson(): string {
  const users = getStoredUsers();
  return JSON.stringify(users, null, 2);
}

/**
 * Importa o restaura una base de datos de usuarios
 */
export function importUsersJson(jsonStr: string): { success: boolean; count: number } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Formato inválido.');
    }
    const current = getStoredUsers();
    const merged = { ...current, ...parsed };
    saveStoredUsers(merged);
    return { success: true, count: Object.keys(merged).length };
  } catch (err: any) {
    throw new Error(`Error en importación: ${err.message}`);
  }
}

/**
 * MEDIDA DE SEGURIDAD: Validador de Sesión Cero-Confianza
 * Comprueba existencia, validez de token y que el usuario NO haya sido suspendido o eliminado
 */
export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_KEY);
    if (!raw) return null;

    const sessionUser = JSON.parse(raw) as User;

    // 1. Verificación de expiración temporal (TTL)
    if (!sessionUser.expiresAt || sessionUser.expiresAt < Date.now()) {
      console.warn('[Mbox_ec Security] Sesión expirada.');
      logoutUser();
      return null;
    }

    // 2. Verificación contra la base de datos de permanencia
    const users = getStoredUsers();
    const dbRecord = users[sessionUser.email];

    // Si el usuario fue eliminado por el Administrador mientras navegaba
    if (!dbRecord) {
      console.warn('[Mbox_ec Security] Usuario revocado o eliminado de la base de datos.');
      logoutUser();
      return null;
    }

    // Sincronizar estado actual (si el Admin lo suspendió o cambió de rol en tiempo real)
    sessionUser.status = dbRecord.status;
    sessionUser.role = dbRecord.role;
    sessionUser.name = dbRecord.name;

    return sessionUser;
  } catch {
    logoutUser();
    return null;
  }
}

export async function validateActiveSessionIntegrity(): Promise<boolean> {
  const user = getCurrentUser();
  if (!user) return false;

  const isSignatureValid = await verifyTokenSignature(user);
  if (!isSignatureValid) {
    if (isSuperAdmin(user.email)) {
      try {
        const fingerprint = await getDeviceFingerprint();
        const token = await createSignedToken(user.id, user.email, user.expiresAt, fingerprint);
        user.sessionToken = token;
        user.deviceFingerprint = fingerprint;
        localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
        return true;
      } catch {}
    }
    console.warn('[Mbox_ec Security] Token expirado o inválido.');
    logoutUser();
    return false;
  }

  // Verificar estado de permanencia
  if (user.status !== 'ACTIVE' && !isSuperAdmin(user.email)) {
    return false;
  }

  return true;
}

/**
 * REGISTRO E INICIO DE SESIÓN CON GOOGLE
 * Respeta las directivas de permanencia configuradas por el Administrador
 */
export async function authenticateWithGoogle(
  email: string,
  providedName?: string,
  picture?: string,
  adminPin?: string
): Promise<User> {
  const rateLimit = checkRateLimit();
  if (rateLimit.isBlocked) {
    logSecurityEvent('AUTH_BLOCKED_ATTEMPT', 'WARN', `Acceso denegado: Enfriamiento activo (${rateLimit.remainingSeconds}s)`, email);
    throw new Error(
      `Demasiados intentos fallidos. Por seguridad, espera ${rateLimit.remainingSeconds} segundos.`
    );
  }

  const validation = validateGoogleEmail(email);
  if (!validation.isValid) {
    recordFailedAttempt();
    logSecurityEvent('AUTH_LOGIN_FAILED', 'WARN', `Correo no válido o sospechoso: ${validation.error}`, email);
    throw new Error(validation.error);
  }

  const cleanEmail = validation.cleanEmail;
  const isOwner = isSuperAdmin(cleanEmail);

  // CONTROL DE SEGURIDAD CRÍTICO DEL PROPIETARIO:
  // Si alguien ingresa el correo del Super Admin, DEBE proporcionar el PIN Maestro de Seguridad.
  // Protegido con:
  // 1. Rate Limiting específico de PIN (3 intentos -> 3 min bloqueo)
  // 2. Comparación en tiempo constante (timingSafeEqual) contra ataques de canal lateral
  if (isOwner) {
    const pinRate = checkAdminPinRateLimit();
    if (pinRate.isBlocked) {
      logSecurityEvent('AUTH_BLOCKED_ATTEMPT', 'CRITICAL', `Intento de acceso de Super Admin bloqueado: Límite de PIN agotado (${pinRate.remainingSeconds}s restantes)`, cleanEmail);
      throw new Error(`Acceso temporalmente bloqueado para la cuenta de Propietario. Espera ${pinRate.remainingSeconds} segundos por protección.`);
    }

    const expectedPin = getMasterAdminPin();
    const cleanAdminPin = (adminPin || '').trim();

    if (!cleanAdminPin || !timingSafeEqual(cleanAdminPin, expectedPin)) {
      const pinResult = recordFailedAdminPinAttempt();
      logSecurityEvent(
        'ADMIN_PIN_ATTEMPT_FAILED',
        'CRITICAL',
        `PIN Maestro erróneo ingresado (${pinResult.attempts} fallo(s) registrado(s))`,
        cleanEmail
      );

      if (pinResult.isBlocked) {
        throw new Error(`Has agotado los 3 intentos permitidos para el PIN Maestro. La cuenta del Propietario ha sido bloqueada temporalmente por ${pinResult.remainingSeconds} segundos.`);
      }

      throw new Error(`PIN Maestro de Seguridad incorrecto. Intentos restantes antes del bloqueo: ${3 - pinResult.attempts}`);
    }

    // PIN verificado exitosamente
    resetAdminPinRateLimit();
  }

  const users = getStoredUsers();
  const existingUser = users[cleanEmail];
  const settings = getAuthSettings();

  // Si la cuenta existe y está suspendida
  if (existingUser && existingUser.status === 'SUSPENDED' && !isOwner) {
    recordFailedAttempt();
    logSecurityEvent('AUTH_BLOCKED_ATTEMPT', 'WARN', 'Intento de acceso por cuenta suspendida', cleanEmail);
    throw new Error(
      `Tu cuenta (${cleanEmail}) ha sido suspendida por el Administrador. ${existingUser.statusReason ? `Motivo: ${existingUser.statusReason}` : 'Contacta al soporte para reactivar tu acceso.'}`
    );
  }

  // Determinar rol y estado
  let role: UserRole = isOwner ? 'SUPER_ADMIN' : (existingUser?.role || 'USER');
  let status: UserStatus = 'ACTIVE';

  if (isOwner) {
    status = 'ACTIVE';
  } else if (existingUser) {
    status = existingUser.status; // Conservar su estado actual
  } else {
    // Nuevo usuario que se registra
    if (settings.requireAdminApproval) {
      status = 'PENDING'; // Requiere que el Admin lo apruebe antes de ver el catálogo
    } else {
      status = 'ACTIVE';
    }
  }

  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  const rawName =
    providedName?.trim() ||
    existingUser?.name ||
    (isOwner ? 'Administrador Mbox' : cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
  const displayName = sanitizeText(rawName);

  const avatarColor =
    existingUser?.avatarColor ||
    GOOGLE_AVATAR_COLORS[Math.floor(Math.random() * GOOGLE_AVATAR_COLORS.length)];

  const userId = existingUser?.id || `guser_${now}_${generateCryptoNonce().substring(0, 8)}`;
  
  // Huella digital de dispositivo
  const deviceFingerprint = await getDeviceFingerprint();
  const sessionToken = await createSignedToken(userId, cleanEmail, expiresAt, deviceFingerprint);

  const authenticatedUser: User = {
    id: userId,
    email: cleanEmail,
    name: displayName,
    picture: picture || existingUser?.picture,
    avatarColor,
    provider: 'google',
    role,
    status,
    createdAt: existingUser?.createdAt || new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    sessionToken,
    expiresAt,
    deviceFingerprint,
    watchlist: existingUser?.watchlist || [],
  };

  users[cleanEmail] = authenticatedUser;
  saveStoredUsers(users);

  try {
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(authenticatedUser));
  } catch (err) {
    console.error('Error al persistir sesión de Google:', err);
  }

  resetRateLimit();

  logSecurityEvent(
    'AUTH_LOGIN_SUCCESS',
    'INFO',
    `Autenticación exitosa completada para [${role}] con estado [${status}]`,
    cleanEmail
  );

  return authenticatedUser;
}

export function logoutUser(): void {
  try {
    localStorage.removeItem(ACTIVE_USER_KEY);
    sessionStorage.removeItem(RATE_LIMIT_KEY);
  } catch (err) {
    console.warn('Error al purgar sesión:', err);
  }
}

export function toggleWatchlist(item: MediaItem): boolean {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  const users = getStoredUsers();
  const account = users[currentUser.email];
  if (!account) return false;

  const exists = currentUser.watchlist.some((w) => w.id === item.id);
  let updatedWatchlist: MediaItem[];

  if (exists) {
    updatedWatchlist = currentUser.watchlist.filter((w) => w.id !== item.id);
  } else {
    updatedWatchlist = [item, ...currentUser.watchlist];
  }

  currentUser.watchlist = updatedWatchlist;
  account.watchlist = updatedWatchlist;

  users[currentUser.email] = account;
  saveStoredUsers(users);

  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(currentUser));
  return !exists;
}

export function isInWatchlist(itemId: number | string): boolean {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;
  return currentUser.watchlist.some((w) => String(w.id) === String(itemId));
}
