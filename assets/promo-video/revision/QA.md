# Third revision: frame-by-frame notes (October 27, 2026)

Active edit: `timeline-v3.mjs`, exported by `../timeline.mjs`. Output: `../../organize-sd-promo.mp4`.
The second revision's master and timeline are kept as `organize-sd-promo-v2.mp4` and `timeline-v2.mjs`.
Timestamps below are the viewer's, in the second master; the beat grid is unchanged, so they land on
the same scenes in this one.

## Changes tied to the notes

| Note | Change and review evidence |
|---|---|
| Waitress with a coffee pot walks in and out (1:24, 3:08, 4:15) | `r3-diner` regenerated from the diner's own first frame, before she enters. Reviewed at 6 fps (whole frame) and 12 fps (hands, cups): only the two people, background empty, nothing moves on the table (`review3/diner-*.jpg`). |
| Sign-up sheet faces the wrong way (1:31, 2:03, 3:00, 3:50, 4:23, 4:30) | New first frame (`campus_frame.py`): the clipboard turned toward the student, clip and header on the near edge. `r3-campus` generated from it: he writes one line with the pen in his right hand, looks up and nods; the board never moves or flips (12 fps: `review3/campus-board-12fps-*.jpg`). |
| Generic text and logo instead of the supplied branding (board, canvass map and materials, training folder, tablecloth) | `brand.py` reprints every prop with `logo-orange-white-megaphone-4K.png`: poster header, map header, field guide, pocket cards, training folder, listening banner, the sign-up tablecloth, and the small logo in the sign-up sheet's header, printed upside down to the camera like the rest of that header so it reads upright for the signer (`r3-campus` → `r3-campus-print`; the tablecloth print sits on the right of the drape, clear of the captions). Only the ink changes: the old lettering is painted out of the filmed stock (smooth-light fit on boards, covers and paper, fold-following fill on fabric) and the new print takes the stock's light, folds and grain, its white matched to the cream of the lettering it replaces. Diffs against the source frames touch only lettering; all five tracked through every frame with no weak track (`review3/print-*.jpg`). The end card uses the same logo. |
| Captions that don't match the footage (1:17, 3:10) | 1:13–1:20: "From Sioux Falls…" over the falls, then "…to every Main Street." over the main-street shot. 3:10: "Keep showing up / Rain or shine." over the storm. Every caption was then checked against its shot; also changed: "Plan the week as a team." (kitchen), "Built town by town." (main street), "Plan the next visit." (map), and the four sign-up captions now name what is shown: "Sign up for a shift.", "Sign new people up.", "Every name counts.", "More people signing up." |
| Poorly done frame at 2:31 | It was an upscaled 800×450 crop of an older clip. Replaced by `r3-resident`, a native 1080p close shot of the same exchange: "What do you think about the neighborhood?" / "You know… nobody's ever asked me that before." No lettering in frame. |
| Election-night watch party for the Win chapter | `r4-watchparty` at 3:59: the room watches tensely under "Election night / Watch the returns together.", then erupts as "The goal / Win together." lands; it returns behind the closing "WIN." The first take (`r3-watchparty`) pushed in too fast to put a logo on its backdrop, so it was reshot from its own first frame with the logo printed on the backdrop (`watchparty_frame.py`) and a locked-off camera; the logo stays whole and fixed through the shot (`review3/r4-logo-12fps.jpg`). The edit ends before 6.8 s of the take, where hands start to meet overhead (the audit enforces it), and mutes garbled murmurs before the cheer. |
| Frying pan the model left on the kitchen table | The kitchen is reframed above it (the audit asserts the crop). |

## Source review

- Generation (Seedance 2.5, 1080p): r3-diner 790 credits, r3-campus 948, r3-resident 1,264,
  r3-watchparty 1,580 (not used), r4-watchparty 1,580. Prompts in `shots.mjs`; inputs, task IDs and results in `manifest.json`.
- Dialogue timed with `transcribe.py` (word level). `speech.json` records each line's first and last
  word; the resident's runs 0.48–7.70 s, so her shot starts at 0.35 s and keeps 0.3 s after "before."
- The campus soundtrack holds no speech (the transcriber's words there are pen noise at −41 dB, mixed
  at 0.1). The watch party's murmurs at 1.8–4.15 s are muted; the final mix holds no speech there.

## Edit verification

- `node edit.mjs --plan`: no freeze frames or flash cuts (`plan.txt`).
- `node revision/audit.mjs` passed (`audit.txt`): 75 segments, 656 beats, 7,172 frames; replaced and
  rejected footage absent (including the raw `r3-campus`), every clip captioned, dialogue whole.
- Transcribed the five exchanges from the final mix (`transcripts-v3.txt`): every question and answer
  is complete.
- Reviewed every one of the master's 7,172 frames, in order, on 75 sheets of 96 numbered frames, each
  headed by the master's checksum (`every_frame.py --all` → `review3/all/000.jpg` … `074.jpg`; checksum
  530217751c35e62c, the final file below, unchanged since). No waitress anywhere; the sign-up sheet faces
  its signer in every sign-up frame; the poster, map, field guide, cards, folder, banner, tablecloth,
  sheet header, watch-party backdrop and end card all carry the real logo; every caption matches its shot.
- The full review above is the evidence for the final file. Earlier passes, kept for the record:
  every frame of the flagged footage and the watch party (2,773 frames, `review3/every/`), made from the
  render just before the watch-party mute (an audio-only change); and, from the cut before the
  watch-party reshoot and the caption changes, the frames at each note's timestamp
  (`review3/final-flagged.jpg`), the sign-up sheet zoomed at each sign-up timestamp
  (`review3/final-sheet.jpg`, `final-sheet-351.jpg`) and a one-frame-per-second sweep
  (`review3/sweep-01.jpg` … `sweep-10.jpg`).
- The sheet's header logo was checked at every frame at 12 fps (`review3/print-sheet-12fps.jpg`).
  Patches are composited premultiplied by alpha, so no dark fringe appears at their edges.
- Final master: 1920×1080 H.264, 24 fps, 7,172 frames, 4:58.833, BT.709 limited range; AAC stereo
  at 48 kHz (`probe-v3.txt`). −14.1 LUFS integrated, −2.0 dBTP true peak, 5.5 LU range
  (`loudness-v3.log`). Full decode exit 0 with an empty error log (`decode-v3.log`).
- Scored all 7,172 frames (`scan-v3.txt`): six unplanned spikes, each a big-title fade over continuous
  footage (frames 171, 262, 353, 4,789, 5,953, 6,255; 5,953 inspected in `review3/spike-5953.jpg`).

Final master: 467,770,987 bytes.
SHA-256: `530217751c35e62ce08a83a2770c9458049aba8a92568c68bc08a576925f9467`.

Contact sheets support a visual review; cut detection and transcription alone do not establish
physical correctness or a guarantee against all generated artifacts.

---

# Second revision: viewer feedback (October 27, 2026)

Edit: `timeline-v2.mjs`; its master is kept as `organize-sd-promo-v2.mp4`. The master and timeline
before it are preserved as `organize-sd-promo-before.mp4` and `timeline-before.mjs`.

## Changes tied to viewer feedback

| Viewer issue | Change and review evidence |
|---|---|
| Extra hands and crowded hand activity | Removed the original turf-planning, war-room, group-signing, high-five, crowd, and carpool shots. Six new shots use stable positions and separate hands. Inspected their complete 24 fps hand/prop crops in `review/every/`, plus full-frame 8 fps grids. |
| People approaching while others leave on the stairs | Removed every use of `field-steps` and `field-sidewalk`. No replacement stair movement. |
| Awkward roleplay | Replaced with a seated listening exercise. The woman asks what the partner would change in his neighborhood; he answers “Safer streets.” Both retain their own hands in their laps. It is introduced as listening practice. |
| Awkward Brookings phone introduction | Replaced with “Would you like to join our next volunteer training?” One right hand continuously holds one phone; the other rests on the table. |
| Scenes without context | Rebuilt the sequence around learning, preparation, recruitment, listening, debriefing, and follow-up. Every footage segment has its own caption or a caption continuing over the sequence. Rapid callbacks are presented as a skills recap. Removed disconnected portraits and celebrations. The 2028 outcomes are explicitly goals. |
| Father holding baby should answer at his door | New continuous two-person doorway scene: organizer outside asks “What matters most to your family right now?” Father inside answers “Finding affordable childcare. That's our biggest worry.” He supports the infant with the same two arms throughout. Main scene: 2:18.500–2:27.583. |
| Blank materials | Replaced maps, field guides, phone-training booklet, training poster, sign-up sheet, and table covering with readable Organize SD branding. Removed old unbranded clipboards and handouts. |
| Pickup has an extra open rear door | Removed every use of the truck and carpool footage. |
| People signing a clipboard together | One seated adult student writes on one clipboard lying on the table. The organizer keeps her hands in her lap, then acknowledges him. No clipboard handoff. |
| Use the supplied shirts | White TRAIN. ORGANIZE. WIN. shirt on trainer; purple FIELD CREW on phone volunteer and campus organizer; purple signature state/megaphone shirt in listening practice and doorway scene. The three user references are preserved in `../references/`. |

## Source review

- All six replacement jobs completed and their video files were saved locally.
  Prompts, image hashes, task IDs, and results are in `shots.mjs` and `manifest.json`.
- Inspected full-frame 8 fps grids for all six sources (`review/*.jpg`).
- Inspected every frame at 24 fps in cropped contact sheets for all six sources:
  trainer 01–05, practice 01–05, phone 01–05, materials 01–05,
  campus 01–05, doorway 01–07. No obvious extra limbs, detached phones,
  shared signing, or baby-holding discontinuity found in those views.
- `transcripts.txt` records local word-level transcription. Dialogue endings:
  trainer 4.04s, practice 5.32s, phone 2.84s, father 7.58s, retained resident 7.38s.
  Each spoken segment includes its complete line and trailing room.
- Non-dialogue reuse of speaking footage is muted. The retained kitchen and elder
  clips' unrelated original speech is completely muted.
- Retained diner selections end before the handshake. Training arrival selections
  avoid the coffee-steam face artifact identified in the older review.
- Also inspected every frame in the selected retained kitchen, diner, arrival,
  and elder ranges (`review/every/retained-*.jpg`); cups and hands remained
  connected and stable in those views. Retained doorstep reviewed at 6 fps; final close-up reviewed at 8 fps.
- Reframed the retained resident conversation as a close-up, excluding the cap
  with generated lettering. The organizer asks from off camera; the resident's
  original answer remains complete. This is a local crop of `field-doorstep.mp4`,
  not an additional generation. See `resident-close.mjs` for its reproducible edit.

## Edit verification

- `node edit.mjs --plan` passed: no source overrun beyond the editor's tolerance
  and no brief internal-cut flashes (`plan.txt`).
- `node revision/audit.mjs` passed (`audit.txt`): 76 segments, 656 beats, 7,172 frames;
  all six replacements present; rejected footage absent; every footage segment has
  on-screen context; dialogue endings retained. Exact times: `edit-manifest.json`.
- Final master: 1920×1080 H.264, 24 fps, 7,172 frames, 4:58.833, BT.709 limited
  range; AAC stereo at 48 kHz. Fast-start MP4 metadata precedes the media data.
  Machine-readable stream and checksum evidence: `probe-final.json`.
- Reviewed the middle frame of all 76 final segments (`review/final-proof-01.jpg`
  through `final-proof-05.jpg`), including the reframed resident conversation.
- Transcribed all five dialogue exchanges extracted from the final mix
  (`transcripts-final.txt`); every question and answer is complete.
- Final mixed audio measures −14.05 LUFS integrated, −1.94 dBTP true peak,
  and 5.50 LU loudness range (`loudness-final.log`, input measurements).
- Scored all 7,172 exported frames (`scan-final.txt`). Inspected the six flagged
  events at frames 171, 262, 353, 4,789, 5,867, and 6,255. Each is the expected
  big-title fade-out, with continuous underlying scenery; no unexpected internal
  camera cut was found in those windows (`../build/qa/spikes/`).
- Full-file audio/video decode completed with exit code 0 and an empty error log
  (`decode-final.log`).
- Reviewed a one-frame-per-second sweep of the entire final master, including
  the closing CTA and disclosure (`review/final-sweep-01.jpg` through
  `final-sweep-10.jpg`). The rejected sequences are absent, new captions and
  branding appear in the intended scenes, and the resident close-up is present.

Final master: 468,691,274 bytes.
SHA-256: `e0e76752cad4c76124c191938b4a82a39e8ea5dc4af6fd1677006743d5736e83`.

Contact sheets support a visual review; cut detection and transcription alone do
not establish physical correctness or a guarantee against all generated artifacts.
