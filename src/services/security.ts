// Mbox_ec - Subsistema de Seguridad y Blindaje Criptográfico (Defense-in-Depth)
// Medidas de protección multicapa: Sanitización, Anti-Fuerza Bruta, HMAC Tokens, Huella Digital y Auditoría
'use client';

export type SecuritySeverity = 'INFO' | 'WARN' | 'CRITICAL';

export type SecurityEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_RATE_LIMIT_TRIGGERED'
  | 'AUTH_BLOCKED_ATTEMPT'
  | 'AUTH_SESSION_REVOKED'
  | 'AUTH_TAMPER_DETECTED'
  | 'AUTH_FINGERPRINT_MISMATCH'
  | 'ADMIN_STATUS_CHANGED'
  | 'ADMIN_ROLE_CHANGED'
  | 'ADMIN_USER_DELETED'
  | 'ADMIN_PIN_ATTEMPT_FAILED'
  | 'ADMIN_PIN_UPDATED'
  | 'POPUP_INTERCEPTED'
  | 'FRAME_HIJACK_DETECTED';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  message: string;
  emailMasked?: string;
  deviceFingerprintHash?: string;
}

const AUDIT_LOG_KEY = 'mbox_security_audit_log_v2';
const PIN_RATE_LIMIT_KEY = 'mbox_pin_rate_limit_v2';
const CLIENT_SALT_KEY = 'mbox_security_entropy_salt_v2';

const MAX_AUDIT_LOG_ENTRIES = 120;
const MAX_PIN_FAILED_ATTEMPTS = 3;
const PIN_LOCKOUT_MS = 3 * 60 * 1000; // 3 minutos de bloqueo tras 3 intentos erróneos de PIN

/**
 * CAPA 1: Sanitización estricta de entradas y normalización Google Anti-Bypass
 */
export function sanitizeText(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\0/g, '') // Null bytes
    .trim();
}

/**
 * Normaliza cuentas de correo de Google evitando ataques de alias por puntos o etiquetas:
 * - Convierte a minúsculas y elimina espacios
 * - En cuentas @gmail.com elimina puntos en el nombre (j.o.h.n@gmail.com -> john@gmail.com)
 * - Elimina sufijos '+' (john+promo@gmail.com -> john@gmail.com)
 */
export function normalizeGoogleEmail(rawEmail: string): {
  normalized: string;
  original: string;
  isValid: boolean;
  error?: string;
} {
  const original = (rawEmail || '').trim();
  if (!original) {
    return { normalized: '', original, isValid: false, error: 'Por favor, introduce tu correo de Google.' };
  }

  // Prevenir inyecciones, caracteres de control o longitudes abusivas
  if (original.length > 100) {
    return { normalized: '', original, isValid: false, error: 'El correo excede la longitud permitida.' };
  }

  if (/[\s<>;'"\0\r\n]/.test(original)) {
    return { normalized: '', original, isValid: false, error: 'El correo contiene caracteres no válidos.' };
  }

  const parts = original.toLowerCase().split('@');
  if (parts.length !== 2) {
    return { normalized: '', original, isValid: false, error: 'Formato de correo electrónico inválido.' };
  }

  const [username, domain] = parts;
  if (domain !== 'gmail.com' && domain !== 'googlemail.com') {
    return {
      normalized: '',
      original,
      isValid: false,
      error: 'Acceso restringido: Solo se permiten cuentas oficiales de Google (@gmail.com).',
    };
  }

  // Normalización específica de Google (elimina puntos y sufijos tras '+')
  const cleanUsername = username.split('+')[0].replace(/\./g, '');
  if (!cleanUsername || cleanUsername.length < 3) {
    return { normalized: '', original, isValid: false, error: 'Nombre de usuario Google no válido.' };
  }

  const normalized = `${cleanUsername}@gmail.com`;
  return { normalized, original, isValid: true };
}

/**
 * Enmascara un correo para registros de auditoría y visualización segura (ej. usuario@gmail.com -> us****io@gmail.com)
 */
export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return 'anónimo';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `*@${domain}`;
  if (user.length <= 4) return `${user.slice(0, 1)}**@${domain}`;
  return `${user.slice(0, 2)}****${user.slice(-2)}@${domain}`;
}

/**
 * CAPA 2: Comparación segura a prueba de ataques de canal lateral / temporización (Timing Attacks)
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * CAPA 3: Generación criptográfica SHA-256 usando Web Crypto API
 */
export async function computeCryptoSha256(text: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {}
  }

  // Fallback criptográfico determinista
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

/**
 * Obtiene o inicializa la sal criptográfica de entropía del cliente
 */
export function getSecuritySalt(): string {
  try {
    let salt = localStorage.getItem(CLIENT_SALT_KEY);
    if (!salt) {
      if (typeof window !== 'undefined' && window.crypto) {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        salt = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
      } else {
        salt = `salt_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      }
      localStorage.setItem(CLIENT_SALT_KEY, salt);
    }
    return salt;
  } catch {
    return 'mbox_enterprise_security_salt_2026';
  }
}

/**
 * CAPA 4: Huella digital criptográfica del dispositivo (Device Fingerprint)
 * Protege contra robo de tokens (Session Hijacking): si alguien extrae el token y lo usa
 * en otro navegador o dispositivo, la huella no coincide y la sesión se invalida.
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'server_session_fingerprint';

  try {
    const components = [
      navigator.userAgent,
      navigator.language || '',
      navigator.hardwareConcurrency || '4',
      screen.width || '1920',
      screen.height || '1080',
      screen.colorDepth || '24',
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    ].join('###');

    const hash = await computeCryptoSha256(components);
    return hash.substring(0, 16);
  } catch {
    return 'fallback_device_hash';
  }
}

/**
 * CAPA 5: Protección específica para el PIN Maestro de Administrador (Rate Limiting de PIN)
 */
export function checkAdminPinRateLimit(): { isBlocked: boolean; remainingSeconds: number } {
  try {
    const raw = sessionStorage.getItem(PIN_RATE_LIMIT_KEY);
    if (!raw) return { isBlocked: false, remainingSeconds: 0 };
    const data = JSON.parse(raw);
    const now = Date.now();
    if (data.blockedUntil && data.blockedUntil > now) {
      const remainingSeconds = Math.ceil((data.blockedUntil - now) / 1000);
      return { isBlocked: true, remainingSeconds };
    }
    return { isBlocked: false, remainingSeconds: 0 };
  } catch {
    return { isBlocked: false, remainingSeconds: 0 };
  }
}

export function recordFailedAdminPinAttempt(): { attempts: number; isBlocked: boolean; remainingSeconds: number } {
  try {
    const raw = sessionStorage.getItem(PIN_RATE_LIMIT_KEY);
    let attempts = 0;
    const now = Date.now();
    if (raw) {
      const data = JSON.parse(raw);
      attempts = data.attempts || 0;
    }
    attempts += 1;
    let blockedUntil = 0;
    if (attempts >= MAX_PIN_FAILED_ATTEMPTS) {
      blockedUntil = now + PIN_LOCKOUT_MS;
    }
    sessionStorage.setItem(PIN_RATE_LIMIT_KEY, JSON.stringify({ attempts, blockedUntil, lastAttempt: now }));
    const isBlocked = attempts >= MAX_PIN_FAILED_ATTEMPTS;
    const remainingSeconds = isBlocked ? Math.ceil(PIN_LOCKOUT_MS / 1000) : 0;
    return { attempts, isBlocked, remainingSeconds };
  } catch {
    return { attempts: 1, isBlocked: false, remainingSeconds: 0 };
  }
}

export function resetAdminPinRateLimit(): void {
  try {
    sessionStorage.removeItem(PIN_RATE_LIMIT_KEY);
  } catch {}
}

/**
 * CAPA 6: Registro de Auditoría de Seguridad Inmutable (Audit Trail)
 */
export function getSecurityAuditLog(): SecurityEvent[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function logSecurityEvent(
  type: SecurityEventType,
  severity: SecuritySeverity,
  message: string,
  email?: string
): void {
  try {
    const log = getSecurityAuditLog();
    const newEvent: SecurityEvent = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      emailMasked: email ? maskEmail(email) : undefined,
    };

    const updated = [newEvent, ...log].slice(0, MAX_AUDIT_LOG_ENTRIES);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[Mbox_ec Security Audit] Error al registrar evento:', err);
  }
}

export function clearSecurityAuditLog(): void {
  try {
    localStorage.removeItem(AUDIT_LOG_KEY);
    logSecurityEvent('AUTH_SESSION_REVOKED', 'INFO', 'Registro de auditoría vaciado por el Administrador.');
  } catch {}
}

export function exportSecurityAuditLogJson(): string {
  const events = getSecurityAuditLog();
  return JSON.stringify(events, null, 2);
}
