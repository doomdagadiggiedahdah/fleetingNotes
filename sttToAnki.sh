#!/bin/bash

LOCATION="/home/mat/Documents/ProgramExperiments/fleetingNotes/main/audioNoteTranscribe/"
cd $LOCATION

for i in *.txt; do
    text=`echo "$i"----VM----"<br>" && cat "$i"`
    JSON_STRING=$(jo -d. action=addNote version=6 params.note.deckName=meh::fleet params.note.modelName=Basic-1e476 params.note.fields.Front="$text")
    curl localhost:8765 -X POST -d "$JSON_STRING"
    mv "$i" ../note_folder/
done










## I'm looking at this (2024.09.28) and realizing that I just didn't know how 
## to create a function in BASH, instead I just made a whole new file.
## I want to keep this here for archival's sake. Kinda cute.
## I was certainly reasoning from scratch, 
## but there's a lot to learn from others. 
## Love you Mat.


# next things to do:
#       - I need to schedule this script and the whisper script to happen when it makes sense
#       - It'd be nice to control The Tank from this computer; not need to worry about complex relationships and shit.
#           - I get notification / this program is told transcribe is done, then it imports. Seems simple.


## incorporating the tool usage.
#    - This is where texts are read and operated on, enter the operation.
#    - Needs to:
#        - search in text for a keyword (decide on keyword)
#        - if present, send to python script that handles the routing and tool usage
#        - then what with the text? I can save it to an archive if I want to, I don't know how useful this'll be. 
#        - Done.
