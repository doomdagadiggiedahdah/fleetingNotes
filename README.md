# Voice Note to Obsidian Router

A tool that routes STT voice notes into an Obsidian vault, based on keywords in voice note. Take your voice notes and have them automatically saved to custom locations.

## What it does

- Watches a directory for audio files (.m4a)
- Transcribes audio to text using Whisper AI model
- Routes notes to different Obsidian files based on keywords in content
- Creates separate files with previews for longer notes
- Archives processed files
- Logs all operations

## Setup

1. Make sure you have Python and the required dependencies installed:
```bash
# Install uv 
# See https://github.com/astral-sh/uv for more installation methods
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create a virtual environment and install dependencies
uv venv .venv
source .venv/bin/activate
uv pip install openai-whisper
```

2. Update these paths in `transcribe.py` to match your system:
```python
# Base directories
FLEET_BASE = Path("/home/mat/Documents/ProgramExperiments/fleetingNotes")  # Project directory
OBS_BASE   = Path("/home/mat/Obsidian/")                                   # Your Obsidian vault location

# Obsidian directories
INBOX_NOTE      = OBS_BASE / "gtd - inbox.md"  # Default note for unclassified notes
DAILY_NOTES_DIR = OBS_BASE / "Daily Notes"     # For daily reflections
ZETTLE_DIR      = OBS_BASE / "ZettleKasten"    # For other categorized notes
```

3. Update the recording directory in `whisper_loop.sh`:
```bash
LOCATION="/home/mat/Documents/ProgramExperiments/fleetingNotes/recordings"
```

4. Make the setup script executable and run:
```bash
chmod +x daemon_setup.sh
sudo ./daemon_setup.sh
```

## Usage

1. Use [Syncthing](https://docs.syncthing.net/intro/getting-started.html) to send your phone recordings in the `recordings` directory
2. The service will automatically:
   - Transcribe them using Whisper
   - Route them to appropriate notes based on keywords
   - Archive the processed files

## Notes Routing

The system routes transcriptions based on keywords found in the content:
- "concept digest" → ZettleKasten/concept digest.md
- "memory dump" → ZettleKasten/memory dump.md
- "daily reflection" → Daily Notes/YYYY-MM-DD.md (based on recording date)
- Any other content → Default inbox note

### Adding Your Own Routes

You can add your own keyword-destination pairs by modifying the `NOTES_MAP` in `transcribe.py`:

```python
# Note mapping
NOTES_MAP = {
    "concept digest": ZETTLE_DIR / "concept digest.md",
    "memory dump": ZETTLE_DIR / "memory dump.md",
    "daily reflection": "daily",
    # Add your custom routes here, e.g.:
    "shopping list": OBS_BASE / "Lists/shopping.md",
    "project ideas": ZETTLE_DIR / "project ideas.md",
}
```

To add a new route:
1. Choose a keyword that you'll say in your voice note
2. Specify a destination path in your Obsidian vault
3. Add the pair to the `NOTES_MAP` dictionary
4. Restart the service: `sudo systemctl restart whisper-loop.service`

## Running Tests

```bash
./test_to_obsidian.fish
```
