import * as icons from '@/ui/icons';
import { getCicpLabel } from '@/ui/shared/cicp';
import { formatBitrate } from '@/ui/shared/format';
import { html, render } from 'lit-html';

class SegmentGeneralSummary extends HTMLElement {
    set vm(val) {
        this._vm = val;
        this.render();
    }

    getColrData() {
        if (!this._vm || !this._vm.structure || !this._vm.structure.boxes)
            return null;
        const findColr = (boxes) => {
            for (const box of boxes) {
                if (box.type === 'colr') return box;
                if (box.children) {
                    const found = findColr(box.children);
                    if (found) return found;
                }
            }
            return null;
        };
        const colr = findColr(this._vm.structure.boxes);
        if (!colr || !colr.details.colour_primaries) return null;
        const getVal = (field) => {
            const val = colr.details[field]?.value;
            return typeof val === 'string' ? parseInt(val, 10) : val;
        };
        return {
            primaries: getVal('colour_primaries'),
            transfer: getVal('transfer_characteristics'),
            matrix: getVal('matrix_coefficients'),
            fullRange: colr.details.full_range_flag?.value === 1,
        };
    }

    getCompositionData() {
        if (!this._vm || !this._vm.structure || !this._vm.structure.boxes)
            return null;
        const findBox = (boxes, type) => {
            for (const box of boxes) {
                if (box.type === type) return box;
                if (box.children) {
                    const found = findBox(box.children, type);
                    if (found) return found;
                }
            }
            return null;
        };
        const cslg = findBox(this._vm.structure.boxes, 'cslg');
        const elst = findBox(this._vm.structure.boxes, 'elst');
        if (!cslg && !elst) return null;
        return {
            cslg: cslg
                ? {
                      shift: cslg.details.compositionToDTSShift?.value,
                      minDelta: cslg.details.leastDecodeToDisplayDelta?.value,
                      maxDelta:
                          cslg.details.greatestDecodeToDisplayDelta?.value,
                  }
                : null,
            elst: elst
                ? {
                      count: elst.details.entry_count?.value,
                  }
                : null,
        };
    }

    render() {
        if (!this._vm) return;
        const { stats, codecInfo, bitstream } = this._vm;
        const fileSizeText =
            stats.fileSize > 1024 * 1024
                ? `${(stats.fileSize / 1024 / 1024).toFixed(2)} MB`
                : `${(stats.fileSize / 1024).toFixed(2)} KB`;
        const formatColor = stats.formatLabel.includes('TS')
            ? 'text-orange-400'
            : 'text-cyan-400';
        const colorData = this.getColrData();
        const cicpLabel = colorData
            ? getCicpLabel(
                  colorData.primaries,
                  colorData.transfer,
                  colorData.matrix
              )
            : null;
        const compositionData = this.getCompositionData();

        const gopInfo = bitstream
            ? `${bitstream.gopStructure} GOP (${bitstream.minGopLength}-${bitstream.maxGopLength})`
            : null;

        // Adjusted watermark style: moved further out and reduced opacity for a subtle effect
        const watermarkStyle =
            'absolute -right-6 -top-6 text-slate-800/50 group-hover:text-slate-800 transition-colors pointer-events-none select-none';
        const watermarkInner = 'scale-[3] transform rotate-12 opacity-80';

        const template = html`
            <div
                class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8 animate-fadeIn"
            >
                <!-- Card 1: File Identity -->
                <div
                    class="bg-slate-800 rounded-xl p-5 border border-slate-700 relative overflow-hidden group hover:border-slate-600 transition-colors"
                >
                    <div class="${watermarkStyle}">
                        <div class="${watermarkInner}">${icons.fileText}</div>
                    </div>
                    <div class="relative z-10">
                        <h3
                            class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2"
                        >
                            Container
                        </h3>
                        <div class="flex items-baseline gap-2 mb-1">
                            <span class="text-2xl font-bold text-white"
                                >${fileSizeText}</span
                            >
                            <span class="text-xs font-mono ${formatColor}"
                                >${stats.formatLabel}</span
                            >
                        </div>
                        <p class="text-xs text-slate-400 mb-4">${stats.type}</p>
                        <div class="h-px bg-slate-700/50 mb-3"></div>
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="text-[10px] text-slate-500 uppercase">
                                    Duration
                                </p>
                                <p class="text-sm font-mono text-slate-200">
                                    ${stats.duration.toFixed(3)}s
                                </p>
                            </div>
                            <div class="text-right">
                                <p class="text-[10px] text-slate-500 uppercase">
                                    Avg Bitrate
                                </p>
                                <p class="text-sm font-mono text-slate-200">
                                    ${formatBitrate(stats.avgBitrate)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card 2: Stream Details -->
                <div
                    class="bg-slate-800 rounded-xl p-5 border border-slate-700 relative overflow-hidden group hover:border-slate-600 transition-colors"
                >
                    <div class="${watermarkStyle}">
                        <div class="${watermarkInner}">${icons.film}</div>
                    </div>
                    <div class="relative z-10">
                        <h3
                            class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2"
                        >
                            Stream
                        </h3>
                        <div class="flex items-center gap-3 mb-4">
                            <span class="text-2xl font-bold text-white truncate"
                                >${codecInfo.name}</span
                            >
                            ${codecInfo.resolution !== '-'
                                ? html`<span
                                      class="px-2 py-0.5 rounded bg-slate-900 border border-slate-600 text-xs font-mono text-slate-300"
                                      >${codecInfo.resolution}</span
                                  >`
                                : ''}
                        </div>
                        <div class="flex flex-wrap gap-2">
                            ${codecInfo.details.map(
                                (d) =>
                                    html`<span
                                        class="px-2 py-1 rounded bg-slate-700/50 text-[10px] font-bold text-slate-300 border border-slate-600/50"
                                        >${d}</span
                                    >`
                            )}
                            ${gopInfo
                                ? html`<span
                                      class="px-2 py-1 rounded bg-blue-900/30 text-[10px] font-bold text-blue-300 border border-blue-700/30"
                                      >${gopInfo}</span
                                  >`
                                : ''}
                            ${cicpLabel
                                ? html`<span
                                      class="px-2 py-1 rounded bg-pink-900/30 text-[10px] font-bold text-pink-300 border border-pink-700/30"
                                      title="Color Primaries / Transfer / Matrix"
                                      >${cicpLabel}
                                      ${colorData.fullRange
                                          ? '(Full)'
                                          : ''}</span
                                  >`
                                : ''}
                        </div>
                        ${compositionData
                            ? html`
                                  <div
                                      class="mt-4 pt-2 border-t border-slate-700/50 flex gap-4 text-[10px] text-slate-400 font-mono"
                                  >
                                      ${compositionData.cslg
                                          ? html`<span
                                                >CSLG Shift:
                                                ${compositionData.cslg
                                                    .shift}</span
                                            >`
                                          : ''}
                                      ${compositionData.elst
                                          ? html`<span
                                                >ELST:
                                                ${compositionData.elst.count}
                                                Edits</span
                                            >`
                                          : ''}
                                  </div>
                              `
                            : ''}
                    </div>
                </div>

                <!-- Card 3: Frame Distribution (Mini) -->
                ${bitstream
                    ? html`
                          <div
                              class="bg-slate-800 rounded-xl p-5 border border-slate-700 flex flex-col justify-between relative overflow-hidden group hover:border-slate-600 transition-colors"
                          >
                              <h3
                                  class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2"
                              >
                                  Composition
                              </h3>

                              <div class="flex items-end gap-3 h-16 mb-2 px-2">
                                  <!-- I-Frame Bar -->
                                  <div
                                      class="flex flex-col items-center gap-2 flex-1 group/bar"
                                  >
                                      <div
                                          class="w-full bg-red-500/20 h-full relative rounded-t-sm overflow-hidden"
                                      >
                                          <div
                                              class="absolute bottom-0 left-0 right-0 bg-red-500 transition-all duration-500"
                                              style="height: ${(bitstream
                                                  .distribution.I /
                                                  bitstream.totalFrames) *
                                              100}%"
                                          ></div>
                                      </div>
                                      <span
                                          class="text-sm font-bold text-red-400"
                                      >
                                          ${bitstream.distribution.I} I
                                      </span>
                                  </div>

                                  <!-- P-Frame Bar -->
                                  <div
                                      class="flex flex-col items-center gap-2 flex-1"
                                  >
                                      <div
                                          class="w-full bg-blue-500/20 h-full relative rounded-t-sm overflow-hidden"
                                      >
                                          <div
                                              class="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all duration-500"
                                              style="height: ${(bitstream
                                                  .distribution.P /
                                                  bitstream.totalFrames) *
                                              100}%"
                                          ></div>
                                      </div>
                                      <span
                                          class="text-sm font-bold text-blue-400"
                                      >
                                          ${bitstream.distribution.P} P
                                      </span>
                                  </div>

                                  <!-- B-Frame Bar -->
                                  <div
                                      class="flex flex-col items-center gap-2 flex-1"
                                  >
                                      <div
                                          class="w-full bg-indigo-500/20 h-full relative rounded-t-sm overflow-hidden"
                                      >
                                          <div
                                              class="absolute bottom-0 left-0 right-0 bg-indigo-500 transition-all duration-500"
                                              style="height: ${(bitstream
                                                  .distribution.B /
                                                  bitstream.totalFrames) *
                                              100}%"
                                          ></div>
                                      </div>
                                      <span
                                          class="text-sm font-bold text-indigo-400"
                                      >
                                          ${bitstream.distribution.B} B
                                      </span>
                                  </div>
                              </div>

                              <div
                                  class="flex justify-between items-center text-xs text-slate-400 mt-2 pt-2 border-t border-slate-700/50"
                              >
                                  <span
                                      >Avg GOP:
                                      ${bitstream.gopLength.toFixed(1)}</span
                                  >
                                  <span
                                      >Max Frame:
                                      ${(bitstream.maxFrameSize / 1024).toFixed(
                                          1
                                      )}
                                      KB</span
                                  >
                              </div>
                          </div>
                      `
                    : html`
                          <div
                              class="bg-slate-800 rounded-xl p-5 border border-slate-700 flex items-center justify-center text-slate-600 text-xs italic"
                          >
                              Bitstream analysis unavailable.
                              ${stats.formatLabel.includes('TS')
                                  ? html`<br /><span
                                            class="text-[10px] mt-1 opacity-75"
                                            >Format: MPEG-TS</span
                                        >`
                                  : ''}
                          </div>
                      `}
            </div>
        `;
        render(template, this);
    }
}

customElements.define('segment-general-summary', SegmentGeneralSummary);
