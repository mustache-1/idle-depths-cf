// Cold Call Cove: the cast and the products. Shared by the page and the Worker.
// Everything here is fiction: made-up people, made-up coins, made-up products.

export const TONES = ["charm", "flatter", "pressure", "facts", "silly"];

export const PRODUCTS = {
  tide:   { name: "Low-Tide Insurance", pitch: "covers you in case the tide goes out", price: 120 },
  light:  { name: "Lighthouse Timeshare", pitch: "one Tuesday a year in a real lighthouse", price: 200 },
  kraken: { name: "Anti-Kraken Warranty", pitch: "a lifetime guarantee against tentacles", price: 160 },
  fog:    { name: "Pre-Owned Fog", pitch: "lightly used, only drifted over one harbor", price: 90 },
  moon:   { name: "Moon Deeds (Damp Section)", pitch: "a plot on the moon, slightly damp", price: 240 },
};

// weak = the tone that works on them, hates = the tone that backfires.
// hints are what their file shows when the player peeks at it.
export const CALLERS = {
  pennywhistle: { name: "Mrs. Pennywhistle", job: "retired lighthouse keeper", purse: 300, weak: "facts", hates: "pressure", skin: "#e8c9a8", hair: "#d8d8e0", style: "bun", glasses: true, accent: "#c46ad8",
    bio: "Sharp as a tack and twice as pointy. Has seen every con in the Cove and ran a few.",
    hints: ["diary.txt: 'Hung up on three salesmen today. Personal best.'", "history: how to spot a fake warranty", "receipts: 40 years of lamp oil, all itemised"],
    greet: "Pennywhistle. If you're selling something, you have forty seconds.", lines: ["Hmm. Go on.", "I'll need that in writing.", "That sounds like a lot of nonsense, dear."] },
  dutch: { name: "Dutch Callaghan", job: "crab fisherman", purse: 400, weak: "pressure", hates: "facts", skin: "#d9a07a", hair: "#7a4a24", style: "cap", glasses: false, accent: "#e0832f", mustache: true,
    bio: "Haggles over everything, including the weather. Loves a deadline.",
    hints: ["history: 'last-chance sale' x14", "notes.txt: 'never buy at the first price'", "photos: him holding a very large crab"],
    greet: "Callaghan. Make it quick, the crabs don't pot themselves.", lines: ["How much? No. How much, really?", "Is that your best?", "I got a boat to fix."] },
  quill: { name: "Professor Quill", job: "tidal historian", purse: 600, weak: "facts", hates: "silly", skin: "#f0d2b5", hair: "#555a66", style: "slick", glasses: true, accent: "#4aa3d6",
    bio: "Doubts everything. Respects a citation.",
    hints: ["thesis.doc: 'A Complete History of Tides (draft 41)'", "history: three tab titles that are all footnotes", "mail: a strongly worded letter to the moon"],
    greet: "Quill speaking. Please be precise. I will be checking.", lines: ["Source?", "That claim is unsupported.", "Fascinating, if untrue."] },
  baroness: { name: "Baroness Von Brine", job: "salt baron", purse: 900, weak: "flatter", hates: "charm", skin: "#f3d9c4", hair: "#2a1f33", style: "swoop", glasses: false, accent: "#d6ae4a", hat: true,
    bio: "Owns half the salt flats. Only buys what other people can't have.",
    hints: ["calendar: 'be unavailable'", "history: auction results for things nobody needs", "photos: a portrait of herself, framed in salt"],
    greet: "Von Brine. You may speak. Briefly.", lines: ["Is it exclusive?", "How tiresome.", "Others own this? Then no."] },
  gus: { name: "Gus the Lamplighter", job: "night lamplighter", purse: 350, weak: "silly", hates: "facts", skin: "#c99a74", hair: "#2f2a24", style: "curly", glasses: false, accent: "#7ad66a", beard: true,
    bio: "Believes the lamps are talking to him. They might be.",
    hints: ["notes.txt: 'the 14th lamp knows'", "history: forum threads at 3am", "photos: lamps, labelled by mood"],
    greet: "Gus here. Keep your voice down, they listen through the bulbs.", lines: ["Is this secret? Tell me it's secret.", "The lamps like you.", "I knew you'd call."] },
  nan: { name: "Nan Bloom", job: "retired ferry captain", purse: 500, weak: "charm", hates: "pressure", skin: "#d4a98a", hair: "#a8a8b3", style: "bob", glasses: true, accent: "#e05a7a",
    bio: "Kind to everyone, fooled by no one. Pressure makes her hang up.",
    hints: ["diary.txt: 'Learn the guitar. Or at least own one.'", "history: recipes, then more recipes", "photos: the ferry, forty years of it"],
    greet: "Hello, dear. Nan Bloom. Take your time.", lines: ["That's nice, dear.", "I'll have to think about it.", "My late husband would have laughed."] },
  joe: { name: "Skipper Joe", job: "professional optimist", purse: 250, weak: "flatter", hates: "facts", skin: "#e2b48a", hair: "#9a5b2a", style: "cap", glasses: false, accent: "#3fb8a4", mustache: true,
    bio: "Says yes to everything and means it every time. Poor, though.",
    hints: ["notes.txt: 'say yes more!!!'", "bank: a balance of mostly good intentions", "photos: a thumbs-up, 600 times"],
    greet: "Skipper Joe! Best day ever! Who's this?", lines: ["Yes! Wait, what was the question?", "Amazing!", "I love it. How much is it again?"] },
  zelda: { name: "Madame Zelda Tides", job: "psychic", purse: 450, weak: "flatter", hates: "silly", skin: "#cf9a7e", hair: "#3a1f4a", style: "wrap", glasses: false, accent: "#9a6ae0",
    bio: "Claims she knew you'd call. Falls for anyone who agrees with her.",
    hints: ["calendar: 'predict calendar'", "history: horoscopes, other people's", "notes: 'always say the stars are unclear'"],
    greet: "I knew you would call. Your name begins with a letter.", lines: ["The stars are... unclear.", "I sense your energy.", "Yes, I foresaw this."] },
};
export const CALLER_IDS = Object.keys(CALLERS);

export const TURNS = 8;
