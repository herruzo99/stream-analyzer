import esbuild from 'esbuild';
import fs from 'fs/promises';
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
    metafile: true, // Always generate metafile, but we'll use it in memory
    logLevel: 'info',
    // --- ARCHITECTURAL FIX ---
    // The 'xml-formatter' dependency uses the Node.js 'global' object, which
    // is not defined in a web worker environment, causing a ReferenceError.
    // By defining 'global' as 'self', we instruct esbuild to replace all
    // instances at build time with the correct global object for a worker context.
    define: {
        global: 'self',
    },
    // --- ARCHITECTURAL FIX: Replace ts-paths plugin with native alias ---
    // The `esbuild-ts-paths` plugin was incorrectly intercepting node_modules
    // imports. Using esbuild's native `alias` feature is more robust and
    // achieves the same goal for our simple `@/*` path mapping.
    alias: {
        '@': './src',
    },
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
        console.log('Post-build finished: index.html generated.');
    } catch (error) {
        console.error('Post-build script failed:', error);
        process.exit(1);
    }
}

async function main() {
    const cspNonce = crypto.randomBytes(16).toString('base64');

    if (isDev) {
        // In dev mode, prepare a simple index.html with non-hashed asset paths.
        try {
            await fs.mkdir('dist', { recursive: true });
            const htmlTemplate = await fs.readFile('index.html', 'utf-8');
            const devHtml = htmlTemplate
                .replace('__APP_SCRIPT_PATH__', '/assets/app.js')
                .replace('__WORKER_PATH__', '/assets/worker.js')
                .replace(/__CSP_NONCE__/g, cspNonce);
            await fs.writeFile('dist/index.html', devHtml, 'utf-8');
            await fs.copyFile('favicon.ico', 'dist/favicon.ico');
        } catch (e) {
            console.error('Failed to prepare development index.html:', e);
            process.exit(1);
        }

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
