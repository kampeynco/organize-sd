# Organize SD promo video

Builds `../organize-sd-promo.mp4`, a ~5-minute video for Organize SD: generated footage,
a Suno V6 score, canvas motion graphics, and an edit cut to the beat in ffmpeg.

The active edit is `revision/timeline-v3.mjs`, exported by `timeline.mjs`. The second
revision replaced the shots rejected in viewer feedback with six reference-based clips and
added context for preparation, practice, recruitment, listening, and follow-up. The third
prints the real logo (`../logo-orange-white-megaphone-4K.png`) on every prop, turns the sign-up sheet toward
its signer, removes the diner waitress, replaces the upscaled resident crop, matches the
captions to their footage, and ends the Win chapter on an election-night watch party.
The supplied shirts and new branded scene references are in `references/`.
See `revision/QA.md` for the current review; `QA.md` preserves the older cut's history.

```
npm install          # playwright-core, for rendering the graphics (uses the cached Playwright Chromium)
node edit.mjs --plan # check the active cut against the existing source durations
node edit.mjs        # timeline.mjs → ../organize-sd-promo.mp4
```

`KIE_API_KEY` is read from the shell or `organize-sd/.env.local`. Needs ffmpeg and Node 22.

The footage and score already exist locally; rendering does not require a generation
request. To inspect or resume the revision's persisted generation jobs:

```
node revision/generate.mjs status
node revision/generate.mjs poll
```

`revision/shots.mjs` holds the revised prompts (`r2-*`, `r3-*`, `r4-watchparty`). `revision/manifest.json` records
their inputs and task IDs. Do not re-submit a job after an observation error; poll
the recorded ID. `submit` spends credits only for shots with no recorded submission.
The older `generate.mjs`, `shots.mjs`, and `music.mjs` are retained as production history;
their generic unbranded prompts are not the source for the current replacements.

## Files

- `shots.mjs`: every shot's prompt and model. Crowd shots spell out who is in them (`SD_CROWD`): left
  unspecified, the models cast rooms that don't look like South Dakota.
- `generate.mjs`: submits shots, polls, downloads. It's re-runnable: finished clips are skipped, and in-flight
  tasks resume from `clips/manifest.json`. `--redo id,id` regenerates shots and keeps the old take beside the new
  one. It won't spend past the account balance, and it retries Veo's intermittent "500 Internal Error" (failed
  tasks aren't billed).
- `timeline.mjs`: exports the current edit from `revision/timeline-v3.mjs`. Each segment
  lasts a whole number of beats; assertions preserve each chapter's musical boundary.
  `revision/timeline-before.mjs` and `revision/organize-sd-promo-before.mp4` preserve the original
  cut; `revision/timeline-v2.mjs` and `revision/organize-sd-promo-v2.mp4` the second.
- `revision/brand.py`: reprints the generated props with the real logo by planar tracking (`r2-*` → `r3-*`,
  and `r3-campus` → `r3-campus-print`). Only the ink changes: the old lettering is painted out of the
  filmed stock, and the new print takes the stock's light, folds and grain, its white matched to the
  ink it replaces. `--still` previews frame 0 in `build/brand/`.
  `revision/campus_frame.py` and `revision/watchparty_frame.py` build the first frames the sign-up table
  and watch party were regenerated from; `revision/every_frame.py` sheets every frame of the scenes
  the viewer flagged, or with `--all` every frame of the finished master, from that file. Both run in the project
  venv: `python3 -m venv .venv && .venv/bin/pip install opencv-python-headless numpy pillow
  fonttools brotli faster-whisper`, then `.venv/bin/python revision/brand.py [job]`.
- `revision/audit.mjs`: checks the active cut — rejected footage absent, every clip captioned, every
  dialogue line whole (`revision/speech.json`, timed with `revision/transcribe.py`).
- `beats.mjs`: beat tracker (spectral flux → tempo → dynamic-programming beats), writes `build/beats.json`.
- `graphics/scenes.js`: motion graphics drawn on a canvas (slams, statements, lower thirds, the county map from
  `public/election/counties.json`, the snowflake model, end card, disclaimer). `graphics/render.mjs` renders them
  frame by frame in headless Chromium. Check a design with
  `node graphics/render.mjs --still slam '{"word":"TRAIN."}' 1`.
- `edit.mjs`: renders each segment, joins them, and mixes score + ambience + dialogue (the score ducks under
  dialogue) + synthesized hits, normalised to -14 LUFS. Segments are cached in `build/`, so after a change
  only the affected segments re-render. `--plan` prints the cut list; `--range 9-16` renders a preview of some
  segments; `--proof` writes a contact sheet.

kie.ai use is limited to Seedance 2.5 at 1080p (about 1,264 credits per 8-second clip); `lib/kie.mjs` refuses
other models, and `generate.mjs` routes every shot to it. Re-cut existing footage where you can.

`node qa.mjs` scores every frame of the finished video and lists sudden changes that aren't planned cuts.

AI footage breaks physics now and then: floating phones, a hat that turns into hair, a face that ghosts into steam.
`QA.md` lists what was found and how each was fixed. Check every new or regenerated clip the same way: frame
grids (`ffmpeg -vf "select='not(mod(n\,3))',scale=480:270,tile=8x8"`, one row per second) and zooms on hands,
faces and crowds.

Generated clips are kept by kie.ai for 14 days; the copies in `clips/` are the only lasting ones.
