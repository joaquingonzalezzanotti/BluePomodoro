
import { initializeFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * @fileOverview Utilidades para "sembrar" (seed) usuarios y datos de prueba.
 */

const TEST_USERS = [
  { email: 'admin@bluepomodoro.com', password: 'password123', nombre: 'Admin Pomodoro' },
  { email: 'user1@bluepomodoro.com', password: 'password123', nombre: 'Juan Enfoque' },
  { email: 'estudiante@bluepomodoro.com', password: 'password123', nombre: 'Maria Estudio' },
];

export async function seedInitialUsers() {
  console.log('Iniciando seeding de usuarios...');
  const { auth, firestore: db } = initializeFirebase();
  
  for (const u of TEST_USERS) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, u.email, u.password);
      const user = userCredential.user;
      
      // Crear perfil en Firestore
      await setDoc(doc(db, 'usuarios', user.uid), {
        id: user.uid,
        nombre: u.nombre,
        email: u.email,
        puntosTotales: 500,
        fechaRegistro: serverTimestamp(),
      });

      // Crear tareas de ejemplo
      const tasksRef = collection(db, 'usuarios', user.uid, 'tareas');
      const sampleTasks = [
        { titulo: 'Finalizar proyecto de IA', prioridad: 'Alta', estado: 'Pendiente', esfuerzoEstimadoPomodoros: 4, fechaCreacion: serverTimestamp(), fechaVencimiento: '2025-12-31', subtareas: [] },
        { titulo: 'Leer capítulo 5 de Geografía', prioridad: 'Media', estado: 'En Proceso', esfuerzoEstimadoPomodoros: 2, fechaCreacion: serverTimestamp(), fechaVencimiento: '2025-12-31', subtareas: [] },
      ];

      for (const t of sampleTasks) {
        await setDoc(doc(tasksRef), t);
      }

      console.log(`Usuario creado: ${u.email}`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`El usuario ${u.email} ya existe.`);
      } else {
        console.error(`Error creando ${u.email}:`, error.message);
      }
    }
  }
  
  await signOut(auth);
  return 'Seeding completado. Ya puedes iniciar sesión con admin@bluepomodoro.com / password123';
}
