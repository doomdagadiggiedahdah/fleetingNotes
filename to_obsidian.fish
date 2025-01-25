#!/usr/bin/env fish

set -g STT_LOCATION   "/home/mat/Documents/ProgramExperiments/fleetingNotes/main/audioNoteTranscribe/"
set -g ARCHIVE_FOLDER "/home/mat/Documents/ProgramExperiments/fleetingNotes/main/note_folder/"
set -g ZETTLE_FOLDER "/home/mat/Obsidian/ZettleKasten/"
set -g INBOX_NOTE "/home/mat/Obsidian/gtd - inbox.md"
set -g LOG_FILE "$ZETTLE_FOLDER/dump_log.md"

# Static mappings
set -g KEYWORDS
set -a KEYWORDS "concept digest" "$ZETTLE_FOLDER/concept digest.md"
set -a KEYWORDS "memory dump" "$ZETTLE_FOLDER/memory dump.md"

function log_operation
    set source $argv[1]
    set target $argv[2]
    set content $argv[3]
    set timestamp (date '+%Y-%m-%d %H:%M:%S')
    
    printf "[%s] Source: \"%s\"\n-> Target: \"%s\"\n-> Content: \"%s\"\n\n" \
        $timestamp $source $target (string sub -l 50 $content) >> $LOG_FILE
end

function append_to_file
    set content $argv[1]
    set target_file $argv[2]
    set source_file $argv[3]
    
    echo "" >> "$target_file"
    echo "- $source_file ----VM----<br>$content" >> "$target_file"
    log_operation $source_file $target_file $content
end

function handle_keywords
    set content $argv[1]
    set source_file $argv[2]
    
    for i in (seq 1 2 (count $KEYWORDS))
        set keyword $KEYWORDS[$i]
        set target_file $KEYWORDS[(math $i + 1)]
        
	if string match -i -q "*$keyword*" $content
            set extracted (string replace -ri "$keyword\s*" "" $content)
            append_to_file $extracted $target_file $source_file
            return 0
        end
    end
    return 1
end

function send_to_inbox
    set content $argv[1]
    set filename $argv[2]
    
    echo "" >> "$INBOX_NOTE"
    set formatted_text "- $filename ----VM----<br>$content"
    log_operation $filename $INBOX_NOTE $content
    echo "$formatted_text" >> "$INBOX_NOTE"
end

function main
    mkdir -p "$ARCHIVE_FOLDER"
    cd $STT_LOCATION

    for source_file in *.txt
        test -f "$source_file"; or continue
        set content (cat "$source_file")
        
        if not handle_keywords "$content" "$source_file"
            send_to_inbox "$content" "$source_file"
        end
        
        mv "$source_file" "$ARCHIVE_FOLDER"
    end
end

main
