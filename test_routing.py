from pathlib import Path
from transcribe import ContentRouter, NOTES_MAP

def test_basic_routing():
    """Test that files go to the right places"""
    router = ContentRouter(NOTES_MAP)
    
    # Test inbox routing
    content = "this should go to inbox"
    destination, _ = router.determine_destination(content, "test.txt")
    print(f"Inbox test: {destination}")
    
    # Test concept digest routing
    content = "concept digest this should go to concept digest"
    destination, _ = router.determine_destination(content, "test.txt")
    print(f"Concept test: {destination}")
    
    # Test daily reflection
    # content = "daily reflection this should go to daily notes"
    # destination, _ = router.determine_destination(content, "2023-08-16 14-30-00 00")
    # print(f"Daily test: {destination}")

if __name__ == "__main__":
    test_basic_routing()
