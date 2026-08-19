/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F5F1',
        surface: '#FFFFFF',
        ink: '#1B2430',
        emerald: '#2F6F4E',
        rust: '#B5482C',
        muted: '#8A8F98'
      },
      fontFamily: {
        display: ['Newsreader', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace']
      },
      borderRadius: {
        DEFAULT: '4px'
      }
    }
  },
  plugins: []
}
