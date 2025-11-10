#test_routing.py
import pytest
from pathlib import Path
import os 
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# from transcribe import ContentRouter, NOTES_MAP, append_to_file, write_truncated_note, LONG_NOTES_DIR
# from transcribe import ContentRouter
# from transcribe import NOTES_MAP
# from transcribe import append_to_file
# from transcribe import write_truncated_note
# from transcribe import LONG_NOTES_DIR

@pytest.fixture
def setup_files():
    """Setup test files and directories, cleanup after"""
    # Setup
    test_file = Path("test_truncation.md")
    LONG_NOTES_DIR.mkdir(parents=True, exist_ok=True)
    
    yield test_file
    
    # Cleanup after tests
    if test_file.exists():
        test_file.unlink()
    
    # Clean up any long notes we created
    for file in LONG_NOTES_DIR.glob("*.md"):
        file.unlink()

@pytest.mark.parametrize("test_case", [
    {
        "content": "This is a short note that shouldn't be truncated",
        "source_file": "short_note.m4a",
        "name": "Short Note Test",
        "should_truncate": False
    },
    {
        "content": "This is a very long note " * 20,  # Makes it > 200 chars
        "source_file": "long_note.m4a",
        "name": "Long Note Test",
        "should_truncate": True
    }
])

def test_truncation(setup_files, test_case):
    """Test that long notes get truncated and short notes don't"""
    test_file = setup_files
    
    print(f"\n📝 Testing {test_case['name']}:")
    print(f"Original content length: {len(test_case['content'])}")
    
    write_truncated_note(test_case['content'], test_case['source_file'], test_file)
    
    # Read the last line to check the result
    with open(test_file, 'r') as f:
        last_line = f.readlines()[-1].strip()
        print(f"Written content: {last_line}")
        
        if test_case['should_truncate']:
            print("Checking long note was truncated...")
            # Check the main file's preview
            assert "..." in last_line
            assert "[[long_note.md]]" in last_line
            preview_content = last_line.split("<br>")[1]
            assert len(preview_content) <= 203  # 200 chars + "..."
            
            # Check the long note file was created and contains full content
            long_note_path = LONG_NOTES_DIR / f"{Path(test_case['source_file']).stem}.md"
            assert long_note_path.exists(), f"Long note file not created at {long_note_path}"
            with open(long_note_path, 'r') as lf:
                long_content = lf.read()
                assert long_content == test_case['content']
        else:
            print("Checking short note wasn't truncated...")
            assert test_case['content'] in last_line
            assert "..." not in last_line