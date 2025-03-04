#!/bin/bash

# Note, this script is only acting on the files in the General room,
# anything that's currently in the Audio Notes directory isn't affected.

ROOM="$HOME/Documents/Obsidian_Folders/General/Transcribed Notes.md"
NOTES="$HOME/Documents/Obsidian_Folders/General"
cd $NOTES


# Note, if files have already been converted, it will try to run again, just will ask to overwrite each one.
# having a check to see if both already exist (for each file with 

for i in ./*.wav;
do

	# "title" of recording and tag for start of Transcript
	echo -e \![["$i"]] "\n\nTranscript:" >> "$ROOM"

	# the transcription going to the note page
	deepspeech --model ~/deepspeech/deepspeech-0.9.3-models.pbmm --scorer ~/deepspeech/deepspeech-0.9.3-models.scorer --audio "$i" >> "$ROOM"

	# space to make easy to read
	echo -e "\n\n---\n" >> "$ROOM"

done


# Sigh, now the link in Obsidian isn't working to call the player/reference parent media. Don't know how to fix this
## Parameter expansion? Just for the "title" spot I could remove everything to the left of "Recording #####"???
