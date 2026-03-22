// القاموس الأول (خريطة المواقع)
const SITE_MAP = {
  'booking.com': 'travel', 'airbnb': 'travel', 'skyscanner': 'travel', 'expedia': 'travel', 'agoda': 'travel', 'wego': 'travel', 'flyin': 'travel', 'trivago': 'travel',
  'chatgpt.com': 'ai_chat', 'claude.ai': 'ai_chat', 'gemini.google.com': 'ai_chat', 'perplexity.ai': 'ai_chat', 'poe.com': 'ai_chat', 'character.ai': 'ai_chat',
  'cursor.com': 'ai_code', 'lovable.dev': 'ai_code', 'v0.dev': 'ai_code', 'bolt.new': 'ai_code', 'github.copilot': 'ai_code', 'replit.com': 'ai_code',
  'pornhub.com': 'nsfw', 'xvideos.com': 'nsfw', 'xnxx.com': 'nsfw', 'onlyfans.com': 'nsfw', 'rule34.xxx': 'nsfw', 'rule34': 'nsfw', 'nhentai': 'nsfw', 'hanime': 'nsfw',
  'github.com': 'github', 'gitlab.com': 'github', 'bitbucket.org': 'github',
  'youtube.com': 'youtube', 'web.whatsapp.com': 'whatsapp', 'music_mode': 'music',
  'open.spotify.com': 'spotify', 'spotify.com': 'spotify',
  'facebook.com': 'social', 'instagram.com': 'social', 'x.com': 'social', 'twitter.com': 'social', 'tiktok.com': 'social',
  '127.0.0.1': 'presentation', 'localhost': 'presentation', 'sassyduck_presentation': 'presentation'
};

// القاموس الثاني (قاموس الشتائم والتعليقات الساخرة)
const ROASTS = {
  en: {
    travel: ["Look at this hotel... you can barely afford a tent.", "Going on a vacation to escape your miserable life?", "I hope your flight gets delayed 14 hours."],
    spotify: ["Oh look, another NPC playlist. How original.", "Listening to lo-fi to study? We both know you're just failing.", "Your music taste is absolute garbage."],
    ai_chat: ["Asking AI because you are completely clueless?", "The AI is judging your incredibly stupid prompts.", "WOW, you really can't think for yourself."],
    ai_code: ["Stop this crap, you can't code a single line.", "You rely on AI to center a div. Pathetic.", "A 10-year-old taking CS50 is better than you."],
    nsfw: ["Close this tab immediately you degenerate.", "Your FBI agent is crying watching you.", "I am calling your mother."],
    whatsapp: ["They left you on read. Pathetic.", "Who are you texting? You have no friends.", "Delete that message. It was embarrassing."],
    youtube: ["Why are you watching this garbage?", "Your attention span is zero.", "Shorts again? Read a book."],
    github: ["Oh, writing bugs again?", "Your commit history is a tragedy.", "Merge conflicts again? Get good."],
    social: ["Boomer alert. Are you 60?", "Nobody cares about your timeline.", "Stop looking at fake lives."],
    default: ["Are you really spending your life like this?", "I'm bored. Entertain me.", "You call this productive? What a joke."],
    capture: ["Let go of me!", "Get your sweaty hands off me!", "Are you a sadist? Let me be!"],
    petting: ["Yeah.. like that.. harder! 😉", "I'm starting to feel strange things...", "Expert at this, aren't you?"],
    anger: ["Get away from me!", "Stop hitting me!", "I'll bite you!"]
  },
  ar: {
    travel: ["اهو الشحات بيدور على سفر.. مسخرة والله.", "انت فاكر نفسك معاك فلوس الحاجات دي؟", "يا رب الطيارة تتأخر بيك 14 ساعة."],
    spotify: ["بص بص.. بلاي ليست ناس عادية اوي، مفيش أي ابتكار.", "المطرب ده بيعيط دلوقتي عشان مضطر يدخل ودانك.", "فوت الأغنية دي وفوت حياتك بالمرة."],
    ai_chat: ["بتسأل الذكاء الاصطناعي عشان انت حمار ومبتفهمش؟", "الـ AI قاعد بيضحك على الأسئلة الغبية اللي بتبعتها.", "الذكاء الاصطناعي بدأ يغبي من كتر الكلام معاك."],
    ai_code: ["بطل العبط ده، انت متعرفش تكتب سطر واحد.", "روح اتعلم أي حرفة يدوية وسيب البرمجة لأهلها."],
    nsfw: ["اقفل التاب دي فوراً يا منحرف.", "ضابط الـ FBI بتاعك قاعد بيعيط من اللي بيشوفه.", "أنا هكلم أمك دلوقتي أقولها!"],
    whatsapp: ["عملولك 'Seen' ومنفضينلك.. يا بؤس شكلك.", "بتكلم مين؟ انت اصلاً ملكش صحاب حقيقيين.", "بقاله 10 دقايق مبيتردش عليك؟ بيكرهوك."],
    youtube: ["ليه بتتفرج على القرف ده؟", "مستوى تركيزك صفر يا بني آدم يا بدائي.", "شورتس تاني؟ روح اقرأ كتاب!"],
    github: ["أوها.. بتكتب 'Bugs' تانية؟", "تاريخ الكوميتس بتاعك عبارة عن تراجيديا حزينة.", "كونفلكت تاني؟ اتعلم يا ابني بقى!"],
    social: ["ايه يا عم الحاج؟ كبرت وخرفت ولا ايه؟", "محدش مهتم برأيك السياسي ولا يومياتك التافهة.", "بطل تبص على حياة الناس المزيفة."],
    default: ["انت بجد بتضيع حياتك في الكلام ده؟", "أنا زهقت، سليني يا بني آدم انت.", "انت فاكر كدا انك شغال؟ نكتة والله."],
    capture: ["افلتني يا ابن الكلب! 🐕", "سيبني يا حيوان، ايدك زفرة! 🐖", "يا بابا.. سيبني أروح أشوف حالي!"],
    petting: ["أيوه كدا.. أقوى كمان! 😉", "أنا بدأت أحس بأشياء غريبة تحت الريش...", "ايدك حنينة أوي.. قلبي هيوقف!"],
    anger: ["ابعد عني!", "بطل تضربني يا همجي!", "والله لعضك لو ملميتش نفسك!"]
  }
};
