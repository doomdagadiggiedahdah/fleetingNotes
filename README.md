# Voice Note to Obsidian Router

A tool that routes STT voice notes into an Obsidian vault, based on keywords in voice note. Take your voice notes and have them automatically saved to custom locations.

## What it does

- Watches a directory for audio files (.m4a)
- Transcribes audio to text using faster-whisper (CTranslate2-optimized Whisper)
- Routes notes to different Obsidian files based on keywords in content
- Creates separate files with previews for longer notes (>200 chars)
- Handles corrupted/incomplete files with retry logic
- Archives processed files
- Logs all operations with rotating log files

## Setup

1. Install dependencies:
```bash
# Install uv
# See https://github.com/astral-sh/uv for more installation methods
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create a virtual environment and install dependencies
uv venv .venv
source .venv/bin/activate
uv pip install -e .
```

2. Update these paths in `transcribe.py` to match your system:
```python
# Base directories
FLEET_BASE = Path("/home/mat/Documents/ProgramExperiments/fleetingNotes")  # Project directory
OBS_BASE   = Path("/home/mat/Obsidian/")                                   # Your Obsidian vault location

# Obsidian directories
INBOX_NOTE      = OBS_BASE / "gtd - inbox.md"       # Default note for unclassified notes
DAILY_NOTES_DIR = OBS_BASE / "periodic-notes"        # For daily reflections
ZETTLE_DIR      = OBS_BASE / "ZettleKasten"          # For other categorized notes
```

3. Set up the systemd service for continuous processing:
```bash
chmod +x daemon_setup.sh
sudo ./daemon_setup.sh
```

## Usage

### One-shot mode (default)
Process all available files once and exit:
```bash
python transcribe.py
```

### Daemon mode
Run continuously, scanning for new files:
```bash
python transcribe.py --daemon
```

Options:
- `--sleep-seconds N` — seconds between scans when idle (default: 10)
- `--retry-sleep N` — seconds between retries for deferred files (default: 30)
- `--retry-limit N` — max retries before moving file to .corrupted/ (default: 40)
- `--max-loops N` — stop after N loops, 0 = infinite (default: 0)
- `-t, --skip-archive` — skip archiving audio files after processing

### Syncthing integration
Use [Syncthing](https://docs.syncthing.net/intro/getting-started.html) to send phone recordings into the `recordings/` directory. The daemon will automatically pick them up.

## Notes Routing

The system routes transcriptions based on keywords found in the content:
- "concept digest" → ZettleKasten/concept digest.md
- "memory dump" → ZettleKasten/memory dump.md
- "daily reflection" → periodic-notes/YYYY-MM-DD.md (based on recording date)
- "reminder" → ZettleKasten/fleet_notes/reminders/ (individual files)
- Any other content → gtd - inbox.md

### Adding Your Own Routes

Modify the `NOTES_MAP` in `transcribe.py`:

```python
NOTES_MAP = {
    "concept digest": ZETTLE_DIR / "concept digest.md",
    "memory dump": ZETTLE_DIR / "memory dump.md",
    "daily reflection": "daily",
    "reminder": "reminder",
    # Add your custom routes here, e.g.:
    "shopping list": OBS_BASE / "Lists/shopping.md",
    "project ideas": ZETTLE_DIR / "project ideas.md",
}
```

Then restart the service: `sudo systemctl restart whisper-loop.service`

## Service Management

```bash
sudo systemctl status whisper-loop.service    # Check status
sudo journalctl -u whisper-loop.service       # View logs
sudo systemctl restart whisper-loop.service   # Restart
sudo systemctl stop whisper-loop.service      # Stop
sudo systemctl disable whisper-loop.service   # Disable
```
