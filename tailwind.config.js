/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary': 'var(--primary-color)',
        'primary-hover': 'var(--primary-hover)',
      },
      borderRadius: {
        DEFAULT: 'var(--border-radius)',
      }
    },
  },
  plugins: [],
};
