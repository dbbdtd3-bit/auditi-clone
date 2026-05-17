import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        dataly: {
          navy: 'rgb(var(--dataly-navy-rgb) / <alpha-value>)',
          blue: 'rgb(var(--dataly-blue-rgb) / <alpha-value>)',
          teal: 'rgb(var(--dataly-teal-rgb) / <alpha-value>)',
          paper: 'rgb(var(--dataly-paper-rgb) / <alpha-value>)',
          surface: 'rgb(var(--dataly-surface-rgb) / <alpha-value>)',
          'surface-subtle': 'rgb(var(--dataly-surface-subtle-rgb) / <alpha-value>)',
          line: 'rgb(var(--dataly-line-rgb) / <alpha-value>)',
          'line-strong': 'rgb(var(--dataly-line-strong-rgb) / <alpha-value>)',
          ink: 'rgb(var(--dataly-ink-rgb) / <alpha-value>)',
          slate: 'rgb(var(--dataly-slate-rgb) / <alpha-value>)',
          muted: 'rgb(var(--dataly-muted-rgb) / <alpha-value>)',
          success: 'rgb(var(--dataly-success-rgb) / <alpha-value>)',
          'success-soft': 'rgb(var(--dataly-success-soft-rgb) / <alpha-value>)',
          warning: 'rgb(var(--dataly-warning-rgb) / <alpha-value>)',
          'warning-soft': 'rgb(var(--dataly-warning-soft-rgb) / <alpha-value>)',
          danger: 'rgb(var(--dataly-danger-rgb) / <alpha-value>)',
          'danger-soft': 'rgb(var(--dataly-danger-soft-rgb) / <alpha-value>)',
          info: 'rgb(var(--dataly-info-rgb) / <alpha-value>)',
          'info-soft': 'rgb(var(--dataly-info-soft-rgb) / <alpha-value>)',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        xl: 'var(--radius-xl)',
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
      },
    },
  },
  plugins: [],
};

export default config;
