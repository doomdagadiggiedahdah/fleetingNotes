#!/bin/bash

LOCATION="/home/mat/Obsidian/fleet_notes/fleet/"
RESEARCH_ARCHIVE="/home/mat/Documents/ProgramExperiments/fleetingNotes/main/research_archive/"

FILE_NAME=$(date +"%Y.%m.%d__%H.%M.%S.md")
OBS_DATE=$(date +"%Y.%m.%d - %H.%M.%S")
FILE="$LOCATION$FILE_NAME"
touch "$FILE"
gedit "$FILE"

obsidian_note_template="""\
$OBS_DATE
Status: 
Tags: #fleet_note

"""

echo "case"
case "$FILE" in
    "") # Empty, deletes empty note too.
        echo "nothing here"
        rm "$FILE"
        ;;

    *) # grabs everything ❤️ 
        echo 'grab'
        # Prepend the template to the file
        { echo "$obsidian_note_template"; cat "$FILE"; } > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"
        # rm "$FILE.tmp"
        ;;
esac
