# Error Handling & File Validation

## Audio File Corruption Detection

```mermaid
flowchart TD
    START[Audio File] --> CHECK[is_audio_file_corrupted]
    
    subgraph "FFProbe Validation"
        CHECK --> FFPROBE[Run ffprobe -v quiet<br/>-show_format -show_streams]
        
        FFPROBE --> TIMEOUT{Timeout<br/>after 10s?}
        TIMEOUT -->|Yes| ERR1[Log: Timeout error]
        ERR1 --> CORRUPT1[Return: True - Corrupted]
        
        TIMEOUT -->|No| EXITCODE{Exit code<br/>!= 0?}
        EXITCODE -->|Yes| ERR2[Log: ffprobe error]
        ERR2 --> CORRUPT2[Return: True - Corrupted]
        
        EXITCODE -->|No| STDOUT{Has output<br/>content?}
        STDOUT -->|No| ERR3[Log: No format/stream info]
        ERR3 --> CORRUPT3[Return: True - Corrupted]
        
        STDOUT -->|Yes| VALID[Return: False - Valid file]
    end
    
    subgraph "Exception Handling"
        FFPROBE -.->|ffprobe not found| NOTFOUND[Log: ffprobe not found]
        NOTFOUND --> ASSUME1[Return: False - Assume OK]
        
        FFPROBE -.->|Other exception| EXCEPT[Log: Unexpected error]
        EXCEPT --> ASSUME2[Return: False - Assume OK]
    end
    
    CORRUPT1 --> RESULT1[File marked as corrupted]
    CORRUPT2 --> RESULT1
    CORRUPT3 --> RESULT1
    VALID --> RESULT2[File ready for processing]
    ASSUME1 --> RESULT2
    ASSUME2 --> RESULT2
    
    style CHECK fill:#e1f5ff
    style CORRUPT1 fill:#ffe1e1
    style CORRUPT2 fill:#ffe1e1
    style CORRUPT3 fill:#ffe1e1
    style VALID fill:#e1ffe1
```

## Transcription Error Flow

```mermaid
flowchart TD
    START[process_audio] --> TRANS[transcribe_audio]
    
    subgraph "File Validation Chain"
        TRANS --> EXISTS{File exists?}
        EXISTS -->|No| ERR1[FileNotFoundError]
        ERR1 --> RETURN1[Return: None]
        
        EXISTS -->|Yes| EMPTY{File size > 0?}
        EMPTY -->|No| ERR2[ValueError: Empty file]
        ERR2 --> RETURN2[Return: None]
        
        EMPTY -->|Yes| CORR{is_audio_file_corrupted?}
        CORR -->|Yes| ERR3[ValueError: Corrupted]
        ERR3 --> RETURN3[Return: None]
        
        CORR -->|No| WHISPER[Call whisper.transcribe]
    end
    
    subgraph "Whisper Processing"
        WHISPER --> RESULT{Has 'text'<br/>in result?}
        RESULT -->|No| ERR4[TranscriptionError]
        ERR4 --> RETURN4[Return: None]
        
        RESULT -->|Yes| SUCCESS[Return: transcribed text]
    end
    
    RETURN1 --> HANDLER
    RETURN2 --> HANDLER
    RETURN3 --> HANDLER
    RETURN4 --> HANDLER
    
    subgraph "Error Handler"
        HANDLER --> LOG[Log error message]
        LOG --> MKDIR[Ensure .corrupted/ exists]
        MKDIR --> MOVE[Move file to .corrupted/]
        MOVE --> WARN[Log warning: File moved]
        WARN --> SKIP[Skip further processing]
    end
    
    SUCCESS --> ROUTE[Continue to content routing]
    
    style ERR1 fill:#ffe1e1
    style ERR2 fill:#ffe1e1
    style ERR3 fill:#ffe1e1
    style ERR4 fill:#ffe1e1
    style SUCCESS fill:#e1ffe1
```

## Logging System

```mermaid
flowchart LR
    subgraph "Dual Logger Configuration"
        A[logging.basicConfig] --> B[FileHandler]
        A --> C[StreamHandler]
    end
    
    B --> D[processing_errors.log]
    C --> E[stdout/console]
    
    subgraph "Log Levels"
        L1[INFO] --> L1A[Normal operations]
        L2[WARNING] --> L2A[Corrupted files moved]
        L3[ERROR] --> L3A[Processing failures]
    end
    
    subgraph "Operation Log"
        O[log_operation function] --> OF[dump_log.md]
    end
    
    OF --> OFD[Contains:]
    OFD --> OFD1[Timestamp]
    OFD --> OFD2[Source file]
    OFD --> OFD3[Target destination]
    OFD --> OFD4[Content written]
    
    style D fill:#fff4e1
    style E fill:#e1f5ff
    style OF fill:#e1ffe1
```

## Archive & Cleanup Flow

```mermaid
sequenceDiagram
    participant A as Audio File
    participant T as Transcription
    participant R as Router
    participant W as Writer
    participant S as Storage
    
    Note over A: In recordings/
    
    A->>T: Process file
    
    alt Transcription Failed
        T->>T: Log error
        T->>S: Move to .corrupted/
        Note over S: recordings/.corrupted/file.m4a
        T-->>A: Processing ended
    else Transcription Succeeded
        T->>R: Route content
        R->>W: Write to destination
        
        alt skip_archive = False
            W->>S: Move to .archive/
            Note over S: recordings/.archive/file.m4a
        else skip_archive = True
            W->>W: Skip archiving
            Note over A: File stays in recordings/
        end
        
        W->>T: Log success
    end
    
    Note over S: Permanent storage
```

## Exception Hierarchy

```mermaid
classDiagram
    Exception <|-- TranscriptionError
    Exception <|-- FileNotFoundError
    Exception <|-- ValueError
    Exception <|-- TimeoutExpired
    
    class TranscriptionError {
        <<Custom Exception>>
        +message: str
    }
    
    class ProcessingScenarios {
        FileNotFoundError: Audio file missing
        ValueError: Empty or corrupted file
        TimeoutExpired: FFProbe timeout
        TranscriptionError: Whisper failed
    }
    
    TranscriptionError --> ProcessingScenarios: Used in
    
    note for TranscriptionError "Raised when Whisper model\nfails to produce text output"
```

## Error Recovery Strategy

```mermaid
flowchart TD
    ERROR[Error Detected] --> TYPE{Error Type}
    
    TYPE -->|File Not Found| A1[Log error]
    A1 --> A2[Continue to next file]
    
    TYPE -->|Empty File| B1[Log error]
    B1 --> B2[Move to .corrupted/]
    B2 --> B3[Continue to next file]
    
    TYPE -->|Corrupted Audio| C1[Log warning]
    C1 --> C2[Move to .corrupted/]
    C2 --> C3[Continue to next file]
    
    TYPE -->|Transcription Failed| D1[Log error]
    D1 --> D2[Move to .corrupted/]
    D2 --> D3[Continue to next file]
    
    TYPE -->|Write Failed| E1[Log error]
    E1 --> E2[Archive file anyway]
    E2 --> E3[Continue to next file]
    
    A2 --> LOOP[Return to main loop]
    B3 --> LOOP
    C3 --> LOOP
    D3 --> LOOP
    E3 --> LOOP
    
    LOOP --> NEXT[Process next audio file]
    
    style ERROR fill:#ffe1e1
    style LOOP fill:#e1ffe1
```
