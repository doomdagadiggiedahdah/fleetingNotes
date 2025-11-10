# Voice Memo Transcription System - Documentation

Comprehensive Mermaid diagrams explaining the architecture and operation of the voice memo transcription pipeline.

## 📚 Documentation Index

### 1. [System Overview](./system-overview.md)
**Start here** for a high-level understanding of how the system works.
- System architecture diagram
- Process flow between `whisper_loop.sh` and `transcribe.py`
- Main component interactions

### 2. [Bash Script Details - whisper_loop.sh](./whisper-loop-details.md)
Deep dive into the shell script that monitors and triggers processing.
- Script execution flow
- Lock file mechanism
- Polling cycle and file cleanup
- Directory structure

### 3. [Python Architecture - transcribe.py](./transcribe-architecture.md)
Detailed look at the Python transcription pipeline.
- Class structure and relationships
- Main execution flow
- Directory mapping
- Component responsibilities

### 4. [Content Routing System](./content-routing.md)
How transcribed content is intelligently routed to different notes.
- Keyword detection logic
- Routing decision tree
- Content length handling (short vs. long notes)
- Daily note special handling
- Reminder processing

### 5. [Error Handling & Validation](./error-handling.md)
System resilience and error recovery mechanisms.
- Audio file corruption detection (FFProbe)
- Transcription error flow
- Exception hierarchy
- Logging system (dual output)
- Archive and cleanup flows
- Error recovery strategies

### 6. [Complete Data Flow](./data-flow.md)
End-to-end view of data transformation and timing.
- Full processing pipeline
- File system state changes
- Timing and concurrency patterns
- Resource usage timeline
- Data transformation steps

---

## 🎯 Quick Navigation by Use Case

**Want to understand...**

- **How audio files get processed?** → [System Overview](./system-overview.md)
- **The monitoring loop?** → [Bash Script Details](./whisper-loop-details.md)
- **How transcriptions work?** → [Python Architecture](./transcribe-architecture.md)
- **Where content goes?** → [Content Routing System](./content-routing.md)
- **What happens when errors occur?** → [Error Handling](./error-handling.md)
- **The complete workflow?** → [Complete Data Flow](./data-flow.md)

---

## 🔑 Key Concepts

### Audio Processing Stages
1. **Detection**: Shell script polls for `.m4a` files every 10 seconds
2. **Validation**: FFProbe checks audio file integrity
3. **Transcription**: Whisper model converts speech to text
4. **Routing**: Keywords determine destination notes
5. **Writing**: Content appended to appropriate files
6. **Archival**: Processed files moved to `.archive/`

### Keyword System
The system recognizes these keywords in transcribed text:
- `concept digest` → ZettleKasten/concept digest.md
- `memory dump` → ZettleKasten/memory dump.md
- `daily reflection` → Daily Notes/[date].md
- `reminder` → Individual files in fleet_notes/reminders/
- **No keyword** → gtd - inbox.md (default)

### Directory Structure
```
fleetingNotes/
├── whisper_loop.sh          # Monitoring script
├── transcribe.py            # Processing pipeline
├── .venv/                   # Python environment
├── recordings/              # Input directory
│   ├── *.m4a               # Audio files to process
│   ├── .archive/           # Successfully processed
│   └── .corrupted/         # Failed validation
└── transcriptions/          # Output directory

Obsidian/
├── gtd - inbox.md          # Default destination
├── Daily Notes/            # Date-based notes
└── ZettleKasten/
    ├── concept digest.md
    ├── memory dump.md
    ├── dump_log.md         # Operation log
    └── fleet_notes/
        ├── voice_memo/     # Long transcriptions
        └── reminders/      # Individual reminders
```

### Special Features

#### Early Morning Adjustment
Recordings made before 5:00 AM are associated with the previous day's daily note (assumes late-night journaling).

#### Long Note Handling
Transcriptions longer than 200 characters:
- Create individual markdown file in `fleet_notes/voice_memo/`
- Add frontmatter with creation date/time and tags
- Append wiki-link preview to target note

#### Concurrent Processing Prevention
Lock file mechanism (`/tmp/whisper_loop.lock`) ensures only one instance of the monitoring script runs at a time.

---

## 🛠️ Technical Stack

- **Shell**: Bash (Fish-compatible)
- **Python**: 3.x with libraries:
  - `whisper` (OpenAI)
  - `semantic_sort` (custom module)
- **External Tools**: 
  - FFProbe (audio validation)
  - Whisper model: "medium" (CPU mode)

---

## 📊 Diagram Types Used

- **Flowcharts**: Process flows and decision trees
- **Class Diagrams**: Object-oriented structure
- **Sequence Diagrams**: Interaction timing
- **State Diagrams**: File lifecycle
- **Gantt Charts**: Resource usage timeline

All diagrams use Mermaid markdown syntax and can be rendered in any Mermaid-compatible viewer (GitHub, Obsidian with plugin, VS Code with extension, etc.).
