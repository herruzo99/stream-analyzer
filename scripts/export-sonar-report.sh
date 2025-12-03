#!/usr/bin/env bash
set -e

# --- CONFIGURATION ---
SONAR_HOST="http://localhost:9000"
PROJECT_KEY="js-web-project"
USER="admin"
PASS="NewStrongPass123!" # Must match the password set in previous steps

# --- OUTPUT FILES ---
ISSUES_FILE="sonar_issues_report.csv"
HOTSPOTS_FILE="sonar_hotspots_report.csv"

# --- STYLING ---
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'
log() { echo -e "${BLUE}[EXPORTER]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# --- PREREQUISITES ---
if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 is required to convert JSON to CSV."
    exit 1
fi

log "Connecting to SonarQube at $SONAR_HOST..."

# --- 1. FETCH ISSUES (Bugs, Vulnerabilities, Code Smells) ---
log "Fetching Open Issues..."
# API: api/issues/search
# We fetch status=OPEN,CONFIRMED,REOPENED and everything assigned to the project
curl -s -u "$USER:$PASS" \
     "$SONAR_HOST/api/issues/search?componentKeys=$PROJECT_KEY&statuses=OPEN,CONFIRMED,REOPENED&ps=500" \
     > raw_issues.json

# --- 2. FETCH SECURITY HOTSPOTS ---
log "Fetching Security Hotspots..."
# API: api/hotspots/search
# We fetch status=TO_REVIEW
curl -s -u "$USER:$PASS" \
     "$SONAR_HOST/api/hotspots/search?projectKey=$PROJECT_KEY&status=TO_REVIEW&ps=500" \
     > raw_hotspots.json

# --- 3. CONVERT TO CSV (Python Embedded) ---
log "Processing data into CSV format..."

python3 -c "
import json
import csv
import sys

def safe_get(dct, *keys):
    for key in keys:
        try:
            dct = dct[key]
        except (KeyError, TypeError):
            return ''
    return dct

# --- PROCESS ISSUES ---
try:
    with open('raw_issues.json', 'r') as f:
        data = json.load(f)

    with open('$ISSUES_FILE', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        # Header
        writer.writerow(['Severity', 'Type', 'Component', 'Line', 'Message', 'Rule'])
        
        for issue in data.get('issues', []):
            writer.writerow([
                issue.get('severity', ''),
                issue.get('type', ''),
                issue.get('component', ''),
                issue.get('line', ''),
                issue.get('message', ''),
                issue.get('rule', '')
            ])
    print('-> Issues exported to $ISSUES_FILE')
except Exception as e:
    print(f'Error processing issues: {e}')

# --- PROCESS HOTSPOTS ---
try:
    with open('raw_hotspots.json', 'r') as f:
        data = json.load(f)

    with open('$HOTSPOTS_FILE', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        # Header
        writer.writerow(['Category', 'Vulnerability Probability', 'Component', 'Line', 'Message'])
        
        for hot in data.get('hotspots', []):
            writer.writerow([
                hot.get('securityCategory', ''),
                hot.get('vulnerabilityProbability', ''),
                hot.get('component', ''),
                hot.get('line', ''),
                hot.get('message', '')
            ])
    print('-> Hotspots exported to $HOTSPOTS_FILE')
except Exception as e:
    print(f'Error processing hotspots: {e}')
"

# --- CLEANUP ---
rm raw_issues.json raw_hotspots.json
success "Export Complete."