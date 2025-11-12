import esbuild from 'esbuild';
import fs from 'fs/promises';
import { watch } from 'fs';
import path from 'path';
import crypto from 'crypto';

const isDev = process.argv.includes('--watch');

const esbuildOptions = {
    entryPoints: {
        app: 'src/application/main.js',
        worker: 'src/infrastructure/worker/main.js',
    },
    bundle: true,
    outdir: 'dist/assets',
    sourcemap: isDev ? 'inline' : false,
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
    // External libraries that should be loaded as UMD modules and attached to window
    external: [], // We want shaka-player to be bundled, not external
};

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
        const finalHtml = htmlTemplate
            .replace('__APP_SCRIPT_PATH__', `/${mainJsPath}`)
            .replace('__WORKER_PATH__', `/${workerJsPath}`)
            .replace(/__CSP_NONCE__/g, cspNonce);

        await fs.writeFile(path.join('dist', 'index.html'), finalHtml);
        await fs.copyFile('favicon.ico', 'dist/favicon.ico');

        // ARCHITECTURAL FIX: Copy MSW for production
        await fs.copyFile(
            'public/mockServiceWorker.js',
            'dist/mockServiceWorker.js'
        );

        // Copy Shaka Player CSS to dist
        await fs.copyFile(
            'node_modules/shaka-player/dist/controls.css',
            'dist/assets/controls.css'
        );

        console.log('Post-build finished: index.html generated.');
    } catch (error) {
        console.error('Post-build script failed:', error);
        process.exit(1);
    }
}

// --- ARCHITECTURAL FIX: Reusable HTML generation for dev mode ---
async function prepareDevHtml(cspNonce) {
    try {
        await fs.mkdir('dist', { recursive: true });
        const htmlTemplate = await fs.readFile('index.html', 'utf-8');
        const devHtml = htmlTemplate
            .replace('__APP_SCRIPT_PATH__', '/assets/app.js')
            .replace('__WORKER_PATH__', '/assets/worker.js')
            .replace(/__CSP_NONCE__/g, cspNonce);
        await fs.writeFile('dist/index.html', devHtml, 'utf-8');
        await fs.copyFile('favicon.ico', 'dist/favicon.ico');

        // ARCHITECTURAL FIX: Copy MSW for development
        await fs.copyFile(
            'public/mockServiceWorker.js',
            'dist/mockServiceWorker.js'
        );

        // Copy Shaka Player CSS for development
        await fs.copyFile(
            'node_modules/shaka-player/dist/controls.css',
            'dist/assets/controls.css'
        );

        console.log('Development index.html regenerated.');
    } catch (e) {
        console.error('Failed to prepare development index.html:', e);
    }
}

async function main() {
    const cspNonce = crypto.randomBytes(16).toString('base64');

    if (isDev) {
        await prepareDevHtml(cspNonce);

        // --- ARCHITECTURAL FIX: Watch index.html for changes ---
        watch('index.html', (eventType, filename) => {
            if (eventType === 'change') {
                console.log(`Source ${filename} changed. Regenerating...`);
                prepareDevHtml(cspNonce);
            }
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