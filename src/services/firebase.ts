/**
 * Servicio de integracion con Firebase (Auth con Google y Firestore)
 * Implementa autenticacion real con cuentas de Google, persistencia de perfil y Mi Lista.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '@firebase-config';
import { MediaItem } from '../types/index.ts';

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
 * Iniciar sesion con cuenta de Google usando popup seguro
 */
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    console.error('Error al iniciar sesion con Google:', error);
    throw error;
  }
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
 * Sincronizar documento del perfil en /users/{userId}
 */
export async function syncUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const now = new Date().toISOString();
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Usuario Google',
        photoURL: user.photoURL || '',
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
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
