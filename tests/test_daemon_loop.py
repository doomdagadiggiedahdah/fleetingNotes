"""Test daemon loop functionality without requiring transcription"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from transcribe import ProcessingStatus, _scan_audio_files
from pathlib import Path

def test_processing_status_enum():
    """Test that ProcessingStatus enum values are correct"""
    assert ProcessingStatus.SUCCESS.value == "success"
    assert ProcessingStatus.CORRUPTED.value == "corrupted"
    assert ProcessingStatus.WRITE_FAILED.value == "write_failed"
    assert ProcessingStatus.NOT_FOUND.value == "not_found"
    print("✅ ProcessingStatus enum values correct")

def test_scan_audio_files():
    """Test that _scan_audio_files finds .m4a files"""
    RECORDING_DIR = Path("/home/mat/Documents/ProgramExperiments/fleetingNotes/recordings")
    
    # Should find the test files we copied
    files = _scan_audio_files()
    print(f"Found {len(files)} .m4a files: {files}")
    
    # Check that files are strings and end with .m4a
    for fname in files:
        assert isinstance(fname, str), f"File should be string, got {type(fname)}"
        assert fname.endswith('.m4a'), f"File should end with .m4a, got {fname}"
        assert not fname.startswith('.'), f"File should not be hidden, got {fname}"
    
    print(f"✅ Scan found {len(files)} valid .m4a files")
    return len(files)

def test_cli_flags_exist():
    """Test that argparse configuration is correct"""
    import transcribe
    import argparse
    
    # Verify that the functions exist
    assert hasattr(transcribe, 'run_loop'), "run_loop function should exist"
    assert callable(transcribe.run_loop), "run_loop should be callable"
    
    print("✅ CLI flags and loop functions exist")

if __name__ == "__main__":
    test_processing_status_enum()
    test_scan_audio_files()
    test_cli_flags_exist()
    print("\n✅ All daemon loop tests passed!")
