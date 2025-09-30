import { html } from 'lit-html';

const dataItem = (label, value) => {
    if (value === null || value === undefined) return '';
    return html`
        <div class="text-xs">
            <span class="block text-gray-400 mb-0.5">${label}</span>
            <span class="block font-semibold font-mono text-gray-200"
                >${value}</span
            >
        </div>
    `;
};

export const tsAnalysisTemplate = (analysis) => {
    const { summary, packets } = analysis.data;
    const pmtPid = Object.keys(summary.programMap)[0];
    const program = pmtPid ? summary.programMap[pmtPid] : null;

    // Calculate PID counts for the new table
    const pidCounts = packets.reduce((acc, packet) => {
        acc[packet.pid] = (acc[packet.pid] || 0) + 1;
        return acc;
    }, {});

    const pidTypes = {};
    if (program) {
        Object.assign(pidTypes, program.streams);
        pidTypes[summary.pcrPid] = `${
            pidTypes[summary.pcrPid] || 'Unknown'
        } (PCR)`;
    }
    pidTypes[0] = 'PAT';
    summary.pmtPids.forEach((pid) => (pidTypes[pid] = 'PMT'));

    return html`
        <div
            class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 bg-gray-900 border border-gray-700 rounded p-3 mb-4"
        >
            ${dataItem('Total Packets', summary.totalPackets)}
            ${dataItem('PCR PID', summary.pcrPid || 'N/A')}
            ${program ? dataItem('Program #', program.programNumber) : ''}
            ${summary.errors.length > 0
                ? dataItem('Errors', summary.errors.join(', '))
                : ''}
        </div>

        <h4 class="text-md font-bold mb-2 mt-4">PID Allocation</h4>
        <div
            class="bg-gray-800/50 rounded-lg border border-gray-700 overflow-x-auto"
        >
            <table class="w-full text-left text-xs">
                <thead class="bg-gray-900/50">
                    <tr>
                        <th class="p-2 font-semibold text-gray-300">PID</th>
                        <th class="p-2 font-semibold text-gray-300">
                            Packet Count
                        </th>
                        <th class="p-2 font-semibold text-gray-300">
                            Stream Type / Purpose
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-700">
                    ${Object.entries(pidCounts)
                        .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
                        .map(
                            ([pid, count]) => html`
                                <tr>
                                    <td class="p-2 font-mono">
                                        ${pid}
                                        (0x${parseInt(pid)
                                            .toString(16)
                                            .padStart(4, '0')})
                                    </td>
                                    <td class="p-2 font-mono">${count}</td>
                                    <td class="p-2">
                                        ${pidTypes[pid] || 'Unknown/Data'}
                                    </td>
                                </tr>
                            `
                        )}
                </tbody>
            </table>
        </div>
    `;
};
