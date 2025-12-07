/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',   // Azul Principal (Botones, Activos)
        secondary: '#64748b', // Gris (Textos secundarios)
        success: '#22c55e',   // Verde (Completado, Pagado)
        warning: '#f59e0b',   // Naranja (Pendiente)
        danger: '#ef4444',    // Rojo (Error, Cancelado)
        dark: '#0f172a',      // Fondo oscuro / Textos fuertes
        light: '#f1f5f9',     // Fondo claro
      }
    },
  },
  plugins: [],
}