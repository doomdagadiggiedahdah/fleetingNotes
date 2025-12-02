#!/bin/bash

# Daemon launcher for transcribe.py
# Handles:
#  - Lock file management (prevents duplicate instances)
#  - Virtual environment activation
#  - Python daemon invocation with retry logic
#
# All file discovery, retry handling, and movement logic is in Python (transcribe.py)

FLEET_DIR="/home/mat/Documents/ProgramExperiments/fleetingNotes"
RECORDING_DIR="${FLEET_DIR}/recordings"
LOCKFILE="/tmp/whisper_loop.lock"
VENV="${FLEET_DIR}/.venv/bin/activate"

check_lock() {
    if [ -e "${LOCKFILE}" ] && kill -0 "$(cat ${LOCKFILE})" 2>/dev/null; then
        echo "Already running with PID $(cat ${LOCKFILE})"
        exit 1
    fi
    # Create lock file and store current process ID
    echo $$ > "${LOCKFILE}"
    # Cleanup the lock file when the script exits
    trap 'rm -f "${LOCKFILE}"; exit' INT TERM EXIT
}

main() {
    cd "${RECORDING_DIR}" || exit 1
    check_lock
    source "${VENV}" || exit 1
    python "${FLEET_DIR}/transcribe.py" --daemon
}

main
