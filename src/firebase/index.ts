
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Inicializa Firebase de forma segura.
 * Durante el build de Next.js, las variables de entorno pueden no estar disponibles.
 * Esta función maneja ese caso devolviendo nulos para evitar errores de pre-renderizado.
 */
export function initializeFirebase() {
  // Verificamos si tenemos los requisitos mínimos para inicializar de forma genuina
  // Si no hay API KEY, devolvemos nulos inmediatamente para no romper el build
  const isEnvValid = 
    typeof process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'string' && 
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY.length > 0;

  if (typeof window === 'undefined' || !isEnvValid) {
    return { firebaseApp: null, auth: null, firestore: null };
  }

  let app: FirebaseApp;
  try {
    if (getApps().length > 0) {
      app = getApp();
    } else {
      app = initializeApp(firebaseConfig);
    }
    return getSdks(app);
  } catch (error) {
    return { firebaseApp: null, auth: null, firestore: null };
  }
}

export function getSdks(firebaseApp: FirebaseApp) {
  let auth: Auth | null = null;
  let firestore: Firestore | null = null;

  try {
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
  } catch (error) {
    console.warn("Firebase SDKs could not be fully initialized.");
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
