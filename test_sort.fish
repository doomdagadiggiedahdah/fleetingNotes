#!/bin/fish

set NOTE_DIR "./audioNoteTranscribe"

function inbox_test
	echo "normal test one" >> "$NOTE_DIR"/i-one.txt
	echo "normal test two" >> "$NOTE_DIR/i-two.txt"
	echo "normal test three" >> "$NOTE_DIR/i-three.txt"
	echo "normal test four" >> "$NOTE_DIR/i-four.txt"
end

function concept_test
	echo "concept digest c test one" >> "$NOTE_DIR/c-one.txt"
	echo "Concept digest c test two" >> "$NOTE_DIR/c-two.txt"
	echo "concept Digest c test three" >> "$NOTE_DIR/c-three.txt"
	echo "CONCEPT DIGEST c test four" >> "$NOTE_DIR/c-four.txt"
end

function mem_test
	echo "memory dump m test one" >> "$NOTE_DIR/m-one.txt"
	echo "Memory dump m test two" >> "$NOTE_DIR/m-two.txt"
	echo "memory Dump m test three" >> "$NOTE_DIR/m-three.txt"
	echo "MEMORY DUMP m test four" >> "$NOTE_DIR/m-four.txt"
end

function prod
	cp xxx.txt "$NOTE_DIR/xxx-concept.txt" && echo "concept digest" >> "$NOTE_DIR/xxx-concept.txt"
	cp xxx.txt "$NOTE_DIR/xxx-memory.txt"  && echo "memory dump"    >> "$NOTE_DIR/xxx-memory.txt"
	cp xxx.txt "$NOTE_DIR/xxx-std.txt"
end

inbox_test
./to_obsidian.fish
