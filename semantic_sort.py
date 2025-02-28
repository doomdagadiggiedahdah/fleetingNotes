from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import os

centroids_file = "/home/mat/Documents/ProgramExperiments/fleetingNotes/note_centroids.json"

def sort_note_by_topic(note_content, centroids_file=centroids_file):
    """
    Routes a note to the appropriate destination based on semantic similarity
    to pre-defined centroids from your important notes.
    
    Args:
        note_content: The full text of your note
        centroids_file: JSON file containing your manually defined centroids
    
    Returns:
        destination_note: The filename where this note should be appended
    """
    import json
    
    # Load the model
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Load your manually defined centroids
    with open(centroids_file, 'r') as f:
        centroids = json.load(f)
    
    # Embed the incoming note
    note_embedding = model.encode(note_content)
    
    # Find the closest centroid
    best_match = None
    highest_similarity = -1
    
    for topic, data in centroids.items():
        centroid_text = data["representative_text"]
        centroid_embedding = model.encode(centroid_text)
        
        similarity = cosine_similarity([note_embedding], [centroid_embedding])[0][0]
        
        if similarity > highest_similarity:
            highest_similarity = similarity
            best_match = topic
    
    # Get the destination note for this topic
    destination_note = centroids[best_match]["destination_note"]
    
    # You could implement a confidence threshold here
    min_confidence = 0.5
    if highest_similarity < min_confidence:
        destination_note = "unsorted.md"
        #destination_note = INBOX_NOTE      
    
    return destination_note, highest_similarity, best_match
## currently not sure if I need to use the last two of these, idk.
