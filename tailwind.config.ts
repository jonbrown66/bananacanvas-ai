import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono"',
  				'Courier New"',
  				'monospace',
  				'Noto Sans SC"',
  				'Noto Sans CJK SC"',
  				'Source Han Sans SC"',
  				'Source Han Sans CN"',
  				'PingFang SC"',
  				'Hiragino Sans GB"',
  				'Microsoft YaHei"',
  				'sans-serif'
  			],
  			mono: [
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono"',
  				'Courier New"',
  				'monospace',
  				'Noto Sans SC"',
  				'Noto Sans CJK SC"',
  				'Source Han Sans SC"',
  				'Source Han Sans CN"',
  				'PingFang SC"',
  				'Hiragino Sans GB"',
  				'Microsoft YaHei"',
  				'sans-serif'
  			]
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			brand: {
  				DEFAULT: '#FF6B00',
  				secondary: '#FF9500',
  				light: '#FFF9F5',
  				dark: '#111827',
  				accent: '#FF6B00'
  			},
  			ai: {
  				start: 'hsl(var(--ai-accent-start))',
  				end: 'hsl(var(--ai-accent-end))',
  				text: 'hsl(var(--ai-accent-text))'
  			},
  			dark: {
  				bg: '#121212',
  				surface: '#1E1E1E',
  				border: '#2A2A2A',
  				text: {
  					primary: '#FFFFFF',
  					secondary: '#A1A1AA',
  					muted: '#71717A'
  				}
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			xl: '1rem',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
