'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Inicializa Firebase de forma segura.
 * Durante el build de Next.js, las variables de entorno pueden no estar disponibles.
 * Esta función maneja ese caso para evitar errores de "invalid-api-key" en el servidor.
 */
export function initializeFirebase() {
  if (getApps().length > 0) {
    return getSdks(getApp());
  }

  // Si no hay API Key (común en fase de build de Vercel), inicializamos con precaución
  // o devolvemos un estado que el Provider pueda manejar.
  const app = initializeApp(firebaseConfig);
  return getSdks(app);
}

export function getSdks(firebaseApp: FirebaseApp) {
  // Manejo de errores silencioso para evitar crashes en el servidor durante el build
  let auth: Auth;
  let firestore: Firestore;

  try {
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
  } catch (error) {
    console.warn("Firebase SDKs could not be fully initialized (expected during build).");
    // @ts-ignore - Estos se manejarán como nulos en el provider si fallan
    return { firebaseApp, auth: null, firestore: null };
  }

  return {
    firebaseApp,
    auth,
    firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
