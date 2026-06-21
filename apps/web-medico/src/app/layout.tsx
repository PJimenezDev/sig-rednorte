// Layout principal para el panel médico de RedNorte Salud. Define la estructura HTML básica para todas las páginas dentro del panel médico, incluyendo el título y la descripción de la página. Este layout se utiliza para envolver todas las páginas del panel médico, proporcionando una base común para el diseño y la funcionalidad de la aplicación.
export const metadata = {
  title: 'RedNorte Salud — Panel Médico',
  description: 'Panel de gestión para médicos RedNorte',
}

// Rutas API para el panel médico, incluyendo la obtención de citas asignadas, lista de espera, especialidad del médico y asignación de citas. Estas rutas requieren autenticación mediante token en el encabezado Authorization y utilizan CORS para permitir solicitudes desde el frontend.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
