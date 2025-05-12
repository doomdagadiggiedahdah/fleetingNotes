import sys
import whisper
import logging
import warnings
import argparse
from pathlib import Path
from typing import Optional
from textwrap import dedent
from datetime import datetime, timedelta
warnings.filterwarnings('ignore', category=UserWarning, module='whisper.transcribe')


# Base directories
FLEET_BASE = Path("/home/mat/Documents/ProgramExperiments/fleetingNotes")
OBS_BASE   = Path("/home/mat/Obsidian/")

# Fleet directories
RECORDING_DIR         = FLEET_BASE / "recordings"
ARCHIVE_DIR           = FLEET_BASE / "recordings/.archive"
TRANSCRIPTION_DIR     = FLEET_BASE / "transcriptions/"
TRANSCRIPTION_ARCHIVE = FLEET_BASE / "transcriptions/.archive"

# Obsidian directories
INBOX_NOTE      = OBS_BASE / "gtd - inbox.md"
DAILY_NOTES_DIR = OBS_BASE / "Daily Notes"
ZETTLE_DIR      = OBS_BASE / "ZettleKasten"
LOG_FILE        = ZETTLE_DIR / "dump_log.md"
LONG_NOTES_DIR  = ZETTLE_DIR / "fleet_notes/voice_memo"

# Note mapping
NOTES_MAP = {
    "concept digest": ZETTLE_DIR / "concept digest.md",
    "memory dump": ZETTLE_DIR / "memory dump.md",
    "daily reflection": "daily"
}

WHISPER_MODEL = "turbo"
DEVICE = "cpu"

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(FLEET_BASE / 'processing_errors.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

def log_operation(content: str, source: str, target: Path) -> None:
    """Logs operations to the log file"""
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(LOG_FILE, "a") as log_file:
            log_file.write(f"# Operation at {timestamp}\n")
            log_file.write(f"- Source: '{source}'\n")
            log_file.write(f"- Target: '{target}'\n")
            log_file.write(f"- Content: '{content}'\n\n")
    except Exception as e:
        logging.error(f"Failed to log operation: {e}")


class TranscriptionError(Exception):
    """Custom exception for transcription-related errors"""
    pass

class TranscriptionService:
    def __init__(self):
        try:
            # was going to have a check to see if a file is present, but that's
            # taken care of with the control_whisper.sh file already
            logging.info("Loading whisper model...")

            # thanks to https://github.com/MiscellaneousStuff/openai-whisper-cpu/blob/main/script/custom_whisper.py#L21
            # device needed to be inside load_model params
            self.model = whisper.load_model(name=WHISPER_MODEL, device=DEVICE) 
        except Exception as e:
            logging.error(f"Failed to load Whisper model: {e}")
            raise TranscriptionError("Could not initialize transcription service")
    
    def transcribe_audio(self, audio_file) -> Optional[str]:
        """Transcribes audio file and returns the text"""
        try:
            full_audio_path = RECORDING_DIR / audio_file
            
            # Check if file exists
            if not full_audio_path.exists():
                raise FileNotFoundError(f"Audio file not found: {full_audio_path}")
            
            # Check if file is empty
            if full_audio_path.stat().st_size == 0:
                raise ValueError(f"Audio file is empty: {full_audio_path}")
            
            result = self.model.transcribe(str(full_audio_path), fp16=False, language="en")
            
            if not result or "text" not in result:
                raise TranscriptionError("Transcription returned no text")
                
            return result["text"]
            
        except FileNotFoundError as e:
            logging.error(f"File error: {e}")
            return None
        except ValueError as e:
            logging.error(f"Invalid file: {e}")
            return None
        except Exception as e:
            logging.error(f"Unexpected error transcribing {audio_file}: {e}")
            return None

class ContentRouter:
    def __init__(self, notes_map):
        self.notes_map = notes_map
        
    def determine_destination(self, content: str, source_file: str) -> tuple[Path, str]:
        """
        Determines where content should go based on keywords.
        Returns tuple of (destination_path, processed_content)
        """
        content = content.strip()
        
        # Check for keyword matches
        for keyword, target in self.notes_map.items():
            if keyword.lower() in content.lower():
                logging.info(f"Keyword '{keyword}' found in content")
                processed_content = content.lower().strip()
                
                if target == "daily":
                    return self._get_daily_note_path(source_file), processed_content
                return Path(target), processed_content
                
        # Default to inbox if no keywords match
        return INBOX_NOTE, content
    
    def _get_daily_note_path(self, source_file: str) -> Path:
        """Determines the appropriate daily note path"""
        try:
            filename = Path(source_file).stem
            date_str, time_str = filename.split()[:2]
            
            # Parse both date and time to check hour
            datetime_obj = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H-%M-%S")
            
            # Adjust date if before 5am
            if datetime_obj.hour < 5:
                datetime_obj -= timedelta(days=1)
                date_str = datetime_obj.strftime("%Y-%m-%d")
                
            return DAILY_NOTES_DIR / f"{date_str}.md"
            
        except ValueError as e:
            logging.error(f"Could not parse date from filename {source_file}: {e}")
            return INBOX_NOTE

def write_truncated_note(content: str, source_file: str, target_file: Path) -> None:
    """Writes content to target file, creating a separate long note if content exceeds 200 chars"""
    def _create_template(filename: str) -> str:
        """Creates a template using datetime from filename format '2025-02-06 18-27-54 10.md'"""
        # Extract the datetime part (everything before the last space)
        datetime_str = ' '.join(filename.split()[:-1])
        # Convert from "2025-02-06 18-27-54" format to datetime object
        dt = datetime.strptime(datetime_str, "%Y-%m-%d %H-%M-%S")
        
        return dedent(f'''
            ---
            date_creation: {dt.strftime("%Y-%m-%d")}
            time_creation: {dt.strftime("%H:%M:%S")}
            tags:
              - "#voice_memo"
            ---

            ''').strip()

    if len(content) > 200:
        md_filename = Path(source_file).stem + ".md"
        long_note_path = LONG_NOTES_DIR / md_filename

        # Write the full content with template to a new file for long notes
        LONG_NOTES_DIR.mkdir(parents=True, exist_ok=True)
        with open(long_note_path, "w") as lf:
            template = _create_template(Path(source_file).name)
            lf.write(template)
            lf.write("\n\n")
            lf.write(content)
        
        preview = content[:200]
        formatted_entry = f"- [[{Path(source_file).stem}]] --VM--\n\t- {preview}..."
    else:
        formatted_entry = f"- {Path(source_file)} --VM--\n\t- {content}"

    # handle daily reflection heading add
    if "Daily Notes" in str(target_file):
        with open(target_file, 'r') as f:
            file_content = f.read()
            if "## daily reflection" not in file_content:
                formatted_entry = "## daily reflection\n" + formatted_entry
    
    with open(target_file, "a") as tf:
        tf.write("\n\n" + formatted_entry)

def append_to_file(content: str, source_file: str, target_file: Path) -> bool:
    """Handles writing content to files and logging"""
    try:
        if not content:
            raise ValueError("No content to write")
            
        # Check if target directory exists
        target_file.parent.mkdir(parents=True, exist_ok=True)
        
        write_truncated_note(content, source_file, target_file)
        log_operation(content, source_file, target_file)

        return True
        
    except Exception as e:
        logging.error(f"Error appending to file: {e}")
        return False

def process_audio(audio_file: str, skip_archive: bool = False) -> None:
    """Main function that calls the transcription, sorting, and logging"""
    try:
        logging.info(f"Starting processing of {audio_file}")
        
        # Get transcription
        transcription = transcriber.transcribe_audio(audio_file)
        if not transcription:
            logging.error(f"No transcription generated for {audio_file}")
        
        # Determine destination
        destination, processed_content = content_router.determine_destination(
            transcription, 
            audio_file
        )
        
        # Append to appropriate destination
        success = append_to_file(processed_content, audio_file, destination)
        
        if not skip_archive:
            source_path = RECORDING_DIR / audio_file
            archive_path = ARCHIVE_DIR / audio_file
            source_path.rename(archive_path)
            logging.info(f"Archived {audio_file}")
        else:
            print("skipping archive")

        if success:
            logging.info(f"Successfully processed {audio_file} to {destination}")
        else:
            logging.error(f"Failed to append transcription for {audio_file}")
            
    except Exception as e:
        logging.error(f"Failed to process {audio_file}: {e}")

def main():
    parser = argparse.ArgumentParser(description='Process audio files and generate transcriptions')
    parser.add_argument('-t', '--skip-archive', action='store_true',
                      help='Skip archiving the audio files after processing')
    args = parser.parse_args()

    try:
        # Initialize the transcription service
        global transcriber, content_router
        transcriber = TranscriptionService()
        content_router = ContentRouter(NOTES_MAP)
 
        # Process all audio files in the recording directory
        for audio_file in RECORDING_DIR.glob("*"):
            if audio_file.is_file() and not audio_file.name.startswith('.'):
                logging.info(f"Processing: {audio_file.name}")
                process_audio(audio_file.name, args.skip_archive)
        
    except Exception as e:
        logging.error(f"Critical error in main process: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

## just testing push
