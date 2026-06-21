import { notFound } from 'next/navigation';

// Esta página es solo para simular la autenticación de ClaveÚnica. No tiene una implementación real de autenticación, simplemente devuelve un error 404 para indicar que no se encuentra la página.

export default function Page() {
  notFound();
}
