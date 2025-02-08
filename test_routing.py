from transcribe import ContentRouter, NOTES_MAP, append_to_file

def test_all_routes():
    """Test sorting for concept digest, memory dump, and daily note"""
    router = ContentRouter(NOTES_MAP)
    
    # Test cases
    test_cases = [
        {
            "content": "concept digest here's a concept I'm thinking about",
            "source_file": "concept_test.m4a",
            "name": "Concept Digest Test"
        },
        {
            "content": "memory dump random thoughts from today",
            "source_file": "memory_test.m4a",
            "name": "Memory Dump Test"
        },
        {
            "content": "daily reflection today was productive",
            "source_file": "2025-02-07 23-11-25 2.m4a",
            "name": "Daily Note Test"
        }
    ]
    
    for case in test_cases:
        print(f"\n📝 Testing {case['name']}:")
        print(f"Content: {case['content']}")
        
        # Route and write
        destination, processed_content = router.determine_destination(
            case['content'], 
            case['source_file']
        )
        print(f"Routing to: {destination}")
        
        success = append_to_file(processed_content, case['source_file'], destination)
        
        if success:
            print(f"✅ Successfully wrote to {destination}")
            with open(destination, 'r') as f:
                last_line = f.readlines()[-1].strip()
            print(f"Last line written: {last_line}")
        else:
            print(f"❌ Failed to write to {destination}")

if __name__ == "__main__":
    test_all_routes()
