import globals from 'globals';
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';

export default [
    {
        ignores: ['node_modules/', '*.config.js', 'dist/'],
    },
    js.configs.recommended,
    prettierConfig,
    {
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
];
