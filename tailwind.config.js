/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './src/**/*.js'],
    safelist: [
        {
            // Pattern for bg-color-shade/opacity used in hex view
            pattern:
                /bg-(red|yellow|green|blue|indigo|purple|pink|teal|slate)-(700|900)\/(20|30|40|50|60|70|80|90)/,
        },
        {
            // Pattern for base background colors used in the worker and tree views
            pattern:
                /bg-(red|yellow|green|blue|indigo|purple|pink|teal|slate)-(700|900)/,
        },
    ],
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