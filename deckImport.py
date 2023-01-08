#I thought I had this working but now I can't :,(

from anki.storage import Collection
import pyperclip

ankiDeck = "/home/mat/Documents/ProgramExperiments/fleetingNotes/collection.anki2"

col = Collection(ankiDeck, log=True)

cardType = col.models.by_name('Basic')
deck = col.deck.by_name("Default")
col.decks.select(deck['id'])
col.decks.current()['mid'] = cardType['id']

note = col.newNote()
note.fields[0] = pyperclip.paste()
col.add_note(note, deck['id'])

col.save()