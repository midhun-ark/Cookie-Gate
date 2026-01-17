#!/bin/bash

# Base Directory
BASE_DIR="/Users/midhunarc/Cookie-Gate"

# Admin Portal Paths
ADMIN_SERVER="$BASE_DIR/Admin Portal/apps/server"
ADMIN_UI="$BASE_DIR/Admin Portal/apps/admin-ui"

# Tenant Platform Paths
TENANT_SERVER="$BASE_DIR/Tenant Platform/apps/server"
TENANT_UI="$BASE_DIR/Tenant Platform/apps/tenant-ui"

# Function to run command in new terminal window
run_in_new_terminal() {
    DIR=$1
    CMD=$2
    NAME=$3
    osascript -e "tell application \"Terminal\" to do script \"cd '$DIR' && echo 'Starting $NAME...' && $CMD\""
}

echo "Starting all services..."

# 1. Admin Backend
run_in_new_terminal "$ADMIN_SERVER" "npm run dev" "Admin Backend"

# 2. Admin Frontend
run_in_new_terminal "$ADMIN_UI" "npm run dev" "Admin Frontend"

# 3. Tenant Backend
run_in_new_terminal "$TENANT_SERVER" "npm run dev" "Tenant Backend"

# 4. Tenant Frontend
run_in_new_terminal "$TENANT_UI" "npm run dev" "Tenant Frontend"

echo "All services initiated in separate terminal windows."
