#!/bin/bash

LOCATION="/home/mat/Documents/ProgramExperiments/fleetingNotes/main/audioNoteTranscribe/"
cd $LOCATION

for i in *.txt; do
    text=`echo "$i"----VM----"<br>" && cat "$i"`
    JSON_STRING=$(jo -d. action=addNote version=6 params.note.deckName=meh::fleet params.note.modelName=Basic-1e476 params.note.fields.Front="$text")
    curl localhost:8765 -X POST -d "$JSON_STRING"
    mv "$i" ../note_folder/
done

# next things to do:
#       - I need to schedule this script and the whisper script to happen when it makes sense
#       - It'd be nice to control The Tank from this computer; not need to worry about complex relationships and shit.
#           - I get notification / this program is told transcribe is done, then it imports. Seems simple.
