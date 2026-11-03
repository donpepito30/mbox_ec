// Mbox_ec - Servicio de Autenticación de Usuarios y Lista de Favoritos
// Almacenamiento persistente local compatible con Cloudflare Pages, Android TV (USB) y Web
import { MediaItem } from '../types/index.ts';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
  watchlist: MediaItem[];
  createdAt: string;
}

const USERS_STORAGE_KEY = 'mbox_users_db_v1';
const ACTIVE_USER_KEY = 'mbox_active_session_v1';

// Colores de avatar estilo Netflix
const AVATAR_COLORS = [
  'bg-red-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-purple-600',
  'bg-rose-600',
];

function getUsers(): Record<string, { user: User; passwordHash: string }> {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, { user: User; passwordHash: string }>): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn('Error al guardar base de usuarios:', err);
  }
}

/**
 * Obtiene el usuario autenticado actual
 */
export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Registra una nueva cuenta de usuario por correo
 */
export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Ingresa un correo electrónico válido.');
  }

  if (!password || password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }

  const users = getUsers();
  if (users[cleanEmail]) {
    throw new Error('Este correo ya está registrado. Inicia sesión.');
  }

  const displayName = name?.trim() || cleanEmail.split('@')[0];
  const colorIndex = Math.floor(Math.random() * AVATAR_COLORS.length);

  const newUser: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: cleanEmail,
    name: displayName,
    avatarColor: AVATAR_COLORS[colorIndex],
    watchlist: [],
    createdAt: new Date().toISOString(),
  };

  // Guardar usuario
  users[cleanEmail] = {
    user: newUser,
    passwordHash: btoa(password), // Codificación simple para almacenamiento local
  };
  saveUsers(users);

  // Iniciar sesión automáticamente
  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(newUser));
  return newUser;
}

/**
 * Inicia sesión con correo y contraseña
 */
export async function loginUser(email: string, password: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Ingresa tu correo electrónico.');
  }

  const users = getUsers();
  const account = users[cleanEmail];

  // Si no existe la cuenta, pero es la primera vez, creamos una cuenta demo inmediata
  if (!account) {
    if (cleanEmail === 'admin@mbox.ec' && password === '123456') {
      return registerUser(cleanEmail, password, 'Administrador Mbox');
    }
    throw new Error('No existe una cuenta registrada con este correo.');
  }

  if (account.passwordHash !== btoa(password)) {
    throw new Error('Contraseña incorrecta. Inténtalo de nuevo.');
  }

  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(account.user));
  return account.user;
}

/**
 * Cierra la sesión activa
 */
export function logoutUser(): void {
  try {
    localStorage.removeItem(ACTIVE_USER_KEY);
  } catch (err) {
    console.warn('Error al cerrar sesión:', err);
  }
}

/**
 * Añade o quita un elemento de "Mi Lista" del usuario actual
 */
export function toggleWatchlist(item: MediaItem): boolean {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  const users = getUsers();
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
  account.user.watchlist = updatedWatchlist;

  saveUsers(users);
  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(currentUser));
  return !exists;
}

/**
 * Verifica si un contenido está en la lista de favoritos del usuario
 */
export function isInWatchlist(itemId: number | string): boolean {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;
  return currentUser.watchlist.some((w) => String(w.id) === String(itemId));
}
