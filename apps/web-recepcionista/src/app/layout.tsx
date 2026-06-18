export const metadata = {
  title: 'RedNorte Salud — Panel Recepcionista',
  description: 'Panel de gestión para recepcionistas RedNorte',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
