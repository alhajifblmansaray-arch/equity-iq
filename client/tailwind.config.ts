import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#F5F1EB',
          tint: '#EFEAE0',
        },
        ink: {
          DEFAULT: '#1A1A1A',
          secondary: '#6B6B6B',
          tertiary: '#9A9A9A',
        },
        hairline: '#E8E2D9',
        forest: '#2E5D43',
        brick: '#C04E40',
        amber: '#B8853A',
        dusty: '#3D6E8E',
      },
      fontFamily: {
        sans: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tight2: '-0.025em',
        tight1: '-0.015em',
        bodytight: '-0.01em',
        eyebrow: '0.08em',
      },
      borderRadius: {
        '3xl': '28px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.02), 0 1px 1px rgba(0,0,0,0.03)',
        cardHover: '0 4px 12px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04)',
        pill: '0 1px 3px rgba(0,0,0,0.06)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.85)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.8s linear infinite',
        pulseDot: 'pulseDot 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
