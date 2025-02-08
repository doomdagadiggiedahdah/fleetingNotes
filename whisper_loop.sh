#!/bin/bash

LOCATION="/home/mat/Documents/ProgramExperiments/fleetingNotes/recordings"
cd $LOCATION


# looking back at this, i see i could've added an idiom, something about the check.
# but it's cool to see relics of the past, esp when they worked lool

while true; do
    # get rid of those pesky interrupted files >:(
    find . -type f -name "*_deleted_*" -delete
    find . -type f -name "*appended*" -delete

    if ls | grep -E ".*\.m4a$"
    then
        echo "transcribing..."
        source ../venv/bin/activate
        python3 ../transcribe.py

    else
        echo "sleeping"
        sleep 10
    fi
done