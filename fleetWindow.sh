#!/bin/bash

LOCATION="/home/mat/Documents/ProgramExperiments/fleetingNotes/main/note_folder/"
RESEARCH_ARCHIVE="/home/mat/Documents/ProgramExperiments/fleetingNotes/main/research_archive/"

NAME=`date +"%Y.%m.%d__%H.%M.%S"`
FILE="$LOCATION"${NAME}
touch $FILE
gedit $FILE

file_contents=$(<$FILE)

#This helped out a lot https://github.com/seanh/gedit-smart-autosave
#Shit, this may be even better https://gottcode.org/focuswriter/
#look into the autosave thing, reddit mentioned it https://www.reddit.com/r/opensource/comments/44ol6s/a_text_editor_for_linux_that_silently_saves/

case "$file_contents" in
    "") # Empty, deletes empty note too.
        echo "nothing here"
        rm $FILE
        ;;

    *"obsidian inbox"*) # Sends to Obs folder, removes the 'obsdian inbox' (for cleaner look). Espanso with :inb
        echo "$file_contents" | sed 's/obsidian inbox//g' >> /home/mat/Obsidian/ZettleKasten/"Giant Inbox.md"
        ;;

    *"#AQ"*) ### TODO This needs the cue to add to Questions
        python3 "/home/mat/Documents/ProgramExperiments/fleetingNotes/main/perp_proc.py" $FILE
        file_contents=$(<$FILE)

        JSON_STRING=$(jo -d. action=addNote version=6 params.note.deckName=Questions params.note.modelName=Basic-1e476 params.note.fields.Front=@$FILE) # Are there other things I  want to add?
        curl localhost:8765 -X POST -d "$JSON_STRING"
        mv $FILE $RESEARCH_ARCHIVE
        ;;

    *) # Regular note, the OG. This has to be last because it's a wildcard, everything will get picked up.
        # Note: the @ in @$FILE tells jo to read the contents of the file
        JSON_STRING=$(jo -d. action=addNote version=6 params.note.deckName=meh::fleet params.note.modelName=Basic-1e476 params.note.fields.Front=@$FILE) 
        curl localhost:8765 -X POST -d "$JSON_STRING"
        ;;

esac

#so you store the text in a varible, or the command that spits out the text in the file
#then you steal the jo line from above, and use the POST request
