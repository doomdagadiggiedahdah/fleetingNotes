import sys
from faster_whisper import WhisperModel
import logging
import warnings
import argparse
import subprocess
import time
from pathlib import Path
from typing import Optional
from textwrap import dedent
from datetime import datetime, timedelta
from enum import Enum
from semantic_sort import sort_note_by_topic
warnings.filterwarnings('ignore', category=UserWarning, module='faster_whisper')


class ProcessingStatus(Enum):
    """Enum for audio file processing outcomes"""
    SUCCESS = "success"
    CORRUPTED = "corrupted"
    WRITE_FAILED = "write_failed"
    NOT_FOUND = "not_found"


# Base directories
FLEET_BASE = Path("/home/mat/Documents/ProgramExperiments/fleetingNotes")
OBS_BASE   = Path("/home/mat/Obsidian/")

# Fleet directories
RECORDING_DIR         = FLEET_BASE / "recordings"
ARCHIVE_DIR           = FLEET_BASE / "recordings/.archive"
CORRUPTED_DIR         = FLEET_BASE / "recordings/.corrupted"
TRANSCRIPTION_DIR     = FLEET_BASE / "transcriptions/"
TRANSCRIPTION_ARCHIVE = FLEET_BASE / "transcriptions/.archive"

# Obsidian directories
INBOX_NOTE      = OBS_BASE / "gtd - inbox.md"
DAILY_NOTES_DIR = OBS_BASE / "Daily Notes"
ZETTLE_DIR      = OBS_BASE / "ZettleKasten"
LOG_FILE        = ZETTLE_DIR / "dump_log.md"
LONG_NOTES_DIR  = ZETTLE_DIR / "fleet_notes/voice_memo"
REMINDER_DIR    = ZETTLE_DIR / "fleet_notes/reminders"

# Note mapping
NOTES_MAP = {
    "concept digest": ZETTLE_DIR / "concept digest.md",
    "memory dump": ZETTLE_DIR / "memory dump.md",
    "daily reflection": "daily",
    "reminder": "reminder"
    #"operator search": "sort" # TODO: return this back to "operator sort", I fucked up the test audio
}

WHISPER_MODEL = "medium" # TODO: test out large instead. I've gotten weird hallucinations
DEVICE = "cpu"  # Using CPU due to CUDA/cuDNN library issues
COMPUTE_TYPE = "int8_float32"  # Use int8 quantization for faster CPU inference

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

def is_audio_file_corrupted(file_path: Path) -> bool:
    """Check if an audio file is corrupted using ffprobe"""
    try:
        # Use ffprobe to check if the file can be read
        result = subprocess.run(
            ['ffprobe', '-v', 'quiet', '-show_format', '-show_streams', str(file_path)],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        # If ffprobe returns non-zero exit code, file is corrupted/unreadable
        if result.returncode != 0:
            logging.warning(f"Audio file appears corrupted: {file_path.name} (ffprobe exit code: {result.returncode})")
            return True
            
        # Check if we got any format/stream info
        if not result.stdout.strip():
            logging.warning(f"Audio file appears corrupted: {file_path.name} (no format/stream info)")
            return True
            
        return False
        
    except subprocess.TimeoutExpired:
        logging.error(f"Timeout checking audio file: {file_path.name}")
        return True
    except FileNotFoundError:
        logging.error("ffprobe not found - cannot check audio file integrity")
        return False  # Assume file is okay if we can't check
    except Exception as e:
        logging.error(f"Error checking audio file {file_path.name}: {e}")
        return False  # Assume file is okay if we can't check

class TranscriptionService:
    def __init__(self):
        try:
            # was going to have a check to see if a file is present, but that's
            # taken care of with the control_whisper.sh file already
            logging.info("Loading faster-whisper model...")

            # faster-whisper: Uses CTranslate2 for optimized inference
            # Automatically handles GPU/CPU split inference
            self.model = WhisperModel(
                model_size_or_path=WHISPER_MODEL,
                device=DEVICE,
                compute_type=COMPUTE_TYPE
            )
        except Exception as e:
            logging.error(f"Failed to load faster-whisper model: {e}")
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
            
            # Check if file is corrupted
            if is_audio_file_corrupted(full_audio_path):
                raise ValueError(f"Audio file is corrupted or unreadable: {full_audio_path}")
            
            # faster-whisper returns segments iterator instead of a dict
            segments, info = self.model.transcribe(
                str(full_audio_path),
                language="en"
            )
            
            # Collect text from all segments, separated by newlines for readability
            text_parts = [segment.text for segment in segments]
            transcribed_text = "\n".join(text_parts).strip()
            
            if not transcribed_text:
                raise TranscriptionError("Transcription returned no text")
                
            return transcribed_text
            
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
        
    def determine_destination(self, content: str, source_file: str) -> tuple[Path, str, str]:
        """
        Determines where content should go based on keywords.
        Returns tuple of (destination_path, processed_content, keyword)
        """
        content = content.strip()
        
        # Check for keyword matches
        for keyword, target in self.notes_map.items(): # notes_map is the keyword:note list
            if keyword.lower() in content.lower():
                logging.info(f"Keyword '{keyword}' found in content")
                processed_content = content.lower().strip()
                
                if   target == "daily":
                    return self._get_daily_note_path(source_file), processed_content, keyword
                elif target == "reminder":
                    md_filename = Path(source_file).stem + ".md"
                    return REMINDER_DIR / md_filename, processed_content, keyword
                elif target == "sort":
                    ## and here....
                    destination_note, confidence, topic = sort_note_by_topic(processed_content) 
                    logging.info(f"Content semantically sorted to '{destination_note}' (topic: {topic}, confidence: {confidence:.2f})")
                    return ZETTLE_DIR / destination_note, processed_content
                return Path(target), processed_content, keyword
                
        # Default to inbox if no keywords match
        return INBOX_NOTE, content, None
    
    def _get_daily_note_path(self, source_file: str, adjust_for_early_hours: bool = True) -> Path:
        """Determines the appropriate daily note path"""
        try:
            filename = Path(source_file).stem
            date_str, time_str = filename.split()[:2]
            
            # Parse both date and time to check hour
            datetime_obj = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H-%M-%S")
            
            # Adjust date if before 5am (only if flag is True)
            if adjust_for_early_hours and datetime_obj.hour < 5:
                datetime_obj -= timedelta(days=1)
                date_str = datetime_obj.strftime("%Y-%m-%d")
                
            return DAILY_NOTES_DIR / f"{date_str}.md"
            
        except ValueError as e:
            logging.error(f"Could not parse date from filename {source_file}: {e}")
            return INBOX_NOTE

def write_truncated_note(content: str, source_file: str, target_file: Path, keyword: str = None) -> None:
    """Writes content to target file, creating a separate long note if content exceeds 200 chars"""
    def _create_template(filename: str, is_reminder: bool = False) -> str:
        """Creates a template using datetime from filename format '2025-02-06 18-27-54 10.md'"""
        # Extract the datetime part (everything before the last space)
        datetime_str = ' '.join(filename.split()[:-1])
        # Convert from "2025-02-06 18-27-54" format to datetime object
        dt = datetime.strptime(datetime_str, "%Y-%m-%d %H-%M-%S")
        
        if is_reminder:
            return dedent(f'''
                ---
                tags: ["reminder"]
                text: ["{content}"]
                ---
                ''').strip()
        else:
            return dedent(f'''
                ---
                date_creation: {dt.strftime("%Y-%m-%d")}
                time_creation: {dt.strftime("%H:%M:%S")}
                tags:
                  - "#voice_memo"
                ---

                ''').strip()

    # Handle reminder notes - always create individual files
    if keyword == "reminder":
        # Create reminder directory and write individual note
        target_file.parent.mkdir(parents=True, exist_ok=True)
        with open(target_file, "w") as rf:
            template = _create_template(Path(source_file).name, is_reminder=True)
            rf.write(template)
            rf.write("\n\n")
            rf.write(content)
        return  # Exit early for reminders
    
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
        
        preview = content.replace("\n", " ")[:200]
        formatted_entry = f"- [[{Path(source_file).stem}]] --VM--\n\t- {preview}..."
    else:
        preview = content.replace("\n", " ")
        formatted_entry = f"- {Path(source_file)} --VM--\n\t- {preview}"

    # handle heading add for daily notes
    if "Daily Notes" in str(target_file) and keyword:
        with open(target_file, 'r') as f:
            file_content = f.read()
            
        if keyword == "daily reflection":
            if "## daily reflection" not in file_content:
                formatted_entry = "## daily reflection\n" + formatted_entry
        elif keyword == "reminder":
            if "## reminders" not in file_content:
                # Insert reminders heading before daily reflection if it exists
                if "## daily reflection" in file_content:
                    formatted_entry = "## reminders\n" + formatted_entry + "\n\n"
                else:
                    formatted_entry = "## reminders\n" + formatted_entry
    
    with open(target_file, "a") as tf:
        tf.write("\n\n" + formatted_entry)

def append_to_file(content: str, source_file: str, target_file: Path, keyword: str = None) -> bool:
    """Handles writing content to files and logging"""
    try:
        if not content:
            raise ValueError("No content to write")
            
        # Check if target directory exists
        target_file.parent.mkdir(parents=True, exist_ok=True)
        
        write_truncated_note(content, source_file, target_file, keyword)
        log_operation(content, source_file, target_file)

        return True
        
    except Exception as e:
        logging.error(f"Error appending to file: {e}")
        return False

def process_audio(audio_file: str, skip_archive: bool = False) -> ProcessingStatus:
    """Main function that calls the transcription, sorting, and logging.

    Returns a ProcessingStatus indicating the outcome. Does not move files to
    .corrupted/ on failure; higher-level loop decides on retries and movement.
    """
    try:
        # Get transcription
        transcription = transcriber.transcribe_audio(audio_file)
        if not transcription:
            return ProcessingStatus.CORRUPTED
        
        # Determine destination
        destination, processed_content, keyword = content_router.determine_destination(
            transcription, 
            audio_file
        )
        
        # Append to appropriate destination
        success = append_to_file(processed_content, audio_file, destination, keyword)
        
        if success:
            if not skip_archive:
                source_path = RECORDING_DIR / audio_file
                archive_path = ARCHIVE_DIR / audio_file
                source_path.rename(archive_path)
                logging.info(f"Archived {audio_file}")
            else:
                print("skipping archive")
            logging.info(f"Successfully processed {audio_file} to {destination}")
            return ProcessingStatus.SUCCESS
        else:
            logging.error(f"Failed to append transcription for {audio_file}")
            return ProcessingStatus.WRITE_FAILED
            
    except Exception as e:
        logging.error(f"Failed to process {audio_file}: {e}")
        return ProcessingStatus.WRITE_FAILED

def _scan_audio_files() -> list[str]:
    """Return a list of candidate audio filenames ('.m4a', non-hidden)."""
    return [p.name for p in RECORDING_DIR.glob("*.m4a") if p.is_file() and not p.name.startswith('.')]


def run_loop(skip_archive: bool = False, sleep_seconds: int = 10, max_loops: int = 0, 
             retry_limit: int = 40, retry_sleep: int = 30) -> None:
    """Continuous processing loop with retry logic for corrupted files.

    - Processes all available files each iteration
    - Defers corrupted files with retry counter (max retry_limit retries)
    - Prioritizes fresh files over deferred ones
    - Sleeps 10s when no files present, 30s when only deferred files remain
    - max_loops: 0 means run indefinitely; otherwise stop after given iterations
    - retry_limit: maximum number of retries before moving to .corrupted/
    - retry_sleep: seconds to sleep when only deferred files exist
    """
    deferred_files: dict[str, int] = {}  # filename -> retry count
    loops = 0
    
    while True:
        # Scan for all .m4a files
        all_files = _scan_audio_files()
        
        # Separate fresh files from deferred ones
        fresh_files = [f for f in all_files if f not in deferred_files]
        deferred = [f for f in all_files if f in deferred_files]
        
        # Process fresh files first
        for fname in fresh_files:
            logging.info(f"Processing: {fname}")
            status = process_audio(fname, skip_archive)
            
            # If corrupted, add to deferred with counter = 1
            if status == ProcessingStatus.CORRUPTED:
                deferred_files[fname] = 1
                logging.warning(f"File marked as corrupted, deferring: {fname} (attempt 1/{retry_limit})")
        
        # Process deferred files (retry logic)
        for fname in deferred:
            retry_count = deferred_files[fname]
            
            if retry_count < retry_limit:
                # Attempt to retry
                logging.info(f"Retrying deferred file: {fname} (attempt {retry_count + 1}/{retry_limit})")
                status = process_audio(fname, skip_archive)
                
                if status == ProcessingStatus.SUCCESS:
                    # Success! Remove from deferred
                    del deferred_files[fname]
                    logging.info(f"Successfully processed after {retry_count} retries: {fname}")
                elif status == ProcessingStatus.CORRUPTED:
                    # Still corrupted, increment counter
                    deferred_files[fname] += 1
                    logging.warning(f"Still corrupted, retrying next cycle: {fname} (attempt {deferred_files[fname]}/{retry_limit})")
                # WRITE_FAILED is treated same as CORRUPTED (will retry)
                elif status == ProcessingStatus.WRITE_FAILED:
                    deferred_files[fname] += 1
                    logging.warning(f"Write failed, will retry: {fname} (attempt {deferred_files[fname]}/{retry_limit})")
            else:
                # Max retries exceeded, move to .corrupted/
                source_path = RECORDING_DIR / fname
                if source_path.exists():
                    CORRUPTED_DIR.mkdir(parents=True, exist_ok=True)
                    corrupted_path = CORRUPTED_DIR / fname
                    source_path.rename(corrupted_path)
                    logging.error(f"Moved to .corrupted/ after {retry_limit} failed retries: {fname} -> {corrupted_path}")
                del deferred_files[fname]
        
        loops += 1
        if max_loops and loops >= max_loops:
            break
        
        # Determine sleep duration
        if not all_files:
            # No files at all, sleep standard interval
            time.sleep(sleep_seconds)
        elif deferred and not fresh_files:
            # Only deferred files remain, use longer retry sleep
            logging.info(f"Only deferred files remain ({len(deferred)}), sleeping {retry_sleep}s before retry")
            time.sleep(retry_sleep)
        # else: files were processed, continue immediately for next scan


def main():
    parser = argparse.ArgumentParser(description='Process audio files and generate transcriptions')
    parser.add_argument('-t', '--skip-archive', action='store_true',
                      help='Skip archiving the audio files after processing')
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--daemon', action='store_true', help='Run continuously, scanning for files')
    group.add_argument('--once', action='store_true', help='Process available files once and exit (default)')
    parser.add_argument('--sleep-seconds', type=int, default=10, help='Sleep between scans when idle (daemon mode)')
    parser.add_argument('--retry-sleep', type=int, default=30, help='Sleep between retries for deferred files (seconds)')
    parser.add_argument('--retry-limit', type=int, default=40, help='Max retries before moving file to .corrupted/')
    parser.add_argument('--max-loops', type=int, default=0, help='For testing: stop after N loops (0=infinite)')
    args = parser.parse_args()

    try:
        # Initialize the transcription service
        global transcriber, content_router
        transcriber = TranscriptionService()
        content_router = ContentRouter(NOTES_MAP)

        if args.daemon:
            run_loop(skip_archive=args.skip_archive, sleep_seconds=args.sleep_seconds, 
                    max_loops=args.max_loops, retry_limit=args.retry_limit, 
                    retry_sleep=args.retry_sleep)
        else:
            # default --once behavior
            for audio_file in _scan_audio_files():
                logging.info(f"Processing: {audio_file}")
                process_audio(audio_file, args.skip_archive)
        
    except Exception as e:
        logging.error(f"Critical error in main process: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

## just testing push
