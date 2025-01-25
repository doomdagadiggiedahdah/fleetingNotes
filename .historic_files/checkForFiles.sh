#!/bin/bash

LOCATION="/home/mat/Documents/ProgramExperiments/fleetingNotes/main/audioNoteTranscribe/"
cd $LOCATION
while true; do
    if ls | grep -E ".*\.txt$"
    then 
        echo "sending to Anki"
        ../sttToAnki.sh
    else 
        echo "constant sleep"
        sleep 10
        continue
    fi
done