// Shot list for the Organize SD promo. Each shot becomes one generated clip in clips/<id>.mp4.
// Costs are kie.ai credits (1 credit ≈ $0.005) as listed on kie.ai in Oct 2026.

// Veo 3.1 tiers are billed per clip; Kling 4.0 and Seedance 2.5 per second.
export const MODELS = {
  'veo-lite': { model: 'veo-3-1', cost: () => 35, input: (s) => veo(s, 'veo3_lite') },
  'veo-fast': { model: 'veo-3-1', cost: () => 65, input: (s) => veo(s, 'veo3_fast') },
  kling: {
    model: 'kling-4.0/reference-to-video',
    cost: (s) => 42.5 * s.duration,
    input: (s) => ({ prompt: s.prompt, duration: s.duration, resolution: '1080p', aspect_ratio: '16:9' }),
  },
  // The only engine generate.mjs may use now (lib/kie.mjs enforces it); the others document how older clips were made
  seedance: {
    model: 'bytedance/seedance-2-5',
    cost: (s) => 158 * s.duration,
    input: (s) => ({
      prompt: s.prompt,
      duration: s.duration,
      resolution: '1080p',
      aspect_ratio: '16:9',
      generate_audio: true,
    }),
  },
};

function veo(s, tier) {
  return {
    prompt: s.prompt,
    model: tier,
    generation_type: 'TEXT_2_VIDEO',
    aspect_ratio: '16:9',
    resolution: '1080p',
    duration: 8,
  };
}

// The look from the creative brief, applied to every people shot
const DOC =
  'Shot on a handheld Arri Alexa Mini, 35mm lens, subtle organic handheld shake, slow focus-hunt. ' +
  'Real natural light casting realistic soft shadows. Visible skin texture, fine pores and wrinkles, no artificial smoothing, ' +
  'zero glossy AI skin, raw documentary physics, lifelike body anatomy and natural hands. Muted, true-to-life color. ' +
  'No on-screen text, no captions, no logos, no readable writing on any sign, paper, shirt or screen. ' +
  // Rules added after review: models print letters on shirts, cast teenagers, add laughter, and let objects
  // vanish or pass through each other unless told not to
  'Everyone wears plain solid-color clothing and plain caps: no letters, numbers, words, logos, patches, badges or ' +
  'name tags on any clothing. Every person shown is an adult. Expressions are warm, sincere and engaged; nobody laughs. ' +
  'Every object stays solid and in place unless a hand moves it; nothing appears, vanishes, duplicates or passes ' +
  'through anything; doors open before anyone passes through them; each person and animal appears only once.';

// Unspecified crowds come out homogeneous (a first take of train-trainer cast an all-East-Asian room),
// so every group shot names who is in it
const SD_CROWD =
  'everyday South Dakotans who look like the real state: mostly white Midwesterners of Scandinavian and German ' +
  'heritage, plus Lakota Native American and Hispanic neighbors, ages twenty to seventy-five, jeans, flannel, ' +
  'fleece, plain caps and work jackets';

const AERIAL =
  'Cinematic ultra-realistic aerial drone footage, smooth slow forward glide, natural color, documentary nature-film look. ' +
  'No text, no logos, no people close to camera.';

const shot = (id, engine, prompt, extra = {}) => ({ id, engine, duration: 8, prompt, ...extra });

export const SHOTS = [
  // ── Act 1: the land ────────────────────────────────────────────────────────────────────────────
  shot('land-prairie', 'veo-lite',
    `${AERIAL} Golden dawn over endless South Dakota prairie, wind rippling through tall grass in waves, a lone gravel road running straight to the horizon, long shadows. Audio: strong prairie wind, meadowlark song.`),
  shot('land-badlands', 'veo-lite',
    `${AERIAL} Sunrise over the South Dakota Badlands, layered striped buttes and spires glowing pink, gold and ochre, morning haze in the canyons, slow push forward between the formations. Audio: soft wind.`),
  shot('land-mainstreet', 'veo-lite',
    `Cinematic ultra-realistic wide shot of a small-town South Dakota main street at early morning, two-story brick storefronts, a tall grain elevator at the end of the street, a dusty pickup truck rolls past, warm low sun, slow handheld drift. No readable signs or text. Audio: truck engine passing, birds, distant train horn.`),
  shot('land-falls', 'veo-lite',
    `Cinematic ultra-realistic footage of the waterfalls of the Big Sioux River in Sioux Falls, South Dakota, pink quartzite rock ledges, white water tumbling, morning mist catching sunlight, slow gimbal push toward the falls. Audio: rushing water.`),
  shot('land-blackhills', 'veo-lite',
    `${AERIAL} Black Hills of South Dakota at sunrise, dark ponderosa pine ridges, morning fog filling the valleys, granite outcrops catching first light, slow glide over the ridgeline. Audio: wind through pines.`),
  shot('land-harvest', 'veo-lite',
    `${AERIAL} A combine harvesting a golden wheat field in eastern South Dakota at sunset, dust glowing in the backlight, a farmhouse and red barn with a windbreak of trees in the distance. Audio: distant combine engine, wind.`),
  shot('land-farmstead', 'veo-lite',
    `${AERIAL} A lone South Dakota farmstead at blue hour after the first snow, warm yellow light glowing in the farmhouse windows, a long driveway, snow-dusted fields stretching to the horizon. Audio: quiet wind, a dog barking far away.`),
  shot('land-porchlights', 'veo-lite',
    `Cinematic ultra-realistic slow dolly shot along a quiet residential street in Rapid City, South Dakota at dusk, modest one-story houses, porch lights flicking on one after another, the Black Hills silhouetted behind, autumn leaves on lawns. No readable text. Audio: crickets, a screen door, distant kids playing.`),

  // ── Act 2: train ───────────────────────────────────────────────────────────────────────────────
  shot('train-arrive', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. Friday evening in a small-town South Dakota church fellowship hall: about twenty-five ${SD_CROWD} arrive for a weekend organizer training — they shake hands, greet each other with warm smiles and pour coffee from big steel urns into paper cups; folding tables and chairs, warm fluorescent and window light. Handheld camera weaves through the room. ${DOC} Audio: room chatter, coffee pouring, no laughter.`),
  // Earlier take had the audience roaring with laughter at a line that isn't a joke
  shot('train-trainer', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. A seasoned white female trainer in her fifties with gray-streaked hair and a fleece vest stands at the front of a church fellowship hall beside a large blank paper easel pad, gestures with energy toward the group and says clearly: "Every conversation counts. Let's go again!" Rows of participants — ${SD_CROWD} — listen attentively, nodding, a few writing notes, warm focused expressions with slight smiles; nobody laughs. ${DOC} Audio: her voice only, quiet attentive room tone, no laughter.`),
  shot('train-turf', 'veo-fast',
    `Cinematic, ultra-realistic documentary close-up. Several pairs of hands lean over a large printed street map spread across a folding table, drawing circles and routes with colored markers, placing small orange and teal sticky dots, coffee cups at the edges, a person points and others nod. Shallow depth of field, warm light. ${DOC} Audio: markers squeaking, overlapping planning chatter.`),
  // Earlier take had the farmer cracking up at "got a minute?"
  shot('train-roleplay', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. In a training hall with a plain bare painted wall behind them, a Lakota woman in her late twenties with long dark hair in a braid practices a doorstep conversation with an older white farmer in a plain olive cap who plays the voter. She smiles and says: "Hi, I'm your neighbor from up the road — got a minute?" He looks at her, nods with a friendly, sincere expression and answers: "Well, hello there. Yes, I suppose I do." Other adult trainees watch quietly in the soft-focus background. No signs, cards, posters or paper anywhere in the frame. ${DOC} Audio: their dialogue only, quiet room tone.`),
  shot('train-smallgroup', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. A young Black man in his early twenties, a college student, leads a small circle of five adults of different ages — ${SD_CROWD} — around a folding table, counting on his fingers as he explains a plan; they nod, take notes on paper, one woman raises her hand with a question. Slow handheld push-in. ${DOC} Audio: his calm voice, pens on paper.`),
  // Earlier take: a marker moved over the wall but left no line, so nothing here is drawn on camera
  shot('train-snowflake', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. In a church fellowship hall, a large sheet of white paper is taped to the wall showing a finished hand-drawn branching diagram made only of circles and connecting lines: one circle in the middle joined by lines to five circles, each joined to smaller circles. The circles are empty: no words, letters, numbers or labels anywhere on the paper. A white male trainer in his forties in a plain flannel shirt, both hands otherwise empty, presses one bright orange paper circle onto the end of a branch, smooths it flat with his palm, then steps back and points to the center circle while a dozen participants — ${SD_CROWD} — watch and nod. Nothing is drawn or written during the shot. ${DOC} Audio: paper rustling, his quiet voice, room tone.`),
  // Earlier takes broke physics (a phone left floating at her ear; two phones held to her face at once),
  // so this one keeps her hands busy with simple, separate jobs and the background soft
  shot('train-phones', 'veo-fast',
    `Cinematic, ultra-realistic documentary medium close-up. At a long table in a bright church fellowship hall, a white woman in her sixties with reading glasses, a navy ball cap and a red flannel shirt under a fleece vest makes a volunteer phone call. Her right hand holds a single black cell phone pressed to her right ear for the entire shot and never moves away; her left hand rests on the table holding a pen over a printed call list. She smiles and says warmly into the phone, once: "Hi! I'm a volunteer right here in Brookings." Behind her, out of focus, a row of other volunteers on calls. Exactly one phone in the whole foreground. Slow, steady handheld push-in. ${DOC} Audio: her voice, soft room chatter.`),
  // spare take of the same shot, not used in the edit
  shot('train-phones-alt', 'veo-fast',
    `Cinematic, ultra-realistic documentary medium close-up. At a long table in a bright church fellowship hall, a white woman in her sixties with reading glasses, a navy ball cap and a red flannel shirt under a fleece vest makes a volunteer phone call. Her right hand holds a single black cell phone pressed to her right ear for the entire shot and never moves away; her left hand rests on the table holding a pen over a printed call list. She smiles and says warmly into the phone, once: "Hi! I'm a volunteer right here in Brookings." Behind her, out of focus, a row of other volunteers on calls. Exactly one phone in the whole foreground. Slow, steady handheld push-in. ${DOC} Audio: her voice, soft room chatter.`),
  shot('train-graduate', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. Sunday afternoon at the end of a weekend organizer training in a church fellowship hall: the trainer, a white woman in her fifties with gray-streaked hair and a fleece vest, stands at the front and says with energy: "Now go organize!" About thirty ${SD_CROWD} rise from their chairs applauding and cheering, smiling proudly; a few shake hands. No hugging. Handheld camera, sunlight from tall windows. ${DOC} Audio: her line, then applause and cheering, no laughter.`),

  // ── Act 3: organize ────────────────────────────────────────────────────────────────────────────
  // The creative brief's reference shot, placed in Sioux Falls
  shot('field-doorstep', 'kling',
    `Cinematic, ultra-realistic documentary footage of grassroots community organizers having an authentic conversation with an older resident on a suburban doorstep in Sioux Falls, South Dakota, autumn leaves on the lawn. A Hispanic female organizer smiles warmly, her skin showing visible texture, fine pores, and faint crow's feet around her eyes as she talks. Next to her, a Caucasian male organizer in a casual baseball cap nods responsively, shifting his weight naturally. The resident, an older woman with natural gray hair and subtle wrinkles, reacts with genuine facial micro-expressions, then smiles and says: "You know, nobody's ever asked me that before." Shot on a handheld Arri Alexa Mini, subtle organic handheld shake, slow focus-hunt tracking into a medium close-up. Real natural daylight casting realistic soft shadows across their faces. No artificial smoothing, zero glossy AI skin texture, raw home-vlog physics, lifelike body anatomy. No readable text anywhere.`),
  shot('field-farmhouse', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. A young white female organizer in a plain canvas jacket, holding a clipboard, walks up a long gravel farm driveway in rural South Dakota; a weathered rancher in his sixties steps off his porch and walks out to meet her, and they shake hands and begin talking. Wide open sky, golden afternoon light, camera follows from behind her shoulder. No animals anywhere. ${DOC} Audio: gravel crunching, wind, their greeting.`),
  shot('field-sidewalk', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. On a tree-lined Sioux Falls sidewalk in autumn, two organizers, a Hispanic man in his thirties and a white woman in her twenties, stop to check a printed walk list on a clipboard, she points toward a house, and they walk up its front path to the door together. Golden leaves falling, low sun. ${DOC} Audio: footsteps, leaves, their quiet voices, no laughter.`),
  // Earlier take: a man laughed, slapped the table, and his mug vanished under his hand
  shot('field-kitchen', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. Evening house meeting around a kitchen table in a South Dakota farmhouse: six neighbors — ${SD_CROWD} — with coffee mugs and a pan of bars. A woman host in her forties speaks calmly while the others listen closely and nod; an older man at the head of the table leans forward and asks a question with a thoughtful expression. Every mug stays on the table in front of its owner the whole time; hands rest calmly; no laughing, no table slapping. Warm practical lamp light, window dark outside. ${DOC} Audio: the host's calm voice, quiet room, no laughter.`),
  shot('field-fairbooth', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. At a busy small-town county fair, a young white woman organizer at a simple folding table with a plain purple tablecloth talks with a middle-aged couple in their forties, a white man and a white woman; they listen and nod, the man takes a plain card from her and puts it in his shirt pocket, and they shake hands. Fairgoers, food stands and a Ferris wheel blurred behind, bright afternoon sun. ${DOC} Audio: fair crowd ambience, distant carnival music, their conversation.`),
  shot('field-textbank', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. Four young volunteers in their twenties — mostly white Midwestern college students plus one Lakota woman — crowded on a living-room couch typing quickly on their phones and a laptop, pizza boxes on the coffee table, one shows her screen to the others and they all cheer. Screens are softly out of focus. ${DOC} Audio: typing, laughter, a cheer.`),
  shot('field-apartment', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. An apartment door opens in Sioux Falls and a young dad in a hoodie holding a toddler on his hip greets a friendly Hispanic male organizer in his thirties, who asks warmly: "So what matters most to your family this year?" The dad thinks, then starts talking animatedly while the toddler grabs at the clipboard. ${DOC} Audio: their conversation, the toddler babbling.`),
  shot('field-elder', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. Outside a community center in western South Dakota on a golden afternoon, a Lakota woman organizer in her thirties in a plain denim jacket sits on a bench talking with a Lakota elder in his seventies wearing a plain navy ball cap and a flannel shirt; he tells a story with his hands while she listens intently, nods and smiles warmly; wide prairie behind them. Everyday modern clothing only: no feathers, no headdress, no regalia, no costume. Respectful, intimate, natural. ${DOC} Audio: his voice, wind, birds.`),
  shot('field-campus', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. On a sunny Midwestern college campus quad with brick buildings, energetic student organizers with clipboards stop classmates walking by, a realistic mix of mostly white Midwestern students with a few Native American, Hispanic and Black students,; one student signs up and fist-bumps the organizer, others gather around curious. Handheld, bright autumn light. ${DOC} Audio: campus chatter, laughter, a bike bell.`),
  shot('field-truck', 'veo-lite',
    `Cinematic, ultra-realistic documentary footage. On the open South Dakota prairie, a middle-aged white organizer in a plain work jacket stands beside his parked, dusty pickup truck at the end of a long dirt road, checks a clipboard, then shields his eyes and walks toward a distant farmhouse. The truck's doors stay closed the whole time. Wide shot, big sky with towering clouds. ${DOC} Audio: wind, footsteps on gravel.`),
  shot('field-steps', 'veo-lite',
    `Cinematic, ultra-realistic documentary low-angle tracking close-up of sneakers and boots of several organizers walking quickly up porch steps and along sidewalks, a clipboard swinging, autumn leaves kicked up, energetic rhythm, golden backlight. ${DOC} Audio: brisk footsteps, leaves crunching, a doorbell.`),
  shot('field-warroom', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. Late night in a cramped volunteer office, a team of eight organizers — ${SD_CROWD} — huddle around a large wall map covered in colored pins, a team leader in her thirties points and assigns areas, others nod, take photos with phones, coffee cups everywhere, warm desk lamps. ${DOC} Audio: focused chatter, a laugh, papers shuffling.`),

  // ── Act 4: win ─────────────────────────────────────────────────────────────────────────────────
  shot('win-crowd', 'seedance',
    `Cinematic, ultra-realistic documentary footage moving through a packed small-town South Dakota community gym: over a hundred ${SD_CROWD} — ranchers, nurses, students, families — cheering, clapping and raising their hands as the energy peaks, handheld camera pushing through the crowd toward the front. Real faces, natural skin texture, lifelike anatomy, warm gym lights. No text, no logos, no signs. Audio: roaring crowd, applause.`,
    { duration: 5 }),
  shot('win-walk', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. A line of seven organizers — ${SD_CROWD} — walks confidently toward the camera down a gravel prairie road at golden hour, clipboards and jackets, wind in their hair, smiling, the low sun flaring behind them. Slow handheld backward walk. ${DOC} Audio: footsteps on gravel, wind, a laugh.`),
  shot('win-highfive', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. At sunset on a neighborhood sidewalk, a team of five volunteers — ${SD_CROWD} — finishes their last door and celebrates with high-fives and fist bumps, smiling and cheering, clipboards in hand, orange and purple sky behind them. No hugging. ${DOC} Audio: cheering, high-fives.`),
  shot('win-dawn', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. Before dawn, organizers in jackets pour coffee into paper cups in a dim office, then push open the door and step out into the blue-hour cold, breath visible, pulling on gloves and heading to their cars with determined smiles. ${DOC} Audio: coffee pouring, door opening, cold wind, car doors.`),
  shot('win-portrait', 'veo-fast',
    `Cinematic, ultra-realistic documentary portrait. Slow push-in on a young woman organizer in her twenties standing on the open South Dakota prairie at golden hour, wind moving her hair, she looks out at the horizon, then turns to camera with a determined half-smile. Shallow depth of field. ${DOC} Audio: wind.`),
  shot('win-rancher', 'veo-fast',
    `Cinematic, ultra-realistic documentary portrait. Slow push-in on a weathered South Dakota rancher in his sixties in a worn cowboy hat standing by a barn at sunset, deep wrinkles and sun-worn skin, he looks into the lens, then breaks into a proud grin and gives a small nod. Shallow depth of field. ${DOC} Audio: wind, distant cattle.`),

  // ── Added after the top-up: more variety so the edit reuses fewer clips ──────────────────────
  shot('land-storm', 'veo-lite',
    `${AERIAL} A long, low, dark-blue shelf cloud stretching flat across the entire horizon of the open South Dakota prairie at golden hour, its leading edge lit orange by the low sun, distant lightning flickering in the rain curtain, a gravel road and fence line below. The cloud is a wide horizontal band, not a tall column. Audio: deep rolling thunder, wind.`),
  shot('land-windmill', 'veo-lite',
    `Cinematic ultra-realistic slow push toward an old metal farm windmill turning against a blazing orange and purple South Dakota sunset, prairie grass swaying in the foreground, birds crossing the sky. No text. Audio: creaking windmill, wind, crickets.`),
  shot('land-flag', 'veo-lite',
    `Cinematic ultra-realistic low-angle slow-motion shot of an American flag snapping in strong prairie wind on a tall pole beside a small-town South Dakota grain elevator, deep blue sky, sunlight glinting. No text. Audio: flag flapping, wind.`),
  shot('field-snow', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. Winter dusk in a small South Dakota town, snow falling under the streetlights: an organizer in a parka and knit hat stands on a snowy front step; the door opens, warm light spilling out, and an older white woman in a cardigan greets him; they talk on the doorstep, his breath steaming, and she nods. ${DOC} Audio: wind, boots on snow, their conversation.`),
  shot('field-diner', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. In a small-town South Dakota diner booth, a white female organizer in her thirties has a one-on-one conversation with a middle-aged white farmer in a seed cap over coffee and slices of pie; he leans in, nods, then shakes her hand and smiles as he agrees to volunteer. Window light, chrome napkin holder, waitress passing behind. ${DOC} Audio: diner ambience, coffee cups, their quiet conversation.`),
  shot('field-rain', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. Light rain in a Sioux Falls neighborhood: an organizer in a rain jacket, a Hispanic woman in her forties holding a clipboard, stands on a covered front porch and knocks; the door opens and a white man in his fifties in a flannel shirt greets her, and they start talking, both nodding. Rain falling behind them. ${DOC} Audio: rain, a knock, their conversation.`),
  shot('win-carpool', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage. Early Saturday morning, a group of volunteers — ${SD_CROWD} — pile into a minivan and a pickup in a church parking lot with clipboards and coffee, high-fiving and laughing, sun just rising behind them. ${DOC} Audio: car doors, laughter, a cheer.`),
  shot('win-pepTalk', 'kling',
    `Cinematic, ultra-realistic documentary footage. In a church parking lot at sunrise, a young white male organizer in his twenties with a canvas jacket stands on the bumper of a pickup and fires up a circle of twenty volunteers — ${SD_CROWD} — holding clipboards and coffee. He shouts with a grin: "Every door, every neighbor. Let's go!" and the group cheers and claps. Shot on a handheld Arri Alexa Mini, subtle organic handheld shake, real low golden sunlight, visible skin texture, no artificial smoothing, lifelike anatomy. No readable text anywhere.`),
  shot('field-porch', 'kling',
    `Cinematic, ultra-realistic documentary footage. On the wooden porch of a South Dakota farmhouse, an older white farm couple in their seventies — she in a cardigan, he in overalls and a seed cap — laugh warmly with a young Lakota male organizer in a canvas jacket holding a clipboard; the husband pats the organizer on the shoulder and says: "Come back anytime, son." Golden late afternoon light, wind chimes, fields behind. Shot on a handheld Arri Alexa Mini, subtle organic handheld shake, visible skin texture, fine pores and wrinkles, no artificial smoothing, lifelike anatomy. No readable text anywhere.`),
  // Was a Seedance clip that cut between two angles and changed the man's shirt into a coat across the cut;
  // Veo gives one continuous take
  shot('win-cheer', 'veo-fast',
    `Cinematic, ultra-realistic documentary footage, one continuous handheld take with no cuts. In a wood-paneled community hall, a team of ten volunteers — ${SD_CROWD} — jump up from white folding chairs cheering as they hit their goal: a white man in his thirties in a plain navy chore coat and a Native American woman in her forties in a plain gray fleece vest over a plain red shirt throw their arms in the air and high-five, while the people around them clap and cheer. Everyone keeps the same clothes the whole time. No hugging. ${DOC} Audio: cheering, applause.`),
];
