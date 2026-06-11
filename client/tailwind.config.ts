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
        tight2: '-0.028em',
        tight1: '-0.018em',
        bodytight: '-0.012em',
        eyebrow: '0.10em',
      },
      borderRadius: {
        '3xl': '28px',
        '4xl': '36px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.02), 0 1px 1px rgba(0,0,0,0.03)',
        cardHover: '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        glass: '0 8px 32px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)',
        glassHover: '0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
        pill: '0 1px 3px rgba(0,0,0,0.06)',
        'inner-sm': 'inset 0 1px 3px rgba(0,0,0,0.05)',
        'btn-forest': '0 1px 2px rgba(46,93,67,0.20), 0 4px 14px rgba(46,93,67,0.18)',
        'btn-forest-hover': '0 2px 4px rgba(46,93,67,0.26), 0 8px 24px rgba(46,93,67,0.24)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-600px 0' },
          '100%': { backgroundPosition: '600px 0' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(0.80)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        tickerScroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 650ms cubic-bezier(0.16, 1, 0.3, 1) both',
        fadeIn: 'fadeIn 500ms ease both',
        shimmer: 'shimmer 2s linear infinite',
        pulseDot: 'pulseDot 2s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
        tickerScroll: 'tickerScroll 28s linear infinite',
        scaleIn: 'scaleIn 450ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
