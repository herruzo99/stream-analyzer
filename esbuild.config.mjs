import crypto from 'crypto';
import esbuild from 'esbuild';
import { watch } from 'fs';
import fs from 'fs/promises';
import path from 'path';

const isDev = process.argv.includes('--watch');

const esbuildOptions = {
    entryPoints: {
        app: 'src/application/main.js',
        worker: 'src/infrastructure/worker/main.js',
    },
    bundle: true,
    outdir: 'dist/assets',
    // ARCHITECTURAL FIX: Use external source maps to prevent 30MB+ bundle sizes.
    // 'inline' appends the map to the file, choking the browser's JS parser.
    sourcemap: true, 
    minify: !isDev,
    entryNames: isDev ? '[name]' : '[name]-[hash]',
    assetNames: isDev ? '[name]' : '[name]-[hash]',
    metafile: !isDev,
    logLevel: 'info',
    define: {
        global: 'self',
    },
    alias: {
        '@': './src',
    },
    external: [],
};

// Mock configuration for local development to prevent 404s and template leaks.
const mockDevConfig = {
    __GA_ID__: 'G-DEV-MOCK',
    __SENTRY_DSN__: 'mock-sentry-key',
    __CLARITY_ID__: 'mock-clarity-id',
    __PROD_HOSTNAME__: 'localhost',
};

async function safeCopyFile(src, dest) {
    try {
        await fs.copyFile(src, dest);
    } catch (e) {
        console.warn(`Warning: Could not copy ${src} to ${dest}.`, e.message);
    }
}

async function copyRecursive(src, dest) {
    try {
        await fs.cp(src, dest, { recursive: true });
    } catch (e) {
        console.warn(`Warning: Could not copy ${src} to ${dest}.`, e);
    }
}

function minifyHtml(html) {
    return html
        .replace(/<!--[\s\S]*?-->/g, '')
        .trim();
}

async function postBuild(meta, cspNonce) {
    console.log('Running post-build...');
    try {
        const outputs = meta.outputs;
        let mainJsPath, workerJsPath;

        for (const [outputPath, outputMeta] of Object.entries(outputs)) {
            const relativePath = path.relative('dist', outputPath);
            if (outputMeta.entryPoint === 'src/application/main.js') {
                mainJsPath = relativePath;
            } else if (
                outputMeta.entryPoint === 'src/infrastructure/worker/main.js'
            ) {
                workerJsPath = relativePath;
            }
        }

        if (!mainJsPath || !workerJsPath) {
            throw new Error('Could not find all required assets in metafile.');
        }

        const htmlTemplate = await fs.readFile('index.html', 'utf-8');
        let finalHtml = htmlTemplate
            .replace('__APP_SCRIPT_PATH__', `${mainJsPath}`)
            .replace('__WORKER_PATH__', `${workerJsPath}`)
            .replace(/__CSP_NONCE__/g, cspNonce);

        if (process.env.CI) {
            console.log(
                'CI environment detected. Preserving configuration placeholders.'
            );
        } else {
            console.log(
                'Local environment detected. Injecting mock configuration.'
            );
            for (const [placeholder, value] of Object.entries(mockDevConfig)) {
                finalHtml = finalHtml.split(placeholder).join(value);
            }
        }

        if (!isDev) {
            finalHtml = minifyHtml(finalHtml);
            console.log('HTML Minified (Safe Mode).');
        }

        await fs.writeFile(path.join('dist', 'index.html'), finalHtml);

        await safeCopyFile('static/icon.png', 'dist/icon.png');
        await copyRecursive('public', 'dist');
        
        // CSS Assets
        await safeCopyFile(
            'node_modules/shaka-player/dist/controls.css',
            'dist/assets/controls.css'
        );
        // Attempt to copy source map for controls.css if it exists
        await safeCopyFile(
            'node_modules/shaka-player/dist/controls.css.map',
            'dist/assets/controls.css.map'
        );

        console.log('Post-build finished: index.html generated.');
    } catch (error) {
        console.error('Post-build script failed:', error);
        process.exit(1);
    }
}

async function prepareDevHtml(cspNonce) {
    try {
        await fs.mkdir('dist', { recursive: true });
        const htmlTemplate = await fs.readFile('index.html', 'utf-8');

        let devHtml = htmlTemplate
            .replace('__APP_SCRIPT_PATH__', 'assets/app.js')
            .replace('__WORKER_PATH__', 'assets/worker.js')
            .replace(/__CSP_NONCE__/g, cspNonce);

        for (const [placeholder, value] of Object.entries(mockDevConfig)) {
            devHtml = devHtml.split(placeholder).join(value);
        }

        await fs.writeFile('dist/index.html', devHtml, 'utf-8');
        await safeCopyFile('static/icon.png', 'dist/icon.png');
        await copyRecursive('public', 'dist');
        
        // CSS Assets for Dev
        await safeCopyFile(
            'node_modules/shaka-player/dist/controls.css',
            'dist/assets/controls.css'
        );
        // Attempt to copy source map
        await safeCopyFile(
            'node_modules/shaka-player/dist/controls.css.map',
            'dist/assets/controls.css.map'
        );

        console.log('Development index.html regenerated with mock config.');
    } catch (e) {
        console.error('Failed to prepare development index.html:', e);
    }
}

async function main() {
    const cspNonce = crypto.randomBytes(16).toString('base64');

    if (isDev) {
        await prepareDevHtml(cspNonce);

        watch('index.html', (eventType, filename) => {
            if (eventType === 'change') {
                console.log(`Source ${filename} changed. Regenerating...`);
                prepareDevHtml(cspNonce);
            }
        });

        watch('public', (eventType, filename) => {
            console.log(`Public asset ${filename} changed. Syncing...`);
            copyRecursive('public', 'dist');
        });

        const ctx = await esbuild.context(esbuildOptions);
        await ctx.watch();
        await ctx.serve({
            servedir: 'dist',
            fallback: 'dist/index.html',
        });
        console.log('Development server running on http://localhost:8000');
    } else {
        const result = await esbuild.build(esbuildOptions);
        await postBuild(result.metafile, cspNonce);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});