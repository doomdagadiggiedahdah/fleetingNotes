# System Overview: Voice Memo Transcription Pipeline

## High-Level Architecture

```mermaid
flowchart TB
    subgraph "Entry Point"
        A[whisper_loop.sh] -->|Monitors| B[recordings/ directory]
    end
    
    subgraph "Lock Management"
        A -->|Check| C{Lock file exists?}
        C -->|Yes| D[Exit - Already running]
        C -->|No| E[Create lock file]
    end
    
    subgraph "File Monitoring Loop"
        E --> F{.m4a files found?}
        F -->|No| G[Sleep 10 seconds]
        G --> F
        F -->|Yes| H[Cleanup temp files]
        H --> I[Activate Python venv]
        I --> J[Execute transcribe.py]
    end
    
    subgraph "Transcription Pipeline"
        J --> K[Load Whisper Model]
        K --> L[Process all audio files]
        L --> M[Generate transcriptions]
        M --> N[Route content by keywords]
        N --> O[Append to target notes]
        O --> P[Archive audio files]
    end
    
    P --> F
    
    style A fill:#e1f5ff
    style J fill:#fff4e1
    style K fill:#ffe1e1
```

## Process Flow Summary

1. **Shell Script (`whisper_loop.sh`)**: Continuously monitors the recordings directory
2. **Lock Prevention**: Ensures only one instance runs at a time
3. **File Detection**: Checks for `.m4a` audio files every 10 seconds
4. **Python Invocation**: Triggers the transcription pipeline when files are found
5. **Content Processing**: Transcribes, routes, and archives voice memos
6. **Loop Continuation**: Returns to monitoring after processing completes
