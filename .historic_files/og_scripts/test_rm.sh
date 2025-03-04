#!/bin/bash

NOTES="$HOME/Documents/Obsidian_Folders/General"

for i in $NOTES/*.wav;
do
	if [[ -f "$i".wav ]]; then
		rm "$i"
	fi
done

mv *.wav ./"Audio Notes"
