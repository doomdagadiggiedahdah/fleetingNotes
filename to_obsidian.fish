#!/usr/bin/env fish

set -g STT_LOCATION   "/home/mat/Documents/ProgramExperiments/fleetingNotes/main/audioNoteTranscribe/"
set -g ARCHIVE_FOLDER "/home/mat/Documents/ProgramExperiments/fleetingNotes/main/note_folder/"
set -g ZETTLE_FOLDER "/home/mat/Obsidian/ZettleKasten"
set -g INBOX_NOTE "/home/mat/Obsidian/gtd - inbox.md"
set -g LOG_FILE "$ZETTLE_FOLDER/dump_log.md"
set -g LONG_NOTES_FOLDER "$ZETTLE_FOLDER/fleet_notes/voice_memo/"

# Static mappings
set -g KEYWORDS
set -a KEYWORDS "concept digest" "$ZETTLE_FOLDER/concept digest.md"
set -a KEYWORDS "memory dump" "$ZETTLE_FOLDER/memory dump.md"


function log_operation
    set content $argv[1]
    set source $argv[2]
    set target $argv[3]

    echo "- Source: '$source'" >> $LOG_FILE
    echo "- Target: '$target'" >> $LOG_FILE
    echo "- Content: '$content'" >> $LOG_FILE
    echo "" >> $LOG_FILE
end

function append_to_file
    set content $argv[1]
    set source_file $argv[2]
    set target_file $argv[3]

    set char_count (string length "$content")
    echo "" >> "$target_file" # spacer


    if test $char_count -gt 200
        # Create a new markdown file for the full content
        set md_filename (string replace -r '\.txt$' '.md' (basename "$source_file"))
        mkdir -p "$LONG_NOTES_FOLDER"
        echo "$content" > "$LONG_NOTES_FOLDER$md_filename"
        
        # Create truncated preview
        set preview (string sub -l 200 "$content")
        echo "- [[$md_filename]] ----VM----<br>$preview..." >> "$target_file"

        log_operation $preview $source_file $target_file 
    else
        echo "- $source_file ----VM----<br>$content" >> "$target_file"
        log_operation $content $source_file $target_file
    end

end

function handle_keywords
    set content $argv[1]
    set source_file $argv[2]
    
    for i in (seq 1 2 (count $KEYWORDS))
        set keyword $KEYWORDS[$i]
        set target_file $KEYWORDS[(math $i + 1)]
        
	if string match -i -q "*$keyword*" $content
            set extracted (string replace -ri "$keyword\s*" "" $content)
            append_to_file $extracted $source_file $target_file 
            return 0
        end
    end
    return 1
end

function main
    mkdir -p "$ARCHIVE_FOLDER"
    cd $STT_LOCATION

    for source_file in *.txt
        test -f "$source_file"; or continue
        set content (cat "$source_file")
        
        if not handle_keywords "$content" "$source_file"
            append_to_file "$content" "$source_file" "$INBOX_NOTE" 
        end
        
        mv "$source_file" "$ARCHIVE_FOLDER"
    end
end

main
