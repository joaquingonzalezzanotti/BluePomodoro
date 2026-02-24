
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'BluePomodoro - Aumenta tu Productividad con la Técnica Pomodoro',
  description: 'Descubre cómo la técnica Pomodoro puede transformar tu gestión del tiempo y aumentar tu concentración. Empieza a usar BluePomodoro hoy mismo.',
  keywords: 'Pomodoro, productividad, gestión del tiempo, concentración, TDAH, estudio',
};

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-gray-900 text-white py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">BluePomodoro</h1>
          <nav>
            <Link href="/app" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Empezar ahora
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-grow">
        <section className="bg-gray-800 text-white py-20 px-6">
          <div className="container mx-auto text-center">
            <h1 className="text-5xl font-bold mb-4">Aumenta tu Productividad con BluePomodoro</h1>
            <p className="text-xl mb-8">La herramienta definitiva para dominar la técnica Pomodoro y mejorar tu concentración.</p>
            <Link href="/app" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
              Empezar ahora
            </Link>
          </div>
        </section>
        <section className="py-20 px-6">
          <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Gestión de Tareas</h2>
              <p>Organiza tus tareas diarias y mantén el enfoque en lo que realmente importa.</p>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Música Ambiental</h2>
              <p>Integra tu música de Spotify para crear el ambiente de trabajo perfecto.</p>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Estadísticas de Progreso</h2>
              <p>Visualiza tu progreso y mantente motivado con nuestras estadísticas detalladas.</p>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-gray-900 text-white py-4 px-6">
        <div className="container mx-auto text-center">
          <p>&copy; {new Date().getFullYear()} BluePomodoro. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
