export const metadata = {
  title: 'RedNorte Salud — Acceso',
  description: 'Portal de acceso RedNorte',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
