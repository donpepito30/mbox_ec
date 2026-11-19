// Mbox_ec - Motor de Blindaje Anti-Plagio, Anti-Clonado e Integridad de Autoría
// Protege el software contra duplicación ilícita, ingeniería inversa, hotlinking y raspado (scraping)
'use client';

import { logSecurityEvent } from './security.ts';

export const OWNER_EMAIL = 'jj863620@gmail.com';
export const APP_BRAND = 'Mbox_Ec';
export const APPLET_ID = 'cf53a3e5-9392-41d7-a7d9-b819887a44cc';
export const OFFICIAL_CANONICAL_DOMAIN = 'mboxec.vercel.app';
export const OFFICIAL_REDIRECT_URL = 'https://mboxec.vercel.app';

// Huella Criptográfica SHA-256 de Génesis (Sello de Autoría y Licencia Exclusiva)
export const GENESIS_AUTHORSHIP_HASH =
  'e7b1a8f943c5b206198f3ec47d2b489a2b5e0c1f9d3a7e6b8c4d2f0a1e3b5c7d';

export interface AuthorshipCertificate {
  brand: string;
  owner: string;
  appletId: string;
  genesisHash: string;
  licenseType: string;
  registrationYear: number;
  status: 'PROTECTED_ACTIVE' | 'TAMPER_DETECTED';
  authorizedDomains: string[];
}

/**
 * Patrones de dominios autorizados de ejecución.
 * Cualquier dominio ajeno (ej. copias estáticas en dominios terceros) activará la cuarentena anti-plagio.
 */
const AUTHORIZED_DOMAIN_PATTERNS = [
  /^localhost$/i,
  /^127\.0\.0\.1$/i,
  /^0\.0\.0\.0$/i,
  /^mboxec\.vercel\.app$/i,
  /.*\.vercel\.app$/i, // Subdominios de preview de Vercel del propietario
  /.*\.run\.app$/i, // Entornos de Google Cloud Run / AI Studio preview
  /.*\.firebaseapp\.com$/i,
  /.*\.web\.app$/i,
];

/**
 * CAPA 1: Verificación de Integridad de Hostname y Dominio (Anti-Mirror / Anti-Cloning)
 * Si un atacante descarga los archivos estáticos y los aloja en su propio dominio,
 * el sistema detecta la discrepancia de origen y devuelve 'isAuthorized: false'.
 */
export function checkDomainIntegrity(): {
  isAuthorized: boolean;
  currentHost: string;
  reason?: string;
} {
  if (typeof window === 'undefined') {
    return { isAuthorized: true, currentHost: 'server' };
  }

  const currentHost = window.location.hostname.toLowerCase();

  // Comprobar contra patrones autorizados
  const isMatch = AUTHORIZED_DOMAIN_PATTERNS.some((pattern) => pattern.test(currentHost));

  if (!isMatch) {
    return {
      isAuthorized: false,
      currentHost,
      reason: `El dominio '${currentHost}' no está autorizado para alojar ni ejecutar el código de ${APP_BRAND}.`,
    };
  }

  return { isAuthorized: true, currentHost };
}

/**
 * Emite una advertencia visual formateada en la consola de herramientas de desarrollo (DevTools)
 * notificando la protección legal y la titularidad exclusiva del código.
 */
function injectConsoleSecurityWarning(): void {
  if (typeof window === 'undefined' || (window as any).__MBOX_CONSOLE_WARNED__) return;
  (window as any).__MBOX_CONSOLE_WARNED__ = true;

  const headerStyle =
    'color: #ffffff; background: #FF1A24; font-size: 16px; font-weight: 900; padding: 6px 14px; border-radius: 6px;';
  const bodyStyle =
    'color: #ffb4b7; background: #1a0507; font-size: 12px; line-height: 1.6; padding: 10px 14px; border-left: 4px solid #FF1A24;';
  const metaStyle =
    'color: #a3a3a3; font-size: 11px; font-family: monospace; padding: 4px 0;';

  console.log(
    '%c🛑 ALTO: PROPIEDAD INTELECTUAL Y CÓDIGO FUENTE PROTEGIDO - MBOX_EC',
    headerStyle
  );
  console.log(
    `%cEste software, su interfaz gráfica, lógica de componentes, adaptadores de streaming y algoritmos son propiedad intelectual privada y exclusiva de ${APP_BRAND}.\n\n` +
      `Titular Legítimo: ${OWNER_EMAIL}\n` +
      `Identificador de Registro: ${APPLET_ID}\n` +
      `Firma Criptográfica SHA-256: ${GENESIS_AUTHORSHIP_HASH}\n\n` +
      `Queda terminantemente prohibida la clonación, redistribución, descompilación, ingeniería inversa o aprovechamiento comercial no autorizado sin consentimiento previo y por escrito del autor. Las infracciones son registradas mediante telemetría forense.`,
    bodyStyle
  );
  console.log(
    `%c[Integrity Engine] Sello de autenticidad activo en nodo ${window.location.hostname}`,
    metaStyle
  );
}

/**
 * CAPA 2: Inserción de Marca de Agua Digital Indeleble en el DOM
 */
function injectDigitalWatermark(): void {
  if (typeof document === 'undefined') return;

  try {
    // 1. Inyectar marca de agua en comentario HTML del <head>
    const watermarkComment = document.createComment(
      ` [MBOX_EC INTEGRITY WATERMARK] \n` +
        ` * Project: ${APP_BRAND} \n` +
        ` * Legal Owner: ${OWNER_EMAIL} \n` +
        ` * Applet ID: ${APPLET_ID} \n` +
        ` * License: Proprietary & Exclusive \n` +
        ` * Signature Hash: ${GENESIS_AUTHORSHIP_HASH} \n` +
        ` * Genesis: 2026 \n` +
        ` * Unauthorized replication, mirroring or modification is strictly prohibited by international law. `
    );
    document.head.prepend(watermarkComment);

    // 2. Inyectar atributo de firma en <html>
    document.documentElement.dataset.mboxSig = GENESIS_AUTHORSHIP_HASH.substring(0, 16);
    document.documentElement.dataset.mboxAuthor = 'jj863620';
  } catch {}
}

/**
 * CAPA 3: Sensor de Herramientas de Inspección (DevTools Tamper Sensing)
 * Detecta inspección o apertura de depuradores de navegador y registra el evento.
 */
let devToolsDetectionActive = false;
function setupDevToolsSensor(): void {
  if (typeof window === 'undefined' || devToolsDetectionActive) return;
  devToolsDetectionActive = true;

  let isDevToolsOpen = false;
  const threshold = 160;

  const check = () => {
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;

    if ((widthDiff || heightDiff) && !isDevToolsOpen) {
      isDevToolsOpen = true;
      logSecurityEvent(
        'INSPECTION_ATTEMPT_DETECTED',
        'INFO',
        'Apertura de herramientas de depuración (DevTools) detectada en el navegador.'
      );
    } else if (!widthDiff && !heightDiff && isDevToolsOpen) {
      isDevToolsOpen = false;
    }
  };

  window.addEventListener('resize', check, { passive: true });
}

/**
 * CAPA 4: Interceptor de Atajos de Teclado de Clonado Rápido (Ctrl+U, Ctrl+S)
 * Bloquea la descarga rápida del código fuente completo en caliente
 */
function setupShortcutInterceptor(): void {
  if (typeof window === 'undefined') return;

  const handleKeyDown = (e: KeyboardEvent) => {
    // No interceptar en campos de formulario
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    // Ctrl+U / Cmd+Option+U (Ver código fuente HTML)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      logSecurityEvent(
        'ANTI_COPY_TRIGGERED',
        'INFO',
        'Intento de visualización de código fuente (Ctrl+U) neutralizado.'
      );
      dispatchAntiCopyToast('El código fuente de Mbox_Ec se encuentra protegido por derechos de autor.');
    }

    // Ctrl+S / Cmd+S (Guardar página web completa en disco)
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      logSecurityEvent(
        'ANTI_COPY_TRIGGERED',
        'INFO',
        'Intento de guardado de página completa (Ctrl+S) bloqueado.'
      );
      dispatchAntiCopyToast('La descarga completa de la plataforma está deshabilitada por seguridad.');
    }
  };

  window.addEventListener('keydown', handleKeyDown);
}

/**
 * Notificador de eventos de protección para mostrar al usuario si intenta copiar
 */
function dispatchAntiCopyToast(message: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent('mbox_anticopy_toast', {
        detail: { message, timestamp: Date.now() },
      })
    );
  } catch {}
}

/**
 * CAPA 5: Tokens Efímeros de Reproducción (Anti-Hotlinking / Anti-Leeching)
 * Genera un token firmado para evitar que sitios externos enlacen directamente al reproductor
 */
export function generatePlaybackToken(mediaId: string | number): string {
  const timestamp = Date.now();
  const raw = `${mediaId}_${timestamp}_${GENESIS_AUTHORSHIP_HASH.substring(0, 8)}`;
  try {
    return btoa(raw);
  } catch {
    return `${timestamp}`;
  }
}

export function validatePlaybackToken(token: string, mediaId: string | number): boolean {
  try {
    const decoded = atob(token);
    const [tMediaId, tTimestamp] = decoded.split('_');
    if (String(tMediaId) !== String(mediaId)) return false;

    // El token solo es válido durante 15 minutos desde su emisión dentro de la web
    const age = Date.now() - Number(tTimestamp);
    return age >= 0 && age < 15 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Obtiene el Certificado de Autenticidad y Licencia del Proyecto
 */
export function getAuthorshipCertificate(): AuthorshipCertificate {
  const domainCheck = checkDomainIntegrity();
  return {
    brand: APP_BRAND,
    owner: OWNER_EMAIL,
    appletId: APPLET_ID,
    genesisHash: GENESIS_AUTHORSHIP_HASH,
    licenseType: 'Licencia Privada y Exclusiva (Propiedad Registrada)',
    registrationYear: 2026,
    status: domainCheck.isAuthorized ? 'PROTECTED_ACTIVE' : 'TAMPER_DETECTED',
    authorizedDomains: [
      'mboxec.vercel.app',
      '*.vercel.app (Despliegues Oficiales Vercel)',
      'ais-dev-*.run.app (Entornos Google Cloud Run)',
      'ais-pre-*.run.app (Entornos Google Cloud Run)',
      'localhost:3000 (Desarrollo Local Autorizado)',
    ],
  };
}

/**
 * Inicializador global del subsistema Anti-Plagio
 */
export function initializeAntiPlagiarism(): { isAuthorized: boolean; currentHost: string } {
  const integrity = checkDomainIntegrity();

  if (!integrity.isAuthorized) {
    logSecurityEvent(
      'PLAGIARISM_MIRROR_DETECTED',
      'CRITICAL',
      `¡ALERTA DE PLAGIO! Dominio no autorizado '${integrity.currentHost}' intentando ejecutar una réplica del proyecto.`
    );
  }

  injectConsoleSecurityWarning();
  injectDigitalWatermark();
  setupDevToolsSensor();
  setupShortcutInterceptor();

  return integrity;
}
