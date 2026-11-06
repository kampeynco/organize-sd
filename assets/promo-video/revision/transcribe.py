# Word-level timing of a clip's dialogue, in the transcripts.txt format (first and last word times feed speech.json).
#
#   .venv/bin/python revision/transcribe.py clips/r3-resident.mp4 [...]
import os
import sys
from faster_whisper import WhisperModel

model = WhisperModel('small.en', device='cpu', compute_type='int8')
for path in sys.argv[1:]:
    segments, _ = model.transcribe(path, word_timestamps=True, beam_size=5)
    words = [w for s in segments for w in s.words]
    print(os.path.basename(path), '|', ' / '.join(f'{w.start:.2f}-{w.end:.2f} {w.word.strip()}' for w in words))
