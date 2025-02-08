import whisper
import sys
from pathlib import Path
from datetime import datetime
import logging
from typing import Optional
from datetime import datetime, timedelta
import warnings


# Base directories
warnings.filterwarnings("ignore", message="Can't initialize NVML") #idk yet
FLEET_BASE = Path("/home/mat/Documents/ProgramExperiments/fleetingNotes")
OBS_BASE = Path("/home/mat/Obsidian/")

# Fleet directories
RECORDING_DIR = FLEET_BASE / "recordings"
ARCHIVE_DIR = FLEET_BASE / "recordings/.archive"
TRANSCRIPTION_DIR = FLEET_BASE / "transcriptions/"
TRANSCRIPTION_ARCHIVE = FLEET_BASE / "transcriptions/.archive"

# Obsidian directories
INBOX_NOTE = OBS_BASE / "gtd - inbox.md"
DAILY_NOTES_DIR = OBS_BASE / "Daily Notes"
ZETTLE_DIR = OBS_BASE / "ZettleKasten"
LOG_FILE = ZETTLE_DIR / "dump_log.md"
LONG_NOTES_DIR = ZETTLE_DIR / "fleet_notes/voice_memo"

# Note mapping
NOTES_MAP = {
    "concept digest": ZETTLE_DIR / "concept digest.md",
    "memory dump": ZETTLE_DIR / "memory dump.md",
    "daily reflection": "daily"
}

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(FLEET_BASE / 'processing_errors.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

class TranscriptionError(Exception):
    """Custom exception for transcription-related errors"""
    pass

class TranscriptionService:
    def __init__(self):
        try:
            logging.info("Loading whisper model...")
            self.model = whisper.load_model("base")
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
            
            result = self.model.transcribe(str(full_audio_path), fp16=False, language="English")
            
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
                processed_content = content.lower().replace(keyword.lower(), "").strip()
                
                if target == "daily":
                    return self._get_daily_note_path(source_file), processed_content
                return Path(target), processed_content
                
        # Default to inbox if no keywords match
        return INBOX_NOTE, content
    
    def _get_daily_note_path(self, source_file: str) -> Path:
        """Determines the appropriate daily note path"""
        try:
            filename = Path(source_file).stem
            datetime_obj = datetime.strptime(filename, "%Y-%m-%d %H-%M-%S %M")
            date = datetime_obj.date()
            
            # Adjust date if file was created between midnight and 5 AM
            if datetime_obj.hour < 5:
                date -= timedelta(days=1)
                
            return DAILY_NOTES_DIR / f"{date}.md"
            
        except ValueError as e:
            logging.error(f"Could not parse date from filename {source_file}: {e}")
            return INBOX_NOTE  # Fall back to inbox if date parsing fails


def append_to_file(content: str, source_file: str, target_file: Path) -> bool:
    """Handles writing content to files and logging"""
    try:
        if not content:
            raise ValueError("No content to write")
            
        # Check if target directory exists
        target_file.parent.mkdir(parents=True, exist_ok=True)
        
        char_count = len(content)
        
        # First, try to write to the target file to check if it's writable
        with open(target_file, "a") as tf:
            tf.write("\n")  # spacer
        
        if char_count > 200:
            md_filename = Path(source_file).stem + ".md"
            long_note_path = LONG_NOTES_DIR / md_filename
            
            # Ensure long notes directory exists
            LONG_NOTES_DIR.mkdir(parents=True, exist_ok=True)
            
            # Write the full content to a new file for long notes
            try:
                with open(long_note_path, "w") as lf:
                    lf.write(content)
                
                preview = content[:200]
                formatted_entry = f"- [[{md_filename}]] ----VM----<br>{preview}..."
                with open(target_file, "a") as tf:
                    tf.write(formatted_entry + "\n")
                
                log_operation(preview, source_file, target_file)
            except Exception as e:
                logging.error(f"Failed to write long note: {e}")
                raise
        else:
            formatted_entry = f"- {Path(source_file).stem} ----VM----<br>{content}"
            with open(target_file, "a") as tf:
                tf.write(formatted_entry + "\n")
            
            log_operation(content, source_file, target_file)
            
        return True
        
    except Exception as e:
        logging.error(f"Error appending to file: {e}")
        return False

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

def process_audio(audio_file: str) -> bool:
    """Main function that calls the transcription, sorting, and logging"""
    try:
        logging.info(f"Starting processing of {audio_file}")
        
        # Get transcription
        transcription = transcriber.transcribe_audio(audio_file)
        if not transcription:
            logging.error(f"No transcription generated for {audio_file}")
            return False
        
        # Determine destination
        destination, processed_content = content_router.determine_destination(
            transcription, 
            audio_file
        )
        
        # Append to appropriate destination
        success = append_to_file(processed_content, audio_file, destination)
        
        if success:
            logging.info(f"Successfully processed {audio_file} to {destination}")
            return True
        else:
            logging.error(f"Failed to append transcription for {audio_file}")
            return False
            
    except Exception as e:
        logging.error(f"Failed to process {audio_file}: {e}")
        return False

def main():
    try:
        # Initialize the transcription service
        global transcriber, content_router
        transcriber = TranscriptionService()
        content_router = ContentRouter(NOTES_MAP)
        
        # Track success/failure counts
        total_files = 0
        successful_files = 0
        
        # Process all audio files in the recording directory
        for audio_file in RECORDING_DIR.glob("*"):
            if audio_file.is_file() and not audio_file.name.startswith('.'):
                total_files += 1
                logging.info(f"Processing: {audio_file.name}")
                
                if process_audio(audio_file.name):
                    successful_files += 1
        
        # Report summary
        logging.info(f"Processing complete. Successfully processed {successful_files}/{total_files} files")
        
    except Exception as e:
        logging.error(f"Critical error in main process: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
