// Este es un archivo de diseño para el panel de recepción de la aplicación RedNorte Salud. Configura la estructura HTML y los metadatos de la aplicación.
export const metadata = {
  title: 'RedNorte Salud — Panel Recepcionista',
  description: 'Panel de gestión para recepcionistas RedNorte',
}

// Componente de diseño raíz que envuelve toda la aplicación y define la estructura HTML básica
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
