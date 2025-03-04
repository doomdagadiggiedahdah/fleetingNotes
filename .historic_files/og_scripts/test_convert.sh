#!/bin/bash

ROOM="$HOME/Documents/Obsidian_Folders/General/Audio room.md"
NOTES="$HOME/Documents/Obsidian_Folders/General"

for i in $NOTES/*.webm;
do
	if [[ -f "$i" ]]; then

		# remove extension and converts to .wav
		mv "$i" "${i%.webm}"
		ffmpeg -i  "${i%.webm}" -ar 16000 -ac 1  "${i%.webm}".wav


	        # "title" of recording and tag for start of Transcript
	        echo -e \![["$i".wav]] "\n\nTranscript:" >> "$ROOM"

	        # the transcription going to the note page
	        deepspeech --model ~/deepspeech/deepspeech-0.9.3-models.pbmm --scorer ~/deepspeech/deepspeech-0.9.3-models.scorer --audio "$i".wav >> "$ROOM"

	        # space to make easy to read
	        echo -e "\n\n---\n" >> "$ROOM"

		# gets rid of parent media
	        if [[ -f "$i".wav ]]; then
	                rm "$i"
	        fi
	fi
done


# Review code to make sure it works. and the below ideas



# Is there an ffmpeg command that deletes the original copy? I just want the converted
# Trying out to see if it can be simplified down to one loop. 
# The beginning of the program hasn't changed, the Q: is the output the same?
# convert and add .wav
#for i in $NOTES/Recording*;
#do

#done


# Check for already converted
## Note, if files have already been converted, it will try to run again, just will ask to overwrite each one.
## having a check to see if both already exist (for each file with 
# quiet mode???

# can I store  "${i%.webm}" in a variable? If so, I can reduce speeling errors, work less
