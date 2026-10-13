package api

import (
	"fmt"
	"sort"
	"strings"

	"github.com/herruzo/stream-analyzer/helper/internal/session"
)

// renderPrometheus produces the Prometheus text exposition format (0.0.4)
// for the helper and its sessions (capability plan Tier-3 #13). Pure so it
// can be tested without a live server; exposed at GET /metrics.
func renderPrometheus(sessions []session.Summary, helperVersion string, platform string, activeSessions int) string {
	var b strings.Builder

	b.WriteString("# HELP stream_analyzer_helper_up Helper running (always 1).\n")
	b.WriteString("# TYPE stream_analyzer_helper_up gauge\n")
	b.WriteString("stream_analyzer_helper_up 1\n")

	writeGauge := func(name, helpText string, value float64, labels map[string]string) {
		fmt.Fprintf(&b, "# HELP %s %s\n", name, helpText)
		fmt.Fprintf(&b, "# TYPE %s gauge\n", name)
		fmt.Fprintf(&b, "%s%s %g\n", name, formatLabels(labels), value)
	}

	writeGauge("stream_analyzer_helper_active_sessions", "Sessions currently connected or listening.", float64(activeSessions), nil)

	// Sort sessions by id for stable output.
	sorted := append([]session.Summary(nil), sessions...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].ID < sorted[j].ID })

	for _, s := range sorted {
		labels := map[string]string{
			"session":   s.ID,
			"mode":      s.Mode,
			"encrypted": fmt.Sprintf("%t", s.Encrypted),
		}
		writeGauge("srt_session_connected", "Session is connected (1) or not (0).", boolToFloat(isConnected(s.Status)), labels)
		writeGauge("srt_session_segments", "Segments currently retained in the live window.", float64(s.Segments), labels)
		writeGauge("srt_session_bytes", "Bytes received in this session.", float64(s.Bytes), labels)

		if s.Latest == nil {
			continue
		}
		l := s.Latest
		writeGauge("srt_rtt_ms", "Smoothed round-trip time, milliseconds.", l.RTTMS, labels)
		writeGauge("srt_mbps_recv_rate", "Receive rate, megabits per second.", l.MbpsRecv, labels)
		writeGauge("srt_mbps_send_rate", "Send rate, megabits per second.", l.MbpsSend, labels)
		writeGauge("srt_mbps_link_capacity", "Estimated link capacity, megabits per second.", l.MbpsLink, labels)
		writeGauge("srt_pkt_recv_total", "Packets received (includes retransmissions).", float64(l.PktRecv), labels)
		writeGauge("srt_pkt_recv_lost_total", "Packets received but not delivered.", float64(l.PktRecvLSD), labels)
		writeGauge("srt_pkt_recv_loss_total", "Packets detected missing at the receiver.", float64(l.PktRecvLS), labels)
		writeGauge("srt_pkt_retrans_total", "Retransmitted packets sent by the SRT sender.", float64(l.PktRetrans), labels)
		writeGauge("srt_pkt_recv_drop_total", "Packets dropped by the receiver (includes too-late).", float64(l.PktRecvDr), labels)
		writeGauge("srt_pkt_recv_belated_total", "Packets that arrived too late.", float64(l.PktBelated), labels)
		writeGauge("srt_pkt_recv_undecrypt_total", "Packets that failed decryption.", float64(l.PktUndec), labels)
		writeGauge("srt_ms_send_buf", "Timespan of packets in the sender buffer, ms.", float64(l.MsSendBuf), labels)
		writeGauge("srt_ms_recv_buf", "Timespan of packets in the receiver buffer, ms.", float64(l.MsRecvBuf), labels)
		writeGauge("srt_ms_rcv_tsbpd_delay", "Negotiated receiver TSBPD delay, ms.", float64(l.MsRcvTsbpd), labels)
		writeGauge("srt_ms_snd_tsbpd_delay", "Receiver TSBPD delay seen by the sender, ms.", float64(l.MsSndTsbpd), labels)
		writeGauge("srt_loss_rate_percent", "Percentage of retransmitted vs received data.", l.LossRate, labels)
		writeGauge("srt_encrypted", "Link encryption negotiated (1) or not (0).", boolToFloat(l.Encrypted), labels)
	}

	// Info metric with build labels.
	fmt.Fprintf(&b, "# HELP stream_analyzer_helper_build Build info.\n# TYPE stream_analyzer_helper_build gauge\n")
	fmt.Fprintf(&b, "stream_analyzer_helper_build{version=%q,platform=%q} 1\n", helperVersion, platform)
	return b.String()
}

func formatLabels(labels map[string]string) string {
	if len(labels) == 0 {
		return ""
	}
	keys := make([]string, 0, len(labels))
	for k := range labels {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, k := range keys {
		parts = append(parts, fmt.Sprintf("%s=%q", k, labels[k]))
	}
	return "{" + strings.Join(parts, ",") + "}"
}

func boolToFloat(b bool) float64 {
	if b {
		return 1
	}
	return 0
}

func isConnected(status string) bool {
	return status == session.StatusConnected || status == session.StatusListening
}
