#!/usr/bin/env bash
set -e

# --- CONSTANTS ---
NETWORK_NAME="sonar-net-dev"
SONAR_CONTAINER="sonarqube-server-ephemeral"
SONAR_IMAGE="sonarqube:community"
SCANNER_IMAGE="sonarsource/sonar-scanner-cli:latest"
SONAR_PORT="9000"
PROJECT_KEY="js-web-project"

# Credentials
DEFAULT_USER="admin"
DEFAULT_PASS="admin"
SECURE_PASS="NewStrongPass123!"

# --- STYLING ---
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${BLUE}[ARCHITECT]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# --- PHASE 1: PREREQUISITES ---
log "Phase 1: Environment Check"

# Kernel Check
CURRENT_MAP_COUNT=$(sysctl -n vm.max_map_count)
REQUIRED_MAP_COUNT=262144
if [ "$CURRENT_MAP_COUNT" -lt "$REQUIRED_MAP_COUNT" ]; then
    log "Escalating privileges to set vm.max_map_count..."
    sudo sysctl -w vm.max_map_count=$REQUIRED_MAP_COUNT
fi

# Network Check (Idempotent)
if docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    warn "Network '$NETWORK_NAME' already exists."
else
    docker network create "$NETWORK_NAME" > /dev/null
    success "Network '$NETWORK_NAME' created."
fi

# --- PHASE 2: CONTAINER STATE RESOLUTION ---
log "Phase 2: SonarQube Container Check"

if [ "$(docker ps -q -f name=$SONAR_CONTAINER)" ]; then
    success "SonarQube container is already running. Skipping boot sequence."
else
    if [ "$(docker ps -aq -f name=$SONAR_CONTAINER)" ]; then
        warn "Found stopped container. Restarting..."
        docker start "$SONAR_CONTAINER" > /dev/null
    else
        log "Booting new SonarQube instance..."
        docker run -d --rm \
            --name "$SONAR_CONTAINER" \
            --network "$NETWORK_NAME" \
            -p "$SONAR_PORT:9000" \
            -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true \
            "$SONAR_IMAGE" > /dev/null
    fi

    # Wait for Health (Only needed if we just started/restarted)
    log "Waiting for API availability..."
    RETRIES=0
    MAX_RETRIES=60
    while true; do
        # We try to hit the status endpoint unauthenticated first just to see if server responds
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$SONAR_PORT/api/system/status || echo "000")
        
        if [ "$HTTP_CODE" -eq 200 ]; then
            STATUS=$(curl -s -u "$DEFAULT_USER:$DEFAULT_USER" http://localhost:$SONAR_PORT/api/system/status | grep -o '"status":"UP"' || true)
             # If auth fails here, it just means password changed, but server is UP.
             # If auth works, we check status.
             # We assume if we get a 200/401 from the port, the server is essentially there.
             # But strictly, we wait for "UP".
             if [[ "$STATUS" == '"status":"UP"' ]] || [[ "$HTTP_CODE" -eq 401 ]]; then
                 success "SonarQube is UP!"
                 break
             fi
        fi

        RETRIES=$((RETRIES+1))
        if [ $RETRIES -ge $MAX_RETRIES ]; then
            error "Timeout waiting for SonarQube."
            exit 1
        fi
        echo -ne "."
        sleep 2
    done
    echo ""
fi

# --- PHASE 3: AUTH RESOLUTION ---
log "Phase 3: Authentication Resolution"

# Strategy:
# 1. Try to generate a token with SECURE_PASS. If success -> We are good.
# 2. If fail (401) -> Try to change password using DEFAULT_PASS.
#    If that works -> Generate token.
# 3. If fail -> We are locked out.

generate_token() {
    local PASS=$1
    local NAME="ci-run-$(date +%s)"
    curl -s -X POST -u "$DEFAULT_USER:$PASS" \
        "http://localhost:$SONAR_PORT/api/user_tokens/generate?name=$NAME"
}

# Attempt 1: Assume password is already secure
log "Attempting authentication with secure password..."
TOKEN_RESPONSE=$(generate_token "$SECURE_PASS")
TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || true)

if [ -n "$TOKEN" ]; then
    success "Authenticated successfully with existing secure password."
else
    # Attempt 2: Assume password is default (Fresh Install)
    warn "Secure auth failed. Attempting default credentials..."
    
    # Change Password
    CHANGE_PASS_RES=$(curl -s -X POST -u "$DEFAULT_USER:$DEFAULT_PASS" \
        "http://localhost:$SONAR_PORT/api/users/change_password?login=$DEFAULT_USER&previousPassword=$DEFAULT_PASS&password=$SECURE_PASS")
    
    # Check if change was successful (Response is usually empty 204 or json)
    # We simply try to generate the token again with the NEW password
    
    TOKEN_RESPONSE=$(generate_token "$SECURE_PASS")
    TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || true)
    
    if [ -n "$TOKEN" ]; then
        success "Password rotated and authenticated successfully."
    else
        error "Authentication Failed. Could not log in with Default OR Secure password."
        error "Debug Info: $TOKEN_RESPONSE"
        exit 1
    fi
fi

# --- PHASE 4: EXECUTION ---
log "Phase 4: Running Code Analysis (Scanner)"

docker run --rm \
    --network "$NETWORK_NAME" \
    -v "$(pwd):/usr/src" \
    -e SONAR_HOST_URL="http://$SONAR_CONTAINER:9000" \
    -e SONAR_TOKEN="$TOKEN" \
    "$SCANNER_IMAGE" \
    -Dsonar.projectKey="$PROJECT_KEY"

# --- RESULT ---
echo ""
echo "-----------------------------------------------------------"
success "Analysis Complete."
echo -e "${BOLD}View Report Here:${NC} http://localhost:$SONAR_PORT/dashboard?id=$PROJECT_KEY"
echo -e "${BOLD}Login:${NC} $DEFAULT_USER / $SECURE_PASS"
echo "-----------------------------------------------------------"