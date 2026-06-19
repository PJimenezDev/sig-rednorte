export const metadata = {
  title: 'RedNorte Salud — Panel Médico',
  description: 'Panel de gestión para médicos RedNorte',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
