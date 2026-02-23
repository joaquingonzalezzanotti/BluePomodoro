
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

/**
 * Inicializa Firebase de forma robusta.
 * Evita el error 'app/no-options' prefiriendo la configuración manual
 * sobre la automática cuando no estamos en un entorno de App Hosting.
 */
export function initializeFirebase() {
  // Si ya hay apps inicializadas, devolvemos los SDKs de la primera.
  if (getApps().length > 0) {
    return getSdks(getApp());
  }

  // Forzamos la inicialización con el objeto de configuración para evitar warnings
  // en entornos de desarrollo o despliegues en Vercel.
  const firebaseApp = initializeApp(firebaseConfig);
  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
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
