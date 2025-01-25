#!/bin/fish
function test_concept
	echo "concept digest c test one" >> ./audioNoteTranscribe/c-one.txt
	echo "Concept digest c test two" >> ./audioNoteTranscribe/c-two.txt
	echo "concept Digest c test three" >> ./audioNoteTranscribe/c-three.txt
	echo "CONCEPT DIGEST c test four" >> ./audioNoteTranscribe/c-four.txt

	## inbox
	echo "normal test one" >> ./audioNoteTranscribe/i-one.txt
	echo "normal test two" >> ./audioNoteTranscribe/i-two.txt
	echo "normal test three" >> ./audioNoteTranscribe/i-three.txt
	echo "normal test four" >> ./audioNoteTranscribe/i-four.txt

	## memory_dump
	echo "memory dump m test one" >> ./audioNoteTranscribe/m-one.txt
	echo "Memory dump m test two" >> ./audioNoteTranscribe/m-two.txt
	echo "memory Dump m test three" >> ./audioNoteTranscribe/m-three.txt
	echo "MEMORY DUMP m test four" >> ./audioNoteTranscribe/m-four.txt
end

function prod
	cp xxx.txt ./audioNoteTranscribe/xxx-concept.txt && echo "concept digest" >> ./audioNoteTranscribe/xxx-concept.txt
	cp xxx.txt ./audioNoteTranscribe/xxx-memory.txt  && echo "memory dump"    >> ./audioNoteTranscribe/xxx-memory.txt
	cp xxx.txt ./audioNoteTranscribe/xxx-std.txt 
end

#test_concept
prod
./obs_con_mem.fish
