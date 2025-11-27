import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
    {
        ignores: ['node_modules/', 'dist/', 'tests/'],
    },
    // Configuration for Node.js-specific files (like config files)
    {
        files: ['**/*.config.js', '**/*.config.mjs'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    // Main configuration for browser-based source code
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            'no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    args: 'none',
                    varsIgnorePattern: '^_',
                    caughtErrors: 'all',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    },
    js.configs.recommended,
    prettierConfig,
];
