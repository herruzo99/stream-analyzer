import { createInfoTooltip } from '../ui.js';
import { analysisState } from '../state.js';
import { runChecks } from '../api/compliance.js';

/**
 * Generates the HTML for a single section of the compliance report.
 * @param {string} title The title of the section.
 * @param {Array<object>} items The check items for this section.
 * @returns {string} The HTML for the report section.
 */
function generateReportSectionHTML(title, items) {
    if (items.length === 0) return '';

    const icons = {
        pass: '✔',
        fail: '✖',
        warn: '⚠',
        info: 'ℹ',
    };

    const cardsHtml = items.map(item => `
        <div class="compliance-card ${item.status}">
            <div class="compliance-card-header">
                <span class="status-indicator ${item.status}">${icons[item.status]}</span>
                <h5 class="compliance-card-title">${item.text}</h5>
            </div>
            <p class="compliance-card-desc">
                ${item.details}
                ${createInfoTooltip(item.details, item.isoRef)}
            </p>
        </div>
    `).join('');

    return `
        <div class="mb-8">
            <h4 class="text-lg font-semibold text-gray-300 mb-3 pb-2 border-b border-gray-700">${title}</h4>
            <div class="compliance-grid">
                ${cardsHtml}
            </div>
        </div>
    `;
}

export function getComplianceReportHTML(mpd, isComparison = false) {
    if (isComparison) {
        let html = '<div class="space-y-8">';
        analysisState.streams.forEach((stream) => {
            const checks = runChecks(stream.mpd);
            const groupedChecks = groupChecks(checks);
            
            html += `<div class="bg-gray-900 p-4 rounded-md">
                        <h3 class="text-xl font-bold mb-4">${stream.name}</h3>`;
            
            for (const [group, items] of Object.entries(groupedChecks)) {
                html += generateReportSectionHTML(group, items);
            }

            html += `</div>`;
        });
        html += '</div>';
        return html;
    }

    // Single stream view
    const checks = runChecks(mpd);
    const groupedChecks = groupChecks(checks);
    let html = `<h3 class="text-xl font-bold mb-4">Compliance & Best Practices Report</h3>`;

    for (const [group, items] of Object.entries(groupedChecks)) {
        html += generateReportSectionHTML(group, items);
    }
    
    html += `<div class="dev-watermark">Compliance v3.0</div>`;
    return html;
}

function groupChecks(checks) {
    const groups = {
        "Manifest Structure": [],
        "Live Stream Properties": [],
        "Segment & Timing Info": [],
        "Profile Conformance": [],
        "General Best Practices": [],
    };

    checks.forEach(check => {
        const text = check.text.toLowerCase();
        if (text.includes('profile')) groups["Profile Conformance"].push(check);
        else if (text.includes('segment') || text.includes('timeline')) groups["Segment & Timing Info"].push(check);
        else if (text.includes('dynamic') || text.includes('live') || text.includes('publish') || text.includes('update')) groups["Live Stream Properties"].push(check);
        else if (text.includes('mpd') || text.includes('period') || text.includes('adaptationset') || text.includes('representation')) groups["Manifest Structure"].push(check);
        else groups["General Best Practices"].push(check);
    });

    Object.keys(groups).forEach(key => {
        if (groups[key].length === 0) delete groups[key];
    });

    return groups;
}