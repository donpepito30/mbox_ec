/**
 * Servicio de integracion con Firebase (Auth con Google y Firestore)
 * Implementa autenticacion real con cuentas de Google, persistencia de perfil y Mi Lista.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDoc,
  getDocs,
  getDocFromServer,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '@firebase-config';
import { MediaItem } from '../types/index.ts';
import { isSuperAdmin } from './auth.ts';

// Resolucion hibrida: variables de entorno de Vercel (VITE_FIREBASE_*) con respaldo de firebase-applet-config.json
const resolvedConfig = {
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  firestoreDatabaseId: (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId,
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(resolvedConfig);
export const db = getFirestore(app, resolvedConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Proveedor oficial de autenticacion de Google
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Validacion obligatoria de conexion a Firestore en arranque
 */
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Verifique la conexion y configuracion de Firebase.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Iniciar sesion con cuenta de Google usando popup seguro.
 * Si el navegador o el contenedor iframe bloquea la ventana emergente (auth/popup-blocked),
 * intenta signInWithRedirect si esta en ventana principal, o propaga el codigo limpiamente
 * para activar el flujo de acceso directo sin romper la aplicacion con errores no capturados.
 */
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/popup-blocked') {
      console.warn('[Firebase Auth] La ventana emergente fue bloqueada por el navegador o iframe.');
      // Si estamos en ventana normal fuera de iframe, intentar redireccion nativa
      if (typeof window !== 'undefined' && window.self === window.top) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return new Promise(() => {}); // Espera navegacion de redirect
        } catch (redirectErr) {
          console.warn('[Firebase Auth] Fallback de redirección no disponible:', redirectErr);
        }
      }
    } else if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      console.warn('[Firebase Auth] Inicio de sesión cancelado por el usuario.');
    } else {
      console.error('Error al iniciar sesion con Google:', error);
    }
    throw error;
  }
}

/**
 * Comprobar resultado de redireccionamiento (en caso de navegacion por redirect)
 */
export async function checkRedirectAuthResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await syncUserProfile(result.user);
      return result.user;
    }
  } catch (error: any) {
    if (error?.code !== 'auth/popup-blocked') {
      console.warn('[Firebase Auth] Verificación de redirección:', error);
    }
  }
  return null;
}

/**
 * Cerrar sesion de la cuenta activa
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error al cerrar sesion:', error);
    throw error;
  }
}

/**
 * Sincronizar documento del perfil en /users/{userId} con soporte para roles y estado
 */
export async function syncUserProfile(
  user: User,
  customRole?: 'SUPER_ADMIN' | 'ADMIN' | 'USER',
  customStatus?: 'ACTIVE' | 'PENDING' | 'SUSPENDED',
  customReason?: string
): Promise<void> {
  const path = `users/${user.uid}`;
  const now = new Date().toISOString();
  const isSuperAdminUser = isSuperAdmin(user.email || '');

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const existingSnap = await getDoc(userDocRef);

    let role = customRole;
    let status = customStatus;
    let statusReason = customReason || '';

    if (!role) {
      if (isSuperAdminUser) {
        role = 'SUPER_ADMIN';
      } else if (existingSnap.exists() && existingSnap.data()?.role) {
        role = existingSnap.data()?.role;
      } else {
        role = 'USER';
      }
    }

    if (!status) {
      if (isSuperAdminUser) {
        status = 'ACTIVE';
      } else if (existingSnap.exists() && existingSnap.data()?.status) {
        status = existingSnap.data()?.status;
        statusReason = existingSnap.data()?.statusReason || '';
      } else {
        status = 'ACTIVE';
      }
    }

    const payload: Record<string, any> = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Usuario Google',
      photoURL: user.photoURL || '',
      role,
      status,
      updatedAt: now,
    };

    if (!existingSnap.exists()) {
      payload.createdAt = now;
    }

    if (statusReason) {
      payload.statusReason = statusReason;
    }

    await setDoc(userDocRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Suscribirse en tiempo real a la coleccion de usuarios para el Panel de Administracion
 */
export function subscribeToAllUsersFromFirestore(
  onUpdate: (users: Array<Record<string, any>>) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'users';
  return onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      const users = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      onUpdate(users);
    },
    (error) => {
      if (onError) onError(error);
      console.warn('[Firestore Admin] Consulta en tiempo real de usuarios:', error.message);
    }
  );
}

/**
 * Actualizar estado de autorizacion de un usuario directamente en Firestore
 */
export async function updateUserStatusInFirestore(
  userId: string,
  newStatus: 'ACTIVE' | 'PENDING' | 'SUSPENDED',
  reason?: string
): Promise<void> {
  const path = `users/${userId}`;
  const now = new Date().toISOString();
  try {
    const data: Record<string, any> = {
      status: newStatus,
      updatedAt: now,
    };
    if (reason !== undefined) {
      data.statusReason = reason;
    }
    await setDoc(doc(db, 'users', userId), data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Actualizar rol de un usuario en Firestore (SUPER_ADMIN, ADMIN, USER)
 */
export async function updateUserRoleInFirestore(
  userId: string,
  newRole: 'SUPER_ADMIN' | 'ADMIN' | 'USER'
): Promise<void> {
  const path = `users/${userId}`;
  const now = new Date().toISOString();
  try {
    await setDoc(
      doc(db, 'users', userId),
      {
        role: newRole,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Eliminar perfil de usuario de Firestore
 */
export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Suscribirse a las politicas globales del sistema en Firestore /settings/auth
 */
export function subscribeToAuthSettingsFromFirestore(
  onUpdate: (settings: { requireAdminApproval: boolean; maintenanceMode: boolean }) => void
): () => void {
  return onSnapshot(
    doc(db, 'settings', 'auth'),
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onUpdate({
          requireAdminApproval: Boolean(data.requireAdminApproval),
          maintenanceMode: Boolean(data.maintenanceMode),
        });
      }
    },
    (err) => {
      console.warn('[Firestore Settings] Suscripción a políticas:', err.message);
    }
  );
}

/**
 * Actualizar politicas de autenticacion en Firestore
 */
export async function updateAuthSettingsInFirestore(
  settings: { requireAdminApproval?: boolean; maintenanceMode?: boolean },
  updatedBy: string = 'Super Administrador'
): Promise<void> {
  const path = 'settings/auth';
  const now = new Date().toISOString();
  try {
    await setDoc(
      doc(db, 'settings', 'auth'),
      {
        ...settings,
        updatedAt: now,
        updatedBy,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Registrar evento de auditoria de seguridad en Firestore /security_logs
 */
export async function syncSecurityLogToFirestore(event: {
  id: string;
  timestamp: string;
  type: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  message: string;
  emailMasked?: string;
}): Promise<void> {
  const path = `security_logs/${event.id}`;
  try {
    await setDoc(doc(db, 'security_logs', event.id), event);
  } catch (error) {
    console.warn('[Firestore Audit Log] Error al sincronizar log:', error);
  }
}

/**
 * Suscribirse en tiempo real a los registros de auditoria de seguridad
 */
export function subscribeToSecurityLogsFromFirestore(
  onUpdate: (logs: Array<Record<string, any>>) => void
): () => void {
  try {
    const q = query(collection(db, 'security_logs'), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const logs = snapshot.docs.map((docSnap) => docSnap.data());
        onUpdate(logs);
      },
      (err) => {
        console.warn('[Firestore Audit Logs] Suscripción:', err.message);
      }
    );
  } catch (err) {
    console.warn('[Firestore Audit Logs] Query init error:', err);
    return () => {};
  }
}

/**
 * Anadir titulo a la coleccion de favoritos del usuario en Firestore
 */
export async function addFavoriteToFirestore(
  userId: string,
  item: MediaItem
): Promise<void> {
  const favoriteId = String(item.id);
  const path = `users/${userId}/favorites/${favoriteId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'favorites', favoriteId), {
      userId,
      mediaId: String(item.id),
      mediaType: item.media_type === 'tv' ? 'tv' : 'movie',
      title: item.title || item.name || 'Sin Titulo',
      posterPath: item.poster_path || '',
      backdropPath: item.backdrop_path || '',
      voteAverage: Number(item.vote_average || 0),
      releaseDate: item.release_date || item.first_air_date || '',
      addedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Eliminar titulo de la coleccion de favoritos del usuario
 */
export async function removeFavoriteFromFirestore(
  userId: string,
  mediaId: number | string
): Promise<void> {
  const favoriteId = String(mediaId);
  const path = `users/${userId}/favorites/${favoriteId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'favorites', favoriteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Suscribirse a los cambios en tiempo real de Mi Lista para el usuario autenticado
 */
export function subscribeToFavorites(
  userId: string,
  onUpdate: (items: MediaItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = `users/${userId}/favorites`;
  return onSnapshot(
    collection(db, 'users', userId, 'favorites'),
    (snapshot) => {
      const items: MediaItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: Number(data.mediaId) || Number(docSnap.id) || 0,
          title: data.title,
          name: data.title,
          media_type: data.mediaType as 'movie' | 'tv',
          poster_path: data.posterPath || null,
          backdrop_path: data.backdropPath || null,
          vote_average: data.voteAverage || 0,
          release_date: data.releaseDate || undefined,
          first_air_date: data.releaseDate || undefined,
          overview: '',
        } as MediaItem;
      });
      onUpdate(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export { onAuthStateChanged };
