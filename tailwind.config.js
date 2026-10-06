import { heroui } from '@heroui/react'

/**
 * Sistema de diseño tomado de fletes-v2 (Forestal Tezains): paleta índigo, neutros "ink",
 * superficies, tonos pastel, radios grandes (panel 28 px / tarjeta 20 px), botones en píldora,
 * sombras suaves y la fuente Outfit. Los colores salen de variables CSS (src/index.css)
 * para poder cambiar la marca por modo (Trabajadores = índigo, Ejidatarios = verde).
 */
const scale = (name, steps) =>
  Object.fromEntries(steps.map((s) => [s, `rgb(var(--c-${name}-${s}) / <alpha-value>)`]))

const brand = scale('brand', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900])
const ink = scale('ink', [950, 900, 800, 700, 600, 500, 400, 300, 200, 100])

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{ts,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,mjs}',
    './node_modules/@heroui/react/node_modules/@heroui/theme/dist/**/*.{js,mjs}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: 'var(--fuente-app)' },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.15rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.4rem' }],
        md: ['0.9375rem', { lineHeight: '1.45rem' }],
        lg: ['1.0625rem', { lineHeight: '1.5rem' }],
        xl: ['1.25rem', { lineHeight: '1.6rem' }],
        '2xl': ['1.5rem', { lineHeight: '1.85rem' }],
        '3xl': ['1.8rem', { lineHeight: '2.1rem' }]
      },
      colors: {
        brand,
        ink,
        // `slate` queda alineado con la escala ink para que cualquier clase slate-* que
        // quede suelta tome los neutros del sistema.
        slate: {
          50: 'rgb(var(--c-surface-muted) / <alpha-value>)',
          100: ink[100],
          200: ink[200],
          300: ink[300],
          400: ink[400],
          500: ink[500],
          600: ink[600],
          700: ink[700],
          800: ink[800],
          900: ink[900]
        },
        surface: {
          DEFAULT: 'rgb(var(--c-surface-default) / <alpha-value>)',
          card: 'rgb(var(--c-surface-card) / <alpha-value>)',
          border: 'rgb(var(--c-surface-border) / <alpha-value>)',
          muted: 'rgb(var(--c-surface-muted) / <alpha-value>)'
        },
        success: {
          DEFAULT: 'rgb(var(--c-success-default) / <alpha-value>)',
          bg: 'rgb(var(--c-success-bg) / <alpha-value>)'
        },
        warning: {
          DEFAULT: 'rgb(var(--c-warning-default) / <alpha-value>)',
          bg: 'rgb(var(--c-warning-bg) / <alpha-value>)'
        },
        danger: {
          DEFAULT: 'rgb(var(--c-danger-default) / <alpha-value>)',
          bg: 'rgb(var(--c-danger-bg) / <alpha-value>)'
        },
        info: { DEFAULT: '#1d4ed8', bg: '#e3edfd' },
        tono: {
          indigo: { bg: '#ecebfd', borde: '#d6d3fb', texto: '#5b4ae6' },
          verde: { bg: '#e4f7ec', borde: '#c3ecd3', texto: '#15803d' },
          azul: { bg: '#e6f0fd', borde: '#c9dcf9', texto: '#1d64d8' },
          ambar: { bg: '#fbf2de', borde: '#f2dfb2', texto: '#b45309' },
          rosa: { bg: '#fce9f2', borde: '#f5cde0', texto: '#be185d' },
          teal: { bg: '#e0f5f3', borde: '#bce7e2', texto: '#0f766e' }
        }
      },
      boxShadow: {
        panel: 'var(--sombra-panel)',
        card: 'var(--sombra-card)',
        popover: '0 16px 40px -10px rgba(25, 28, 46, 0.25)',
        boton: 'var(--sombra-boton)'
      },
      borderRadius: {
        panel: 'var(--radio-panel)',
        card: 'var(--radio-card)'
      },
      keyframes: {
        'modal-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' }
        },
        'overlay-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'modal-in': 'modal-in 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'overlay-in': 'overlay-in 150ms ease-out',
        'fade-in': 'fade-in 180ms cubic-bezier(0.16, 1, 0.3, 1)'
      }
    }
  },
  plugins: [
    // Mismo tema claro que fletes-v2. El color "primary" por modo (índigo/verde) se define con
    // variables CSS en src/index.css para que también cambie dentro de ventanas y menús.
    heroui({
      defaultTheme: 'light',
      themes: {
        light: {
          colors: {
            background: '#f3f4f8',
            foreground: '#191c2e',
            primary: {
              50: '#f1f0ff', 100: '#e5e2ff', 200: '#cec8fe', 300: '#ada3fc', 400: '#8c7ef8',
              500: '#6f60f1', 600: '#5b4ae6', 700: '#4b3bca', 800: '#3e33a3', 900: '#342d80',
              DEFAULT: '#5b4ae6', foreground: '#ffffff'
            },
            success: { DEFAULT: '#15803d', foreground: '#ffffff' },
            warning: { DEFAULT: '#b45309', foreground: '#ffffff' },
            danger: { DEFAULT: '#dc2626', foreground: '#ffffff' }
          }
        }
      }
    })
  ]
}
