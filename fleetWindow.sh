#!/bin/bash

LOCATION="/home/mat/Documents/ProgramExperiments/fleetingNotes/main/note_folder/"

NAME=`date +"%Y.%m.%d__%H.%M.%S"`
FILE="$LOCATION"${NAME}
touch $FILE
gedit $FILE


#This helped out a lot https://github.com/seanh/gedit-smart-autosave
#Shit, this may be even better https://gottcode.org/focuswriter/
#look into the autosave thing, reddit mentioned it https://www.reddit.com/r/opensource/comments/44ol6s/a_text_editor_for_linux_that_silently_saves/


#Is the reason that you have to type "./command" vs. "command" because you haven't made an alias for the command?

NOTE_TEXT=$"(cat FILE)"
ONE_MORE=$FILE

# JSON_STRING=$( jq -n \
#         --arg txt "$NOTE_TEXT" \
#         '{"action": "addNote", 
#         "version": 6,
#         "params": {
#             "note": {
#                 "deckName": "fleet", 
#                 "modelName": "Basic-1e476", 
#                 "fields": 
#                     { "Front": "quote test"}
#                 }
#             }
#         }'
# )

JSON_STRING=$(jo -d. action=addNote version=6 params.note.deckName=fleet params.note.modelName=Basic-1e476 params.note.fields.Front=@$FILE)



# '{"action": "addNote", 
#         "version": 6,
#         "params": 
#             {"note": 
#                 { "deckName": "fleet", "modelName": "Basic-1e476", "fields": 
#                     { "Front": "'"$txt"'"}
#                 }
#             }
#         }'

curl localhost:8765 -X POST -d "$JSON_STRING"