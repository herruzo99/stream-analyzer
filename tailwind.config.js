/** @type {import('tailwindcss').Config} */
module.exports = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['Fira Code', 'monospace'],
            },
        },
    },
    plugins: [],
    extend: {
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
};
