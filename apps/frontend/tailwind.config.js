/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          Blanco: '#FFFFFF',
          Fondo: '#F9F9F9', // Fondo principal
          Verde_principal: '#64B32E', // Verde Principal
          Verde_oscuro: '#527630',
          Gris_bajo: '#B4B4B4', 
          Gris_medio: '#8E8E8E', 
          Gris_oscuro: '#4E4D4D',
          Status_verde: '#C1D82F', // Estatus "Completado / Aprobado"
          Status_azul: '#00A4E4', // Estatus "En revisión"
          Status_amarillo: '#FFD100', // Estatus "Pendiente"
          Status_rojo: '#770F00', // Estatus "En Corregir"
          Beige: '#E4BA8B',
          Naranja: '#FBB034',
          Azul_oscuro: '#006096',
          Morado: '#522583',
          Rosa: '#C7017F',
        },
      },
      fontFamily: {
        title: ['Inter', 'sans-serif'],
        body: ['Source Sans 3', 'sans-serif'],
        accent: ['Jost', 'sans-serif'],
      },
    },
  },
  plugins: [],
}