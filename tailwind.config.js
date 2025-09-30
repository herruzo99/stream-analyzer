/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './js/**/*.js'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['Fira Code', 'monospace'],
            },
        },
    },
    plugins: [],
};
