/** @type {import('tailwindcss').Config} */
module.exports = {
    theme: {
        extend: {
            fontFamily: {
                sans: [
                    'Inter',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    '"Segoe UI"',
                    'Roboto',
                    'Helvetica',
                    'Arial',
                    'sans-serif',
                ],
                mono: ['Fira Code', 'Menlo', 'Monaco', 'monospace'],
            },
            colors: {
                zinc: {
                    50: '#fafafa',
                    100: '#f4f4f5',
                    200: '#e4e4e7',
                    300: '#d4d4d8',
                    400: '#a1a1aa',
                    500: '#71717a',
                    600: '#52525b',
                    700: '#3f3f46',
                    800: '#27272a',
                    900: '#18181b',
                    950: '#09090b',
                },
                success: '#22c55e',
                warning: '#f59e0b',
                danger: '#ef4444',
                info: '#3b82f6',
            },
            keyframes: {
                fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
                fadeOut: { '0%': { opacity: 1 }, '100%': { opacity: 0 } },
                scaleIn: {
                    '0%': { transform: 'scale(0.95)', opacity: 0 },
                    '100%': { transform: 'scale(1)', opacity: 1 },
                },
            },
            animation: {
                fadeIn: 'fadeIn 0.3s ease-out forwards',
                fadeOut: 'fadeOut 0.3s ease-in forwards',
                scaleIn: 'scaleIn 0.2s ease-out forwards',
            },
        },
    },
    plugins: [],
};