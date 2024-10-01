#!/bin/bash

LOCATION="/home/mat/Obsidian/fleet_notes/fleet/"
RESEARCH_ARCHIVE="/home/mat/Documents/ProgramExperiments/fleetingNotes/main/research_archive/"

FILE_NAME=$(date +"%Y.%m.%d__%H.%M.%S.md")
OBS_DATE=$(date +"%Y.%m.%d - %H.%M.%S")
FILE="$LOCATION$FILE_NAME"
touch "$FILE"
gedit "$FILE" & wait $!

obsidian_note_template="""\
$OBS_DATE
Status: 
Tags: #fleet_note

"""

if [[ ! -s "$FILE" ]]; then  # Check if the file is empty
    echo "nothing here"
    rm "$FILE"
else
    echo 'grab'
    # Prepend the template to the file
    { echo "$obsidian_note_template"; cat "$FILE"; } > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"
fi
