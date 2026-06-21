export const metadata = {
  title: 'RedNorte Salud',
  description: 'Sistema Integrado de Gestión RedNorte',
}
//implementada por Benjamin Morales

/// RootLayout es un componente de diseño que envuelve toda la aplicación web. Define la estructura HTML básica, incluyendo el idioma y el estilo del cuerpo. Recibe los hijos (children) como prop, que representan el contenido de las páginas individuales dentro de la aplicación.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  )
}
