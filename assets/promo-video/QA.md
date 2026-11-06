# Historical QA for the previous cut

The viewer subsequently identified remaining problems in this cut. Those findings
supersede the pass claims below. The active revision and its evidence are documented
in [revision/QA.md](revision/QA.md). These older notes remain for provenance only.

## Physical-logic QA, Oct 26 2026

Every clip reviewed as an 8 fps grid (one row = one second), with 12–24 fps zooms on hands, faces and crowds,
plus scene-cut detection (ffmpeg scdet) and word timings (faster-whisper) for the dialogue.

| where | clip | problem | fix |
|---|---|---|---|
| 0:50 | train-phones | hand leaves the phone to gesture; phone hangs at her ear | regenerated; new take has her holding two phones to her face at 2.7–4.3s, so only 0.3–2.2s and 4.4–8.0s are used |
| 0:41 | train-trainer | a man's flat cap morphs into slicked-back hair at 3.65s | segment ends at 3.29s (7 beats; train-arrive gets the beat) |
| 1:09 | train-arrive | teen's face ghosts into the coffee steam at 4.5–4.9s | use 6.15–8.0s |
| 1:07 | train-turf | knot of hands at 4.5–5.5s, unreadable | use 6.0–7.8s |
| 3:03 | field-snow | red-coat man reaches through the man knocking, swallowing him | use 3.0–4.8s |
| 2:25 | field-porch | 5-frame flash of a new angle (Kling's internal cut at 5.58s) | start 0.1s so it ends at 5.52s |
| 4:41 | field-porch | 1-frame flash of the previous angle (cut at 2.04s) | start 2.1s |
| 4:26 | win-cheer | 8-frame flash before Seedance's internal cut at 1.33s | start 1.375s |
| 4:33 | win-crowd | ran 0.14s past the clip's end (freeze frame) | start 1.35s |
| 4:04 | train-graduate | ran 0.1s past the clip's end | start 4.35s |
| 0:44 | train-roleplay | "Yes, I suppose—" cut mid-word | 14 beats (train-smallgroup gives up 2) |
| 1:55 | field-apartment | dad cut off mid-sentence | 13 beats from 0s (fairbooth −1, truck −4) |
| 3:32 | win-pepTalk | "Let's—" cut mid-word | 14 beats (win-carpool gives up 2) |

Passed after zooming: train-roleplay, train-smallgroup (occlusion, not a vanish), train-snowflake (a woman walks in
front of the seated man), train-graduate, field-farmhouse (one dog), field-sidewalk, field-kitchen, field-fairbooth,
field-textbank, field-apartment, field-elder, field-campus (the clipboard is in her other hand), field-truck,
field-steps, field-warroom, field-diner, field-rain, field-doorstep, win-carpool, win-walk (hats and clipboards
consistent), win-highfive, win-dawn (the indoor→outdoor jump happens before 4.4s), win-portrait,
win-rancher (the selfie arm ends before 2.0s), win-crowd, win-cheer, and all landscapes.

`node edit.mjs --plan` now fails if a segment runs past its clip or flashes a few frames of an internal cut.

## Second pass, Oct 27 2026 (from viewer notes)

Checks added: laughter detection on every clip's audio (AudioSet classifier), OCR on every clip at 4 fps (macOS
Vision) for lettering, and a hidden-cut scan. Every regenerated clip was reviewed at 12 fps.

| note | fix |
|---|---|
| laughter with no joke | train-trainer, train-roleplay, field-kitchen regenerated with "nobody laughs"; field-porch now starts after its laugh, campus/walk/carpool ambience muted |
| man "writing" on the wall leaves no line | train-snowflake dropped: three takes all put gibberish labels on the chart; the snowflake graphic runs longer |
| kitchen cup vanishes under a hand | field-kitchen regenerated; mugs stay put |
| letters on shirt chests | prompts require plain clothing; field-textbank (misspelled "UNIVERSITY" in every frame) cut; carnival sign "YAGU" blurred |
| group hug at 1:41 | train-graduate regenerated: applause and handshakes |
| dog duplicated from the porch shot at 1:48 | field-farmhouse regenerated with no animals |
| teenage girls at 2:09 | field-fairbooth regenerated with an adult couple |
| man walks through the truck door at 2:12 | field-truck regenerated; he stands beside the open door |
| couple running for no reason at 2:15 | field-rain regenerated as a doorstep conversation |
| three people walking in snow at 2:17 | field-snow regenerated as a doorstep conversation |

Glitches in the new takes, cut around: the rancher's cap changes color (field-farmhouse before 2.0s), the canvasser
works the door handle (field-snow before 1.7s), knocking with the resident already there (field-rain before 2.2s),
teammates walking in mid-celebration (win-highfive before 1.4s), and gibberish print on the fair organizer's polo
(field-fairbooth after 4.3s).

Every frame of the final file carries the same color tags (limited-range BT.709); before, cards and footage switched
between BT.601/BT.709 and full/limited range mid-stream.

From now on kie.ai is limited to Seedance 2.5 at 1080p (`lib/kie.mjs` refuses anything else).

## Completion pass, Oct 27 2026

Resumed the interrupted final review and rendered the last timeline change into
`../organize-sd-promo.mp4` with `node edit.mjs --proof`.

- The campus shot at 2:33 now starts at source 4.1s, before the extra-hand artifact
  near source 6.0s. Reviewed every output frame of that segment in
  `build/qa/campus-final.jpg`.
- Reviewed the remaining 12 fps contact sheets, `build/qa/sweep/040.jpg` through
  `063.jpg`, completing the interrupted sweep. No additional obvious physical
  continuity defects found in those sampled frames.
- Rechecked `build/qa/every/farm-tube.jpg`: the farmhouse clipboard rotates
  edge-on while remaining held in her left hand; it does not become a tube.
- Rechecked the three full-frame, 24 fps phone sheets in `build/qa/every/`.
  The current phone shot is at 1:11.04–1:16.58 (the earlier 0:51 location has
  moved as the edit changed). Her hand supports the phone throughout. At 0:51,
  the current edit shows the roleplay; `at51.jpg` covers that transition.
- Preserved the stray-word mute in the roleplay (source 1.94–2.35s) and all
  earlier repairs. Only the campus video segment changed in this render;
  the remaining cached segments were reused.
- Checked the rendered end card and disclaimer in `build/proof/090.jpg` and
  `091.jpg`. Full-segment contact sheet: `build/proof.jpg`.

Visual review combines sampled contact sheets with every-frame checks of the
specific problem shots; it is not a claim that automated scene-change detection
can establish physical correctness.

Final export checks:

- `node edit.mjs --plan`: no source overrun or short internal-cut flashes.
- Full video/audio decode with `ffmpeg -v error -xerror`: exit 0, no errors.
- 1,920 × 1,080 H.264, 24 fps, 7,172 frames, 4:58.833; limited-range BT.709.
- Stereo AAC, 48 kHz; audio and video durations agree within one frame.
- Measured encoded audio: −14.06 LUFS integrated, −1.74 dBTP true peak.
- MP4 metadata precedes media data for fast-start playback; 531,550,046 bytes.
- `node qa.mjs`: scored all 7,172 frames. Nine detections outside timeline cuts:
  six overlay exit animations and three existing camera-angle cuts in the pep
  talk. Reviewed the three camera-cut grids; no brief flash or new anomaly.
- Evidence: `build/plan-final.txt`, `build/render-finish.log`,
  `build/decode-final.log`, `build/probe-final.json`, `build/loudness-final.log`,
  and `build/qa-scan-final.txt`.
