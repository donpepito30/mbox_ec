// Mbox_ec - Servicio de Integración con Navegador Brave
// Permite abrir transmisiones, descargas y la plataforma directamente en Brave Browser
// para aprovechar su bloqueo nativo de publicidad (Brave Shields) sin anuncios ni ventanas emergentes
'use client';

/**
 * Detecta si el usuario está navegando actualmente dentro del Navegador Brave
 */
export async function isBraveBrowser(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  try {
    const nav = navigator as any;
    if (nav.brave && typeof nav.brave.isBrave === 'function') {
      return await nav.brave.isBrave();
    }
  } catch {}
  return false;
}

/**
 * Detecta el sistema operativo del usuario
 */
export function getClientPlatform(): 'android' | 'ios' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'desktop';
}

/**
 * Genera el enlace o intent nativo para abrir una URL en Brave Browser según el dispositivo
 */
export function getBraveTargetUrl(targetUrl: string): {
  url: string;
  scheme: 'intent' | 'brave-scheme' | 'web';
  platform: 'android' | 'ios' | 'desktop';
} {
  const platform = getClientPlatform();
  const cleanTarget = targetUrl.trim();

  if (platform === 'android') {
    // Android Intent: abre directamente el paquete com.brave.browser con fallback a Google Play
    const withoutProtocol = cleanTarget.replace(/^https?:\/\//, '');
    const intentUrl = `intent://${withoutProtocol}#Intent;scheme=https;package=com.brave.browser;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.brave.browser;end;`;
    return {
      url: intentUrl,
      scheme: 'intent',
      platform,
    };
  }

  if (platform === 'ios') {
    // iOS Custom URI scheme oficial de Brave
    const braveSchemeUrl = `brave://open-url?url=${encodeURIComponent(cleanTarget)}`;
    return {
      url: braveSchemeUrl,
      scheme: 'brave-scheme',
      platform,
    };
  }

  // Escritorio (Windows / Mac / Linux)
  return {
    url: cleanTarget,
    scheme: 'web',
    platform,
  };
}

/**
 * Ejecuta la apertura en Brave Browser con manejo de fallback y copia al portapapeles
 */
export function launchInBrave(targetUrl: string): {
  actionTaken: 'intent_launched' | 'ios_scheme_launched' | 'copied_and_opened';
  message: string;
} {
  const { url, scheme, platform } = getBraveTargetUrl(targetUrl);

  if (scheme === 'intent') {
    // Dispositivo Android
    window.location.href = url;
    return {
      actionTaken: 'intent_launched',
      message: 'Abriendo en la app de Brave Browser...',
    };
  }

  if (scheme === 'brave-scheme') {
    // Dispositivo iOS
    const now = Date.now();
    window.location.href = url;

    // Si después de 1.8 segundos no cambió de app, sugerir descarga de Brave
    setTimeout(() => {
      if (document.hasFocus() && Date.now() - now < 3000) {
        if (window.confirm('¿No tienes Brave instalado? Pulsa Aceptar para instalarlo gratis desde la App Store y disfrutar sin anuncios.')) {
          window.location.href = 'https://apps.apple.com/app/brave-private-web-browser/id1052879175';
        }
      }
    }, 1800);

    return {
      actionTaken: 'ios_scheme_launched',
      message: 'Lanzando enlace en Brave iOS...',
    };
  }

  // En PC / Mac / Escritorio: Copiar al portapapeles y abrir en nueva pestaña
  if (navigator.clipboard) {
    navigator.clipboard.writeText(targetUrl).catch(() => {});
  }

  // Intentar abrir URL
  window.open(targetUrl, '_blank', 'noopener,noreferrer');

  return {
    actionTaken: 'copied_and_opened',
    message: 'Enlace copiado. Pégalo en Brave para disfrutar 100% sin publicidad.',
  };
}

/**
 * Enlaces oficiales de descarga de Brave Browser
 */
export const BRAVE_DOWNLOAD_URLS = {
  android: 'https://play.google.com/store/apps/details?id=com.brave.browser',
  ios: 'https://apps.apple.com/app/brave-private-web-browser/id1052879175',
  desktop: 'https://brave.com/es/download/',
};
