# whisper_loop.sh - Bash Script Details

## Script Structure

```mermaid
flowchart TD
    START([Script Starts]) --> MAIN[main function]
    
    MAIN --> CD{cd to recordings?}
    CD -->|Failed| EXIT1[Exit with code 1]
    CD -->|Success| LOCK[check_lock function]
    
    subgraph "Lock Management (check_lock)"
        LOCK --> LOCKEX{Lock file exists<br/>AND process alive?}
        LOCKEX -->|Yes| ECHO[Echo: Already running]
        ECHO --> EXIT2[Exit with code 1]
        LOCKEX -->|No| CREATE[Create lock file<br/>with current PID]
        CREATE --> TRAP[Set trap to cleanup<br/>on INT/TERM/EXIT]
    end
    
    TRAP --> PROC[process_recordings function]
    
    subgraph "Main Loop (process_recordings)"
        PROC --> LOOP{Infinite while loop}
        LOOP --> CLEAN1[Delete *_deleted_* files]
        CLEAN1 --> CLEAN2[Delete *appended* files]
        CLEAN2 --> CHECK{ls | grep .m4a<br/>files found?}
        
        CHECK -->|No| SLEEP[Sleep 10 seconds]
        SLEEP --> LOOP
        
        CHECK -->|Yes| ECHO2[Echo: transcribing...]
        ECHO2 --> VENV[Source ../.venv/bin/activate]
        VENV --> PY[python3 ../transcribe.py]
        PY --> LOOP
    end
    
    style LOCK fill:#ffe1e1
    style PROC fill:#e1ffe1
    style CHECK fill:#fff4e1
    style PY fill:#e1f5ff
```

## Key Components

### 1. Lock File Mechanism
- **Purpose**: Prevents multiple instances from running simultaneously
- **Location**: `/tmp/whisper_loop.lock`
- **Contains**: Process ID (PID) of running instance
- **Cleanup**: Trap ensures lock file is removed on exit

### 2. File Cleanup
Removes interrupted/incomplete recordings:
- `*_deleted_*` - Partially deleted files
- `*appended*` - Corrupted append operations

### 3. Polling Cycle
- **Check Frequency**: Every 10 seconds
- **Detection**: Uses `grep -E ".*\.m4a$"` to find audio files
- **Action**: Activates venv and launches Python script when files detected

### 4. Directory Structure
```
/home/mat/Documents/ProgramExperiments/fleetingNotes/
├── whisper_loop.sh (this script)
├── transcribe.py (called by this script)
├── .venv/ (Python virtual environment)
└── recordings/ (working directory)
    ├── *.m4a (audio files to process)
    └── .archive/ (processed files moved here)
```
