#!/bin/bash

LOCATION="/home/mat/Documents/ProgramExperiments/fleetingNotes/recordings"
LOCKFILE="/tmp/whisper_loop.lock"

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

process_recordings() {
    while true; do
        # get rid of those pesky interrupted files >:(
        # TODO: check if file handline is already being done
        # in the python script

        find . -type f -name "*_deleted_*" -delete
        find . -type f -name "*appended*" -delete

        if ls | grep -E ".*\.m4a$"; then
            echo "transcribing..."
            source ../.venv/bin/activate
            python3 ../transcribe.py
        else
            echo "sleeping"
            sleep 10
        fi
    done
}

main() {
    cd "$LOCATION" || exit 1
    check_lock
    process_recordings
}

main

# looking back at this, i see i could've added an idiom, something about the check.
# but it's cool to see relics of the past, esp when they worked lool
