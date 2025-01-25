# Voice Note to Obsidian Router

A simple Fish shell script that routes STT voice notes into an Obsidian vault, based on keywords in voice note. Take your voice notes and have them automatically saved to designated locations.

## What it does

- Watches a directory for transcribed text files
- Routes notes to different Obsidian files based on keywords in content
- Creates separate files with previews for longer notes
- Archives processed files
- Logs all operations

## Setup

1. Update these paths at the start of script to match your system:
```fish
STT_LOCATION        # Where your transcribed files appear
ARCHIVE_FOLDER      # Where to move processed files
ZETTLE_FOLDER       # Your Obsidian vault location
INBOX_NOTE          # Default inbox note
DAILY_NOTES_FOLDER  # Daily notes folder
```

2. Add/modify keywords and target files in `NOTES_MAP` as needed:
```fish
set -a NOTES_MAP "your keyword" "target file path"
```

3. Set up as cronjob to run automatically:
```bash
* * * * * /path/to/to_obsidian.fish
```

## Running Tests

```bash
./test_to_obsidian.fish
```
