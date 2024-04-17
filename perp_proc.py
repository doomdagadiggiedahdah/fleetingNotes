#!/usr/bin/python3
import json
import re
import sys
from perplexityai import Perplexity

if len(sys.argv) < 2:
    print("need to provide another arg")
    exit()

file_path = sys.argv[1]
with open(file_path, 'r') as file:
    prompt = file.read()
prompt = prompt.replace('#AQ', '') + "Please format your answer in HTML."
print(prompt)

perplexity = Perplexity()
responses = []

for response in perplexity.generate_answer(prompt):
    if 'status' in response and response['status'] == 'completed':
        # Parse the JSON string from the 'text' key
        text_content = json.loads(response['text'])
        answer = text_content.get('answer')
        if answer:
            # Extract references from the answer
            numeric_references = set(re.findall(r'\[(\d+)\]', answer))
            # Extract web results
            web_results = text_content.get('web_results', [])
            # Map numbers to URLs
            references = {str(idx + 1): web_results[idx]['url'] for idx in range(len(web_results)) if str(idx + 1) in numeric_references}
            # Format reference list
            reference_list = '\n'.join(f"[{ref}] {references[ref]}" for ref in sorted(numeric_references) if ref in references)
            # Append formatted references to the answer
            full_answer = f"{answer}\n\nReferences:\n{reference_list}"
            print(f"🤖: {full_answer}")
            responses.append(full_answer)  # Save the full answer to a list
        else:
            print("No answer found in the response.")
    else:
        #print("Received non-final or non-answer response:", response)
        pass

# Optionally, save responses to a file
prompt = prompt.replace("Please format your answer in HTML.", '')
with open(file_path, 'w+') as file:
    file.write(f"{prompt}\n\n")
    for answer in responses:
        file.write(answer + "\n")
