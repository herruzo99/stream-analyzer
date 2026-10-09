/**
 * Signal-quality entry point.
 *
 * Minimal shim for the port: the ported shell references
 * `signalQualityView` here, while 1.2.0 exposes the QC dashboard view
 * from `qc-dashboard.js`. Re-export keeps behavior identical until the
 * QC workbench batch lands its consolidated entry.
 */
export { qcDashboardView as signalQualityView } from './qc-dashboard.js';
