# fleetingNotes
- get ideas out of your head so you can get back to processing instead of memorization

## Hello, all
- Welcome to my odd collection of wonderful tools.
- A small explanation of what's going on in this arena.

### Files and Folders
- `fleetWindow.sh`: this is the shining star of the show. This is what you set your hotkey to that pops up and gives you the wonderful utility of *fleetNotes*.
	- This also comes with a few different "cues" you can write in the notes to take different actions.
	- Following this format you can create new actions to be taken as you so wish.
- `sttToAnki.sh`: this takes the voice memos that have been transcribed and puts them into Anki
- `checkForFiles.sh`: this continually checks if a file has been transcribed (and therefore is now ready to be added to Anki) and then runs `sttToAnki.sh`.
- `audioNoteTranscribe/`: is the spot where transcribed audio (text files) is sent to and waits to be added by the `sttToText.sh` script.
- `note_folder/`: is basically an archive for the transcribed audio (holds the text files after being added to Anki).`

## Installation
- There are a couple of things needed to download and use this.

- Follow these steps for the:
	- `jo` package;                 https://github.com/jpmens/jo#build-from-release-tarball
	- AnkiConnect (Anki Plugin);    https://ankiweb.net/shared/info/2055492159
	- Setting custom hotkey;        https://help.ubuntu.com/stable/ubuntu-help/keyboard-shortcuts-set.html
        - For a script to set your own hotkeys; https://github.com/doomdagadiggiedahdah/.setup/blob/main/keybinds.sh
