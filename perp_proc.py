#!/usr/bin/python3
import json
import re
import sys
from perplexity import Perplexity

def main():
    with open(file_path, 'r') as file:
        prompt = file.read()
    html_snippet = "Please use many emojis and most importantly, format all parts of your answer in HTML. Next most important is to use great references."
    prompt = prompt.replace('#AQ', '') + html_snippet 
    print(prompt)

    perplexity = Perplexity()
    responses = []

    for response in perplexity.search(prompt):
        if 'status' in response and response['status'] == 'completed':
            # Parse the JSON string from the 'text' key
            text_content = json.loads(response['text'])
            answer = text_content.get('answer')
            if answer:
                numeric_references = set(re.findall(r'\[(\d+)\]', answer))
                # Extract web results
                web_results = text_content.get('web_results', [])
                # Map numbers to URLs
                references = {str(idx + 1): web_results[idx]['url'] for idx in range(len(web_results)) if str(idx + 1) in numeric_references}
                # Format reference list in HTML
                reference_list = '\n'.join(f"<li><a href='{references[ref]}'>{ref}</a></li>" for ref in sorted(numeric_references) if ref in references)
                # Wrap references in an HTML unordered list
                reference_list_html = f"<ul>{reference_list}</ul>"
                # Append formatted references to the answer
                full_answer = f"{answer}\n\nReferences:\n{reference_list_html}"
                print(f"🤖: {full_answer}")
                responses.append(full_answer)  # Save the full answer to a list
            else:
                print("No answer found in the response.")
        else:
            #print("Received non-final or non-answer response:", response)
            pass

    # Optionally, save responses to a file
    prompt = prompt.replace(html_snippet, '')
    with open(file_path, 'w+') as file:
        file.write(f"{prompt}\n\n")
        for answer in responses:
            file.write(answer + "\n")
    perplexity.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("need to provide another arg")
        exit()

    file_path = sys.argv[1]
    main()
