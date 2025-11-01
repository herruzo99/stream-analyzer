import { html } from 'lit-html';
import * as icons from '@/ui/icons';

export const aboutModalTemplate = () => html`
    <div class="space-y-6 text-sm text-slate-300">
        <div class="text-center">
            <h2 class="text-2xl font-bold text-white">Stream Analyzer</h2>
            <p class="text-slate-400 mt-1">
                An advanced, in-browser tool for media stream analysis.
            </p>
        </div>

        <div>
            <h3 class="text-lg font-semibold text-white mb-2">Key Features</h3>
            <ul class="space-y-2 list-disc pl-5">
                <li>
                    <strong class="text-slate-200"
                        >Multi-Stream Comparison:</strong
                    >
                    Analyze and compare multiple DASH & HLS manifests
                    side-by-side.
                </li>
                <li>
                    <strong class="text-slate-200"
                        >Interactive Manifests & Segments:</strong
                    >
                    Explore manifests with context-aware tooltips and dive into
                    the byte-level structure of segments with a hex/tree viewer.
                </li>
                <li>
                    <strong class="text-slate-200"
                        >Compliance & Validation:</strong
                    >
                    Check manifests against industry standards (DASH-IF, HLS)
                    and best practices to identify issues.
                </li>
                <li>
                    <strong class="text-slate-200"
                        >Live Stream Monitoring:</strong
                    >
                    Automatically fetch and diff manifest updates for live
                    streams, highlighting changes in real-time.
                </li>
                <li>
                    <strong class="text-slate-200"
                        >Timeline Visualization:</strong
                    >
                    Visualize segment and ad break timing on an interactive
                    timeline.
                </li>
            </ul>
        </div>

        <div class="pt-4 border-t border-slate-700">
            <h3 class="text-lg font-semibold text-white mb-2">Disclaimer</h3>
            <p class="text-slate-400">
                This software is provided "as is", without warranty of any kind,
                express or implied, including but not limited to the warranties
                of merchantability, fitness for a particular purpose and
                noninfringement. In no event shall the authors or copyright
                holders be liable for any claim, damages or other liability,
                whether in an action of contract, tort or otherwise, arising
                from, out of or in connection with the software or the use or
                other dealings in the software.
            </p>
        </div>

        <div class="pt-4 border-t border-slate-700 text-center text-slate-400">
            <p>
                Created by
                <strong class="text-white">Juan Herruzo Herrero</strong>
            </p>
            <a
                href="https://github.com/herruzo99/stream-analyzer"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-2 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
                <i data-lucide="github" class="h-4 w-4"></i>
                <span>View Project on GitHub</span>
            </a>
        </div>
    </div>
`;
