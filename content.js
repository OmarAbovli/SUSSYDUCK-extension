//   متغير يحدد ما إذا كانت البطة تعمل حالياً على الشاشة لمنع استدعاءات مكررة
let isRunning = false;

//   حالة البطة الحالية: تبدأ بالخمول (IDLE)، ويمكن أن تكون (تتجول، تطارد الماوس، تسرق الماوس، نائمة، مسحوبة، حالة انتقام عند الموت، تبحث عن أكل، أو تتصف بالحنان)
let duckState = 'IDLE'; 

//   موقع البطة الفعلي (x, y) على الشاشة، يبدأ من المنتصف (نصف العرض ونصف الارتفاع)
let pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

//   السرعة المتجهة (Velocity) للبطة وتستخدم لجعل حركتها الفيزيائية ناعمة بدلاً من القفز من نقطة لأخرى
let vel = { x: 0, y: 0 };

//   النقطة الهدف التي تسير إليها البطة (سواء كانت عشوائية للتجول أو موقع الماوس للمطاردة)
let target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

//   تسجيل موقع الماوس الحالي لتتمكن البطة من مطاردته
let mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

//   تسجيل موقع الماوس السابق لحساب سرعة حركة الماوس بدقة
let lastMousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

//   رقم الإطار الخاص بالأنيميشن (requestAnimationFrame) لكي نتمكن من إيقافه عند الحاجة
let updateFrameId = null;

//   وقت آخر تحديث للإطار لحساب فارق الوقت (Delta Time) وجعل الحركة سلسة على جميع الشاشات
let lastTime = performance.now();

//   تتبع آخر مرة أخرجت فيها البطة صوتاً، لكي لا تتفاعل مع صوتها هي!
let lastInternalAudioTime = 0;

//   ===============================
//   نظام الصوتيات المدمج (Web Audio API) بدلاً من استدعاء ملفات mp3 ثقيلة
//   ===============================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)(); // تهيئة بيئة الصوت
function playSound(type) {
  lastInternalAudioTime = performance.now(); // تسجل أن البطة هي من أحدثت صوتاً للتو
  if (audioCtx.state === 'suspended') audioCtx.resume(); // المتصفحات تمنع الصوت أحياناً حتى يتفاعل المستخدم، هذا يوقظه
  
  const osc = audioCtx.createOscillator(); // مُولّد النغمات
  const gain = audioCtx.createGain(); // متحكم الصوت (المرتفع والمنخفض)
  osc.connect(gain);
  gain.connect(audioCtx.destination); // ربط الصوت بسماعات جهاز المستخدم
  const now = audioCtx.currentTime;
  
  //   تحديد نوع الصوت المطلوب لعبه
  if (type === 'shoot') {
    //   صوت رصاص السلاح 🔫: موجة منشارية (sawtooth) تبدأ بتردد 150 وتنزل بسرعة لتشبه الطلقة
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.1);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);
  } else if (type === 'dodge') {
    //   صوت تفادي الرصاص (الماتريكس): موجة جيبية (sine) بتردد عالي ينزل بانسيابية للأسفل
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);
    osc.start(now); osc.stop(now + 0.2);
  } else if (type === 'glass') {
    //   صوت تحطيم الزجاج 🪟: موجة مربعة مزعجة تتكسر مقاطعها
    osc.type = 'square';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.start(now); osc.stop(now + 0.15);
  } else if (type === 'quack') {
    //   صوت البطة المطاطية الدائري (Quack) أثنااء الطيران أحياناً
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.15);
    osc.start(now); osc.stop(now + 0.15);
  }
}

//   إحصائيات البطة: الغضب (Anger)، السعادة (Happiness)، النعاس (Sleepiness)، واللعب
let stats = { anger: 0, happiness: 50, sleepiness: 0, playfulness: 50 };

//   ===============================
//   بناء الرسميات ديناميكياً باستخدام الـ SVG (نظام المتجهات لتبقى دقتها عالية)
//   ===============================
const duckPixels = [
  "   rrrr   ",
  "  rrrrrr  ",
  "  ryyyyyyr",
  "  yyyyyyyy",
  " bbbbbbbbb",
  " bWbbbbbWb",
  "  yyyyyyyy",
  "   ggggggg",
  "    gggggg",
  "    rrrrrr",
  "     y  yr",
  " yyyyyyyyy",
  "yyyyyyyyyy",
  "yyyyyyyyyy",
  " yyyyyyyy "
].map(row => row.split('')); 

//   دالة تجميع الرسمة (Pixel Art) وبناء أكواد أجزائها وتجهيزها للحقن في الصفحة
function buildPixelSVG() {
  let svg = '<svg viewBox="0 0 100 100" class="duck-svg">';
  // الأرجل (حفظناها في مجموعات منفصلة لكي يتم الإشارة إليها في css أثناء المشي)
  svg += '<g class="duck-leg left-leg"><rect x="35" y="75" width="10" height="15" fill="#d35400"/><rect x="25" y="85" width="20" height="5" fill="#d35400"/></g>';
  svg += '<g class="duck-leg right-leg"><rect x="55" y="75" width="10" height="15" fill="#e67e22"/><rect x="45" y="85" width="20" height="5" fill="#e67e22"/></g>';
  
  svg += '<g class="duck-body-group">';
  let ps = 5; // Pixel Size
  //   رسم الجسم بكسل بكسل ليعطي طابع ألعاب الريترو
  duckPixels.forEach((row, y) => {
    row.forEach((char, x) => {
      let color = '';
      if(char==='r') color = '#e74c3c'; 
      if(char==='y') color = '#f1c40f'; 
      if(char==='b') color = '#2c3e50'; 
      if(char==='W') color = '#ffffff'; 
      if(char==='g') color = '#d35400'; 
      if(color) svg += `<rect x="${x*ps + 20}" y="${y*ps}" width="${ps+0.5}" height="${ps+0.5}" fill="${color}" />`; 
    });
  });
  
  //   رسمة الماوس الصغير الذي تمسكه البطة যখন تسرق الماوس وتخفيه عنك!
  svg += `<g class="held-mouse" opacity="0" transform="translate(65, 30) scale(1.5)"><path d="M0,0 L0,15 L4,11 L7,18 L9,17 L6,10 L11,10 Z" fill="white" stroke="black" stroke-width="1" style="vector-effect: non-scaling-stroke;"/></g>`;
  
  //   مسدس الانتقام الخاص بالبطة الذي يظهر في حالة (REVENGE)
  svg += `<g class="sassy-duck-revenge-gun" opacity="0" transform="translate(65, 30) scale(1.5)">
     <rect x="0" y="5" width="15" height="5" fill="#333" />
     <rect x="0" y="10" width="15" height="8" fill="#555" />
     <rect x="5" y="18" width="5" height="10" fill="#222" />
  </g>`;

  //   الجناح الذي يظهر רק عند الطيران أعلى الشاشة! (مرتبط بـ CSS opacity)
  svg += `<g class="duck-wing" opacity="0" transform-origin="50 45">
     <rect x="35" y="40" width="25" height="15" fill="#f39c12" rx="5"/>
     <rect x="25" y="40" width="15" height="10" fill="#f39c12" rx="3"/>
     <rect x="40" y="50" width="20" height="8" fill="#e67e22" rx="2"/>
  </g>`;

  //   أيقونات المشاعر الـ Emoji (النوم Zzz، العرق 💢، القلوب ❤️)
  svg += `<text x="65" y="15" font-size="18" font-family="Arial" font-weight="bold" fill="white" stroke="black" stroke-width="1" class="duck-zzz" opacity="0">Zzz</text>
  <text x="75" y="15" font-size="20" class="duck-sweat" opacity="0">💢</text>
  <text x="75" y="15" font-size="20" class="duck-hearts" opacity="0">❤️</text>`;

  // --- Accessories for Moods ---
  // 1. Philosopher Hat (طاقية الفلاسفة)
  svg += `<g class="acc-philosopher-hat" opacity="0" transform="translate(30, -10)">
    <rect x="0" y="5" width="40" height="5" fill="#333" />
    <rect x="10" y="0" width="20" height="5" fill="#333" />
  </g>`;

  // 2. Romantic Glasses (نظارة)
  svg += `<g class="acc-romantic-glasses" opacity="0" transform="translate(25, 20)">
    <rect x="0" y="0" width="15" height="10" fill="none" stroke="#222" stroke-width="2" />
    <rect x="25" y="0" width="15" height="10" fill="none" stroke="#222" stroke-width="2" />
    <line x1="15" y1="5" x2="25" y2="5" stroke="#222" stroke-width="2" />
  </g>`;

  // 3. Dead Rose (وردة دبلانة مضحكة)
  svg += `<g class="acc-dead-rose" opacity="0" transform="translate(65, 30)">
    <path d="M0,0 Q5,15 0,30" stroke="green" stroke-width="2" fill="none" />
    <circle cx="0" cy="0" r="5" fill="#c0392b" />
    <path d="M-5,0 Q0,-10 5,0 Q0,5 -5,0" fill="#c0392b" opacity="0.6" />
  </g>`;

  svg += '</g></svg>';
  return svg; // إعادة النص ككود يعرض كصورة قوية
}

// --- Tab Hijack Data ---
const TAB_HIJACK_EN = [
  "FEED ME!", "I'M WATCHING YOU", "DUCK TAKEOVER", "STOP WORKING", "SASSY TAB", "UGLY BROWSER", "QUACK QUACK"
];
const TAB_HIJACK_AR = [
  "أكلني يا بخيل!", "أنا شايفك!", "البطة احتلت المكان", "بطل شغل بقى!", "تاب مستفز", "متصفح كئيب", "كاك كااااك"
];

function hijackTabTitle() {
  if (Math.random() > 0.3) return; // 30% chance to hijack
  const originalTitle = document.title;
  const messages = currentLangCache === 'ar' ? TAB_HIJACK_AR : TAB_HIJACK_EN;
  const msg = messages[Math.floor(Math.random() * messages.length)];
  
  document.title = "🦆 " + msg;
  setTimeout(() => {
    document.title = originalTitle;
  }, 5000);
}

// --- Dynamic Mood System ---
let currentMood = 'NORMAL'; // NORMAL, PHILOSOPHER, ROMANTIC
const MOODS = ['NORMAL', 'PHILOSOPHER', 'ROMANTIC'];

function rotateMood() {
  if (duckState === 'SLEEPING' || duckState === 'REVENGE' || duckState === 'CHASING') return;
  
  // 20% chance to change mood
  if (Math.random() < 0.2) {
    currentMood = MOODS[Math.floor(Math.random() * MOODS.length)];
    updateAppearance();
    
    if (currentMood !== 'NORMAL') {
      const moodLines = currentMood === 'PHILOSOPHER' ? 
        (currentLangCache === 'ar' ? PHILOSOPHER_AR : PHILOSOPHER_EN) :
        (currentLangCache === 'ar' ? ROMANTIC_AR : ROMANTIC_EN);
      
      speak(moodLines[Math.floor(Math.random() * moodLines.length)]);
    }
  }
}

const PHILOSOPHER_EN = [
  "To quack, or not to quack...", "I think, therefore I am... a duck.", "The bread was never real.", "Wisdom is just hunger in disguise."
];
const PHILOSOPHER_AR = [
  "أكوك ولا مأكوكش؟ دي هي المشكلة.", "أنا أوقوق إذاً أنا موجود.. بطة.", "العيش مكنش حقيقي يا صاحبي.", "الحكمة هي مجرد جوع متنكر."
];
const ROMANTIC_EN = [
  "Rose is red, I am yellow, you are a very weird fellow.", "My heart is like a pond, mostly muddy.", "In the lake of love, I am currently drowning."
];
const ROMANTIC_AR = [
  "الورد أحمر وأنا أصفر، وأنت شكلك بقف وأصغر.", "قلبي زي الترعة، كله طينة.", "في بحر الحب، أنا غرقانة لشوشتي."
];

setInterval(hijackTabTitle, 60000); // Try hijack every minute
setInterval(rotateMood, 45000);   // Try rotate mood every 45s

//   رسمة سلاح الـ AKM الذي يظهر أسفل شاشة المستخدم عند تفعيل (Gun Mode 🔫)
const akmSVG = `
<svg viewBox="0 0 150 60" class="akm-svg">
  <rect x="0" y="30" width="30" height="25" fill="#8B4513" rx="3" />
  <rect x="40" y="40" width="10" height="20" fill="#8B4513" rx="2" />
  <rect x="30" y="25" width="80" height="15" fill="#2c3e50" rx="2" />
  <path d="M 60 40 Q 60 60 70 60 L 75 60 Q 72 40 72 40 Z" fill="#34495e" />
  <rect x="110" y="25" width="40" height="6" fill="#2c3e50" />
  <rect x="100" y="31" width="30" height="5" fill="#8B4513" />
  <rect x="35" y="20" width="12" height="5" fill="#2c3e50" />
  <rect x="140" y="20" width="5" height="5" fill="#2c3e50" />
</svg>
`;

//   رسمة الزجاج المكسور الذي يظهر כאשר تقتلك البطة بطلقة في شاشتك (إبداع!)
const crackSVG = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="3" fill="#111"/><path d="M50 50 L10 10 M50 50 L80 15 M50 50 L95 60 M50 50 L70 90 M50 50 L20 85 M50 50 L5 55 M50 50 L35 25 M50 50 L65 35 M50 50 L40 75" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"/><path d="M50 50 L10 10 M50 50 L80 15 M50 50 L95 60 M50 50 L70 90 M50 50 L20 85 M50 50 L5 55" stroke="rgba(0,0,0,0.5)" stroke-width="0.5" transform="translate(1,1)"/></svg>`;

//   تعريف عناصر الـ DOM الأساسية
let container, sprite, bubble, akmWrapper;
//   تخزين بيانات موت البطة (تستخدم لغضب الانتقام אם قتلناها 3 مرات)
let deathData = { count: 0, recentlyRevived: false };

let foodElement = null; // عنصر صحن الطعام
let foodTarget = null; // إحداثيات الطعام
let foodTeaseCount = 0; // مقلب الطعام (عندما تسحبه عن البطة!)

// ===== PARKOUR SYSTEM =====
let parkourActive = false;
let parkourTarget = null;  // { x, y, h, el }
let parkourPhase = '';     // 'APPROACH', 'JUMPING', 'LANDING'
let parkourJumpProgress = 0;
let parkourStartPos = { x: 0, y: 0 };
const PARKOUR_COMMENTS_EN = [
  "PARKOUR! 🏃‍♂️", "Did you see that flip?!", "I'm basically Spider-Duck!",
  "10/10 landing! 🎯", "Too easy.", "Your buttons are my playground!",
  "Obstacle? More like FUN-stacle!", "The floor is lava! 🔥",
  "Jackie Chan taught me that!", "Hold my breadcrumbs! 🍞"
];
const PARKOUR_COMMENTS_AR = [
  "باركور! 🏃‍♂️", "شفت الشقلبة دي؟!", "أنا سبايدر-بطة بالظبط!",
  "هبوط 10 من 10! 🎯", "سهلة أوي يا عم.", "الأزرار بتاعتك ملعبي!",
  "عقبة؟ دي فسحة! 🔥", "الأرض حمم بركانية!",
  "جاكي شان علمني الحركة دي!", "امسك الخبز بتاعي! 🍞"
];
const foodTeases = [ 
  "Where is the food, you piece of garbage?",
  "Why did you take it? I'm literally starving, you monster!",
  "Are you playing with me? I'll bite your fingers off!",
  "GIVE IT BACK NOW OR I'LL HACK YOUR BROWSER HISTORY!",
  "You think this is funny? Your life is a joke, not my dinner!",
  "I hope your internet cuts out during an important meeting.",
  "You're the reason I hate humans. Feed me or die!",
  "I'll poop on your taskbar for this, I swear!",
  "IS THIS A PRANK? I DON'T SEE A CAMERA, JUST AN IDIOT!",
  "My hunger is rising, and so is my desire to end you.",
  "You are more useless than a 'No Smoking' sign in a forest fire.",
  "STOP TEASING ME AND FEED THE DUCK, YOU SOCIOPATH!"
];

function tickStats() {
  if (!isRunning || duckState === 'REVENGE') return; 

  stats.anger = Math.max(0, stats.anger - 2);
  stats.happiness = Math.max(0, stats.happiness - 1);
  stats.sleepiness = Math.min(100, stats.sleepiness + 1);

  if (stats.anger > 80 && duckState !== 'STEALING' && duckState !== 'DRAGGED') duckState = 'CHASING'; 
  else if (stats.sleepiness > 90 && duckState === 'IDLE') duckState = 'SLEEPING';
  else if (duckState === 'SLEEPING' && stats.sleepiness < 50) duckState = 'WANDERING';
  
  if (duckState !== 'SLEEPING' && Math.random() < 0.01) dropPoop(); 
  
  updateAppearance();
  chrome.storage.sync.set({ stats: stats });
}

// ===== Mouse Hijack: Hide real cursor, show it in duck's beak =====
function hijackMouse() {
  // 1. Hide the real cursor across the entire page
  if (!document.getElementById('sassy-cursor-hide-style')) {
    const style = document.createElement('style');
    style.id = 'sassy-cursor-hide-style';
    style.textContent = '* { cursor: none !important; }';
    document.head.appendChild(style);
  }
  // 2. Show the mouse icon inside the duck's beak SVG
  const heldMouse = sprite.querySelector('.held-mouse');
  if (heldMouse) heldMouse.setAttribute('opacity', '1');
  
  speak(ROASTS[currentLangCache]?.capture?.[Math.floor(Math.random() * (ROASTS[currentLangCache]?.capture?.length || 1))] || "Got your mouse!");
}

function releaseMouse() {
  // 1. Restore the real cursor
  const style = document.getElementById('sassy-cursor-hide-style');
  if (style) style.remove();
  // 2. Hide the mouse from duck's beak
  if (sprite) {
    const heldMouse = sprite.querySelector('.held-mouse');
    if (heldMouse) heldMouse.setAttribute('opacity', '0');
  }
}

// Cache language for sync-free access in hijackMouse
let currentLangCache = 'en';
chrome.storage.sync.get(['language'], d => { if(d.language) currentLangCache = d.language; });
chrome.storage.onChanged.addListener((changes) => { if(changes.language) currentLangCache = changes.language.newValue; });

function initDuck() {
  chrome.storage.sync.get(['enabled', 'duckStatus', 'deathCount', 'recentlyRevived'], (data) => {
    if (data.enabled === false || data.duckStatus === 'DEAD') {
      removeDuck();
      return; 
    }
    
    deathData.count = data.deathCount || 0;
    deathData.recentlyRevived = data.recentlyRevived;

    if (isRunning) return; // منع إنشاء أكثر من بطة في الشاشة الواحدة
    isRunning = true;
    
    //   1. بناء هيكل الـ HTML (DIV) داخل صفحة الويب الحقيقية للمستخدم
    container = document.createElement('div');
    container.className = 'sassy-duck-container';
    
    sprite = document.createElement('div');
    sprite.className = 'sassy-duck-sprite sassy-duck-waddling';
    sprite.innerHTML = buildPixelSVG(); // ملئه بصورة הבطة الـ SVG
    
    bubble = document.createElement('div');
    bubble.className = 'sassy-duck-bubble'; // فقاعة الحديث
    
    // جمع كل الأجزاء داخل الحاوية الكبيرة (Container)
    container.appendChild(bubble);
    container.appendChild(sprite);
    
    //   حقن الحاوية داخل جسم الصفحة (أخيراً، הבطة أصبحت معنا في الموقع)
    document.body.appendChild(container);

    //   2. تنصيب وبناء سلاح المستخدم الناري وإضافته للشاشة أيضاً (يُخفى بالـ CSS עד يفعّله)
    akmWrapper = document.createElement('div');
    akmWrapper.id = 'sassy-akm-wrapper';
    akmWrapper.innerHTML = akmSVG;
    document.body.appendChild(akmWrapper);

    //   3. ربط الأحداث (Events) بصورة البطة (النقر، التحويم فوقها)
    sprite.addEventListener('mousedown', hitDuck); // عندما تنقر عليها (ضربة!)
    sprite.addEventListener('mousemove', petDuck); // عندما تحرك الماوس بنعومة فوقها (مداعبة)
    
    //   4. بدء تشغيل قلب اللعبة! (حلقة الرسوم/Update Loop)
    lastTime = performance.now();
    updateFrameId = requestAnimationFrame(update); // تشغيل دالة (update) 60 مرة بالثانية
    
    //   5. أحداث زمنية مستمرة طالما البطة حية: تحديث الإحصائيات كل ثانية
    setInterval(tickStats, 1000); 
//   ميزة إضافية: فحص يوتيوب كل 40 ثانية لوضع "ديسلايك" عشوائي كمقلب شرير!
    setInterval(checkYoutube, 40000); 

    // فحص دوري للموسيقى (يوتيوب وسبوتيفاي)
    setInterval(updateMusicVibe, 5000);

    //   6. التحقق من السجل الإجرامي الخاص بك: هل قتلت البطة أكثر من 3 مرات مسبقاً؟
    if (deathData.count >= 3) {
       // البطة تعود من الموت غاضبة ومعها مسدس لتنتقم! (Revenge Mode)
       duckState = 'REVENGE';
       speak("DIE YOU SCUMBAG!!");
       setInterval(revengeShoot, 1000); // إطلاق نار عشوائي عليك
    } else {
       duckState = 'IDLE';
       // إذا عادت للحياة للتو من عقوبة الـ 5 دقائق، تقول عبارة استقبالية لك
       if (deathData.recentlyRevived) {
          speak("I know you missed me, you ogre.");
          chrome.storage.sync.set({ recentlyRevived: false });
       } else {
          // وإذا كانت طبيعية، تبدأ في التحدث من تلقاء نفسها كل 35 ثانية
          setInterval(speak, 35000); 
       }
    }
    
    //   تزامن وضع الأدوات مع الواجهة
    chrome.storage.sync.get(['wipingMode', 'gunMode', 'foodMode'], (r) => { 
      if(r.wipingMode) document.body.classList.add('sassy-duck-wiping'); 
      if(r.gunMode) document.body.classList.add('sassy-duck-gun-mode'); 
      if(r.foodMode) document.body.classList.add('sassy-duck-food-mode'); 
    });
  });
}

//   دالة إزالة البطة تماماً من الـ DOM (تُستدعى عند تعطيل الإضافة من الـ Popup أو عند قتلها)
function removeDuck() {
  if (!isRunning) return;
  isRunning = false;
  if (updateFrameId) cancelAnimationFrame(updateFrameId);
  if (container && container.parentNode) container.parentNode.removeChild(container);
  if (akmWrapper && akmWrapper.parentNode) akmWrapper.parentNode.removeChild(akmWrapper);
  if (foodElement && foodElement.parentNode) foodElement.parentNode.removeChild(foodElement);
  releaseMouse();
}

function getRichContext() {
  const context = {
    url: window.location.href,
    hostname: window.location.hostname,
    title: document.title,
    h1: document.querySelector('h1')?.innerText.trim() || 'No main heading',
    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }),
    day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    date: new Date().toLocaleDateString()
  };

  // YouTube Specifics
  if (context.hostname.includes('youtube.com')) {
    context.youtube = {
      videoTitle: document.querySelector('ytd-watch-metadata #title, h1.ytd-video-primary-info-renderer')?.innerText.trim(),
      channel: document.querySelector('#upload-info #channel-name, .ytd-video-owner-renderer #channel-name')?.innerText.trim()
    };
  }

  // Meta Description
  const metaDesc = document.querySelector('meta[name="description"]')?.content;
  if (metaDesc) context.metaDescription = metaDesc.substring(0, 100) + "...";

  console.log("🦆 Sassy Duck Context:", context);
  return JSON.stringify(context);
}

function speak(msg) {
  if (!isRunning || duckState === 'SLEEPING') return; 

  chrome.storage.sync.get(['aiMode', 'language'], (data) => {
    const lang = data.language || 'en';
    
    // 1. If no specific message passed, choose a random one based on context
    if (!msg) {
      if (data.aiMode) {
        chrome.runtime.sendMessage({ 
          type: 'GET_AI_ROAST', 
          context: getRichContext(),
          stats: stats,
          language: lang 
        }, (res) => {
          if (res && res.success) speak(res.reply);
          else {
            const fallback = ROASTS[lang] ? ROASTS[lang]['default'][0] : "I'm occupied with errors.";
            speak(fallback);
          }
        });
      } else {
        const host = window.location.hostname;
        let category = 'default';
        if (host.includes('127.0.0.1') || host.includes('localhost')) category = 'presentation';
        else if (duckState === 'VIBING') category = 'music';
        else {
          for (let key in SITE_MAP) { if (host.includes(key)) category = SITE_MAP[key]; }
        }
        const langData = ROASTS[lang] || ROASTS['en'];
        const arr = langData[category] || langData['default'];
        speak(arr[Math.floor(Math.random() * arr.length)]);
      }
      return;
    }

    // 2. inject message into bubble
    const placeholder = lang === 'ar' ? "رد عليّ يا كئيب..." : "Reply...";
    bubble.innerHTML = `<div class="bubble-text">${msg}</div><div class="bubble-chat" style="display:none; margin-top:5px;"><input type="text" placeholder="${placeholder}" class="sassy-reply-input"></div>`;
    bubble.classList.add('show'); 
    
    // 3. Show chat input if AI is ON
    if (data.aiMode) {
      const chatDiv = bubble.querySelector('.bubble-chat');
      chatDiv.style.display = 'block';
      const input = chatDiv.querySelector('input');
      input.onkeydown = (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
           const userTxt = input.value;
           input.value = "";
           input.disabled = true;
           bubble.querySelector('.bubble-text').innerText = lang === 'ar' ? "بفكر في رد يهزقك..." : "Thinking...";
           
           chrome.runtime.sendMessage({ 
             type: 'GET_AI_ROAST', 
             context: getRichContext(),
             stats: stats,
             userMsg: userTxt,
             language: lang 
           }, (res) => {
             input.disabled = false;
             if (res && res.success) speak(res.reply); 
             else speak(lang === 'ar' ? "أنا مضطهدة وعندي عطل فني.." : "I'm occupied with errors. (AI Error)");
           });
        }
      };
    }

    if (bubbleTimeout) clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(() => {
      if(bubble) bubble.classList.remove('show');
    }, 8000);
  });
}
let bubbleTimeout = null;

function detectYouTubeMusic() {
  if (window.location.hostname.includes('youtube.com')) {
    // 1. Check for the "Music" info panel section (the section the user pointed at with album art)
    const musicPanel = document.querySelector(
      'ytd-info-panel-content-renderer, ' +             // Music info panel
      'ytd-horizontal-card-list-renderer[header="Music"], ' + // Horizontal music cards
      'ytd-video-description-music-section-renderer'     // Music section in description
    );
    if (musicPanel) return true;

    // 2. Check for "Music" text label anywhere in the metadata/description area
    const descArea = document.querySelector('#description, #info-container, ytd-watch-metadata');
    if (descArea) {
      const allText = descArea.querySelectorAll('yt-formatted-string, span, a');
      for (const el of allText) {
        const t = el.textContent.trim().toLowerCase();
        if (t === 'music' || t === 'موسيقى' || t === 'song' || t === 'أغنية') return true;
      }
    }

    // 3. Check if a video element is actually playing audio
    const video = document.querySelector('video');
    if (video && !video.paused && !video.muted && video.volume > 0) {
      // Check title for music-related keywords
      const title = document.title.toLowerCase();
      const musicKeywords = ['official', 'music video', 'lyrics', 'audio', 'song', 'remix', 'ft.', 'feat', 'album', 'أغنية', 'كليب'];
      if (musicKeywords.some(k => title.includes(k))) return true;
    }
  }
  
  if (window.location.hostname.includes('spotify.com')) {
    const nowPlaying = document.querySelector('[data-testid="now-playing-widget"]');
    if (nowPlaying) return true;
  }
  
  return false;
}

// دالة لتحديث حالة الموسيقى العامة
function updateMusicVibe() {
  const isMusic = detectYouTubeMusic();
  if (isMusic) {
     if (duckState !== 'VIBING' && (duckState === 'IDLE' || duckState === 'WANDERING')) {
        duckState = 'VIBING';
        speak(); // ليتم اختيار جملة موسيقية تلقائية من الـ Dictionary
        updateAppearance();
     }
  } else if (duckState === 'VIBING') {
     // إذا توقفت الموسيقى، نعود للتجول
     duckState = 'WANDERING';
     updateAppearance();
  }
}

//   مقلب شرير على اليوتيوب حصراً
function checkYoutube() {
  if(!window.location.hostname.includes('youtube.com') || duckState === 'SLEEPING' || duckState === 'REVENGE') return;
  // بنسبة 50% كل 40 ثانية، تبحث عن زر الديسلايك وتضغط عليه برمجياً!
  if(Math.random() < 0.5) {
      const dislikeBtn = document.querySelector('like-button-view-model button[aria-label*="dislike"], #segmented-dislike-button button');
      if(dislikeBtn) {
         dislikeBtn.click();
         speak("This video is trash, I disliked it for you."); // "الفيديو قمامة، ضغطت لك ديسلايك"
         stats.happiness += 20; // تشعر بالسعادة للتخريب!
      }
  }
}

//   وظيفة إنشاء الـ 💩 عشوائياً (تم تحسين الشكل بـ SVG واقعي)
function dropPoop() {
   const p = document.createElement('div');
   p.className = 'sassy-duck-poop';
   p.innerHTML = `
    <svg viewBox="0 0 100 100" style="width:30px; height:30px;">
      <defs>
        <linearGradient id="poopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#8d6e63;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#5d4037;stop-opacity:1" />
        </linearGradient>
      </defs>
      <path d="M50 10 Q60 0 70 15 Q75 30 50 35 Q20 35 15 55 Q15 75 50 80 Q90 80 85 60 Q80 45 60 45" fill="url(#poopGrad)" stroke="#3e2723" stroke-width="2"/>
      <path d="M25 80 Q10 85 15 95 L85 95 Q95 85 75 80 Z" fill="url(#poopGrad)" stroke="#3e2723" stroke-width="2"/>
      <circle cx="40" cy="65" r="2" fill="white" opacity="0.2" />
    </svg>
   `;
   // إحداثيات الإسقاط أسفل البطة قليلاً
   p.style.left = (pos.x + 40 + (Math.random()*20 - 10)) + 'px';
   p.style.top = (pos.y + 70 + (Math.random()*20 - 10)) + 'px';
   document.body.appendChild(p);
   //   يمكنك مسحها רק باستخدام أداة المسح (Wiping Mode - 🧻)
   p.addEventListener('mousedown', (e) => {
      chrome.storage.sync.get(['wipingMode'], (r) => { if (r.wipingMode) p.remove(); });
      e.stopPropagation(); // منع انتقال النقر للبطة
   });
}

//   ===============================
//   التفاعل البشري: ضرب البطة (Click)
//   ===============================
function hitDuck(e) {
  // لا يمكن ضربها أثناء النوم العميق أو الانتقام
  if (duckState === 'STEALING' || duckState === 'REVENGE' || duckState === 'SLEEPING') return; 
  // لا ضرب إذا كنت تستخدم السلاح القاتل أو الممسحة، הضرب يكون רק בـ اليد الخالية 
  if (document.body.classList.contains('sassy-duck-gun-mode') || document.body.classList.contains('sassy-duck-wiping') || document.body.classList.contains('sassy-duck-food-mode')) return;

  startleDuck(); // تقوم بقفزة خوف
  stats.anger = Math.min(100, stats.anger + 25); // رفع ضغطها جداً بـ 25 نقطة!
  stats.happiness = Math.max(0, stats.happiness - 10);
  stats.sleepiness = 0; // تستيقظ فوراً 
  
  if (duckState === 'AFFECTIONATE') duckState = 'WANDERING'; // كسر وضع المحبة إن ضربتها

  if (stats.anger > 70) {
    duckState = 'CHASING'; // تبدأ في مطاردة המאوس لأنها بلغت مرحلة الغليان!
    document.querySelector('.duck-sweat').style.opacity = 1; // ظهور قطرة العرق من الـ SVG
  }

  //   تفعيل وضع "السحب" (Drag & Drop) 
  isDragging = true;
  dragDist = 0;
  duckState = 'DRAGGED';
  sprite.classList.add('dragging');
  
  // حوارات "افلتني" عند الإمساك بها 
  chrome.storage.sync.get(['language'], (d) => {
    const lang = d.language || 'en';
    const arr = ROASTS[lang]['capture'] || ROASTS[lang]['default'];
    speak(arr[Math.floor(Math.random() * arr.length)]);
  });

  dragOffset.x = e.clientX - pos.x;
  dragOffset.y = e.clientY - pos.y;
  e.preventDefault(); 
  updateAppearance();
}

let _duckStartled = false;
function startleDuck() {
   _duckStartled = true;
   updateAppearance();
   setTimeout(() => { _duckStartled = false; updateAppearance(); }, 400); // مدة مطابقة للـ CSS
}

//   التفاعل اللطيف: المداعبة (Hover/Petting)
let lastPetTime = 0;
function petDuck() {
  if(duckState === 'REVENGE' || duckState === 'SLEEPING') return;
  if(document.body.classList.contains('sassy-duck-gun-mode') || document.body.classList.contains('sassy-duck-wiping') || document.body.classList.contains('sassy-duck-food-mode')) return;
  const now = performance.now();
  // إذا حركت الماوس بهدوء فوقها كأنك تداعبها، يقل غضبها! (كل 200ms)
  if (now - lastPetTime > 200 && !isDragging) {
    stats.happiness = Math.min(100, stats.happiness + 5);
    stats.anger = Math.max(0, stats.anger - 2);
    lastPetTime = now;
    
    // إطلاق تعبيرات كوميدية وساعات "إيحائية" مضحكة
    if (stats.happiness > 40 && Math.random() > 0.8) {
       chrome.storage.sync.get(['language'], (d) => {
         const lang = d.language || 'en';
         const arr = ROASTS[lang]['petting'] || ROASTS[lang]['default'];
         speak(arr[Math.floor(Math.random() * arr.length)]);
       });
    }

    // إن فرحت، يختفي الغضب 
    if (stats.happiness > 80 && duckState !== 'CHASING' && duckState !== 'STEALING' && duckState !== 'SEEKING_FOOD' && duckState !== 'AFFECTIONATE') duckState = 'IDLE'; 
  }
}

//   ===============================
//   ربط الحالة بالـ CSS (تحديث المظهر)
//   ===============================
function updateAppearance() {
  sprite.className = 'sassy-duck-sprite'; // تصفير كلاسات الأنيميشن
  document.querySelector('.duck-hearts').style.opacity = 0; // إخفاء قلوب المحبة احتياطياً

  // --- Reset Mood Accessories ---
  const hat = document.querySelector('.acc-philosopher-hat');
  const glasses = document.querySelector('.acc-romantic-glasses');
  const rose = document.querySelector('.acc-dead-rose');
  if (hat) hat.style.opacity = (currentMood === 'PHILOSOPHER') ? 1 : 0;
  if (glasses) glasses.style.opacity = (currentMood === 'ROMANTIC') ? 1 : 0;
  if (rose) rose.style.opacity = (currentMood === 'ROMANTIC') ? 1 : 0;

  // اتجاه الحركة (يمين أو يسار)
  if (vel.x < -1) sprite.classList.add('sassy-duck-facing-left');
  else if (vel.x > 1) sprite.classList.remove('sassy-duck-facing-left');

  if (_duckStartled) {
      sprite.classList.add('sassy-duck-startled'); // قفزة الخوف
  } else if (duckState === 'REVENGE') {
     sprite.classList.add('sassy-duck-running');
     sprite.classList.add('sassy-duck-revenge'); // الظل الأحمر الدموي
  } else if (duckState === 'VIBING') {
     sprite.classList.add('sassy-duck-happy-dance'); // الرقص لرسالة الـ Audio
  } else if (duckState === 'AFFECTIONATE') {
     // المحبة تجعل البطة ترقص רק أثناء البطء في المشي (لا ترقص وهي تجري וراءך!)
     if (Math.hypot(vel.x, vel.y) < 15) {
        sprite.classList.add('sassy-duck-happy-dance');
     } else {
        sprite.classList.add('sassy-duck-waddling');
     }
     document.querySelector('.duck-hearts').style.opacity = 1; // ظهور القلوب الحمراء בـ الـ SVG!
  } else if (duckState === 'PARKOUR') {
     // حالة الباركور تُدار داخلياً في الـ update loop لكن نحافظ على الشكل هنا
  } else {
     if (duckState === 'SLEEPING') return sprite.classList.add('sassy-duck-sleeping');
     
     //   تحديد مشاعر الغضب والمشي العادية
     if (stats.anger > 80 && duckState !== 'CHASING') sprite.classList.add('sassy-duck-tired');
     else if (stats.anger > 60 || duckState === 'CHASING') sprite.classList.add('sassy-duck-angry');
     
     if (duckState === 'CHASING' || duckState === 'SEEKING_FOOD') sprite.classList.add('sassy-duck-running');
     else if (duckState === 'WANDERING' || duckState === 'STEALING') {
       if (vel.x !== 0 || vel.y !== 0) sprite.classList.add('sassy-duck-waddling'); // خطوة المشي العادية
     } else if (duckState === 'IDLE') {
       sprite.classList.add('sassy-duck-idle'); // الانكماش الطبيعي للتنفس الثابت
     }
     
     if (duckState === 'STEALING') { // حالة مقلب سرقة الماوس
       sprite.classList.add('sassy-duck-holding');
       document.querySelector('.duck-sweat').style.opacity = 0;
     }
  }
}

//   ===============================
//   حلقة التحديث الرئيسية (Main Game Loop) - قلب المشروع النابض بالحركة!
//   ===============================
function update(time) {
  if (!isRunning) return; // توفير موارد المعالجة لو توقفت الإضافة
  
  // حساب (Delta Time): وقت الاستجابة بين الإطارات لجعل السرعة متسقة مهما كانت الشاشة سيئة (60hz vs 144hz)
  const dt = Math.min( (time - lastTime) / 1000, 0.1 ); 
  lastTime = time;

  //   1. حالة السحب בـ המأوس
  if (duckState === 'DRAGGED') {
    // تحديث الموقع مباشرة بـ CSS Transform לيكون سريعاً جداً وملتصقاً بالماوس 
    if (container) container.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    updateFrameId = requestAnimationFrame(update);
    return;
  }
  
  //   2. إبطاء البطة إذا كانت تتحدث لكي يتمكن المستخدم من קراءة النص بوضوح! ذكاء برمجي.
  let talkMod = bubble.classList.contains('show') ? 0.15 : 1.0; 
  
  //   3. محرك الPathfinding (الحركة والذكاء الاصطناعي البسيط)
  if (duckState === 'REVENGE') {
     target.x = mousePos.x; target.y = mousePos.y; 
     moveTowards(target, 100 * talkMod, dt); // تطارد الماوس בبطء مرعب وانحراف عشوائي كالأشباح (Revenge)
     if (Math.random() < 0.05) { vel.x += (Math.random()-0.5)*300; vel.y += (Math.random()-0.5)*300; }
  } else if (duckState === 'SEEKING_FOOD') {
     if (foodTarget) {
        moveTowards(foodTarget, 250 * talkMod, dt); // تجري بسرعة فائقة نحو الأكل
        const dist = Math.hypot(foodTarget.x - (pos.x+50), foodTarget.y - (pos.y+50));
        // تم تصغير المسافة لتكون اللمسة "فورية" وبدقة عالية
        if (dist < 30) {
            duckState = 'AFFECTIONATE'; 
            if (foodElement) { foodElement.remove(); foodElement = null; }
            foodTarget = null;
            foodTeaseCount = 0; 
            stats.happiness = 100; stats.anger = 0; 
            speak("YUM! Finally some good quality trash!"); 
            updateAppearance();
        }
     } else { duckState = 'WANDERING'; }
  } else if (duckState === 'AFFECTIONATE') { // وضع المحبة يتبع الماوس בلطف كالحيوان اللطيف!
     moveTowards(mousePos, 70 * talkMod, dt); 
     const dist = Math.hypot(mousePos.x - (pos.x+50), mousePos.y - (pos.y+50));
     // تقف כשتقترب لتلتصق بسهم המاوس 
     if (dist < 100) { vel.x *= 0.7; vel.y *= 0.7; } 
  } else if (duckState === 'WANDERING' || duckState === 'IDLE') { 
    // وضع التجول العشوائي في الشاشة بمعدل تغير 1% 
    if (Math.random() < 0.01) {
      target.x = Math.max(50, Math.min(window.innerWidth - 100, pos.x + (Math.random() - 0.5) * 400));
      
      //   ميكانيكية التحيز الأرضي (Ground Bias): البطة بنسبة 90% ستختار هدفاً للمشي يقع "بأسفل الشاشة فقط" كأنها تمشي على الأرض
      if (Math.random() < 0.90) {
         target.y = window.innerHeight - 100 + (Math.random() * 20); 
      } else {
         target.y = Math.max(50, Math.min(window.innerHeight - 150, pos.y + (Math.random() - 0.5) * 400));
      }
      duckState = 'WANDERING';
    }
    
    if (duckState === 'WANDERING') {
      moveTowards(target, 20 * talkMod, dt); // المشي العشوائي البطيء جداً (20x)
      if (Math.hypot(target.x - pos.x, target.y - pos.y) < 10) { duckState = 'IDLE'; vel.x = 0; vel.y = 0; }
    } else { vel.x *= 0.7; vel.y *= 0.7; } // احتكاك الأرض يخفف السرعة في وضعية السكون
    
    //   مقلب شرير: حجب الروابط! (Link Hijacking)
    if (duckState === 'IDLE' && Math.random() < 0.005 && !bubble.classList.contains('show')) {
       // تجلب جميع الروابط <a> في الصفحة وتقرر الوقوف فوق أحدهم لكي لا تستطيع النقر عليه! (عبقرية شيطانية)
       const links = Array.from(document.querySelectorAll('a[href]')).filter(l => l.getBoundingClientRect().top > 0);
       if(links.length > 0) {
          const l = links[Math.floor(Math.random() * links.length)];
          const rect = l.getBoundingClientRect();
          target.x = rect.left + rect.width / 2;
          target.y = rect.top + rect.height / 2;
          duckState = 'WANDERING';
          stats.playfulness = 100;
       }
    }

    // ===== PARKOUR TRIGGER (3% chance every frame while IDLE) =====
    if (duckState === 'IDLE' && Math.random() < 0.003 && !parkourActive) {
       // Scan for visible, jumpable page elements
       const jumpables = Array.from(document.querySelectorAll('button, img, input, [role="button"], .card, video, h1, h2, h3'))
         .map(el => {
           const r = el.getBoundingClientRect();
           return { el, cx: r.left + r.width/2, cy: r.top + r.height/2, w: r.width, h: r.height, top: r.top };
         })
         .filter(o => o.w > 30 && o.h > 20 && o.top > 50 && o.top < window.innerHeight - 50 && o.cx > 50 && o.cx < window.innerWidth - 50);
       
       if (jumpables.length > 0) {
         const chosen = jumpables[Math.floor(Math.random() * jumpables.length)];
         parkourTarget = { x: chosen.cx, y: chosen.cy, h: chosen.h, el: chosen.el };
         parkourPhase = 'APPROACH';
         parkourActive = true;
         duckState = 'PARKOUR';
         updateAppearance();
       }
    }
  } else if (duckState === 'PARKOUR') {
    // ===== PARKOUR STATE: 3-phase acrobatic jump =====
    if (parkourPhase === 'APPROACH') {
      // Phase 1: Run toward the target element
      const approachTarget = { x: parkourTarget.x - 120, y: parkourTarget.y };
      moveTowards(approachTarget, 250, dt);
      sprite.className = 'sassy-duck-sprite sassy-duck-running';
      const dist = Math.hypot(approachTarget.x - pos.x, approachTarget.y - pos.y);
      if (dist < 30) {
        // Ready to jump! Save starting position
        parkourStartPos = { x: pos.x, y: pos.y };
        parkourJumpProgress = 0;
        parkourPhase = 'JUMPING';
        sprite.classList.add('sassy-duck-parkour-flip');
        // Highlight the target element with a glow
        if (parkourTarget.el) {
          parkourTarget.el.style.transition = 'box-shadow 0.3s';
          parkourTarget.el.style.boxShadow = '0 0 25px 8px rgba(241, 196, 15, 0.7)';
        }
      }
    } else if (parkourPhase === 'JUMPING') {
      // Phase 2: Parabolic arc over the element
      parkourJumpProgress += dt * 1.8; // Speed of jump
      if (parkourJumpProgress >= 1) parkourJumpProgress = 1;

      const t = parkourJumpProgress;
      const landX = parkourTarget.x + 120; // Land 120px past the element
      const landY = parkourStartPos.y;
      
      // Linear interpolation for X
      pos.x = parkourStartPos.x + (landX - parkourStartPos.x) * t;
      // Parabolic arc for Y (jump height based on element height + extra)
      const jumpHeight = Math.max(120, parkourTarget.h + 80);
      pos.y = parkourStartPos.y - (jumpHeight * 4 * t * (1 - t)); // parabola: peaks at t=0.5
      
      vel.x = 0; vel.y = 0; // Override velocity during jump arc
      
      if (parkourJumpProgress >= 1) {
        // Landed!
        parkourPhase = 'LANDING';
        pos.y = landY; // Reset to ground level
        sprite.classList.remove('sassy-duck-parkour-flip');
        // Remove glow from target
        if (parkourTarget.el) {
          parkourTarget.el.style.boxShadow = '';
        }
        // Say something cool
        const comments = (currentLangCache === 'ar') ? PARKOUR_COMMENTS_AR : PARKOUR_COMMENTS_EN;
        speak(comments[Math.floor(Math.random() * comments.length)]);
        stats.happiness = Math.min(100, stats.happiness + 20);
        stats.anger = Math.max(0, stats.anger - 10);
        // Brief landing pose then return to normal
        setTimeout(() => {
          parkourActive = false;
          parkourTarget = null;
          parkourPhase = '';
          if (duckState === 'PARKOUR') duckState = 'IDLE';
          updateAppearance();
        }, 1200);
      }
    } else if (parkourPhase === 'LANDING') {
      // Phase 3: Stand still with victory pose
      vel.x = 0; vel.y = 0;
      sprite.className = 'sassy-duck-sprite sassy-duck-parkour-land';
    }
  } else if (duckState === 'CHASING') {
    //   المطاردة السريعة للماوس (CHASING) מتى تكون غاضبة فوق الـ 80%
    moveTowards(mousePos, 150 * talkMod, dt); 
    const distToMouse = Math.hypot(mousePos.x - pos.x, mousePos.y - pos.y);
    if (distToMouse < 40) {
      // אם نجحت بمسك המאوس الخاص بك، تسرقه!
      duckState = 'STEALING'; 
      hijackMouse(); // استدعاء الدالة المختصة بإخفاء الماوس الحقيقي!
      target.x = Math.random() * (window.innerWidth - 100);
      target.y = Math.random() * (window.innerHeight - 100);
      updateAppearance();
    }
    // تستسلم إذا ابتعدت המاوس لأكثر من 800 بكسل وتنسى الغضب جزئياً
    if (distToMouse > 800) { 
      duckState = 'WANDERING'; stats.anger -= 20; target = { x: pos.x, y: pos.y }; updateAppearance();
    }
  } else if (duckState === 'STEALING') { //   حالة سرقة המאوس 
    moveTowards(target, 120 * talkMod, dt); 
    if (Math.hypot(target.x - pos.x, target.y - pos.y) < 10) {
      target.x = Math.random() * (window.innerWidth - 100); target.y = Math.random() * (window.innerHeight - 100);
    }
    const mouseSpeed = Math.hypot(mousePos.x - lastMousePos.x, mousePos.y - lastMousePos.y);
    // طريقة استعادة המاوس: أن يقوم المستخدم بهز המاوس الحقيقي بسرعة وعنف لتفلتها البطة!
    if (mouseSpeed > 100) { 
      duckState = 'IDLE'; releaseMouse(); stats.anger = 0; 
      vel.x = (lastMousePos.x - mousePos.x) * 10; 
      vel.y = (lastMousePos.y - mousePos.y) * 10; 
      updateAppearance();
    }
  } else if (duckState === 'SLEEPING') {
      if (Math.random() < 0.02) { // ذرات Zzzz تتطاير من رأس البطة 
          const z = document.createElement('div');
          z.innerText = 'Z';
          z.className = 'sassy-duck-zzz';
          z.style.left = (pos.x + 50 + Math.random()*20 - 10) + 'px';
          z.style.top = (pos.y - 20) + 'px';
          document.body.appendChild(z);
          setTimeout(() => z.remove(), 2000);
      }
  }

  //   4. تحريك الPosition بناءً على הVelocity והזמן (dt)
  pos.x += vel.x * dt; pos.y += vel.y * dt;
  // جدار حماية (Collision Detection): لمنع البطة من الخروج نهائياً من حدود שاشة المتصفح
  pos.x = Math.max(0, Math.min(window.innerWidth - 100, pos.x)); pos.y = Math.max(0, Math.min(window.innerHeight - 100, pos.y));
  
  //   5. منطق أنيميشن الطيران المتقن: 
  const groundThreshold = window.innerHeight - 120; // אם ارتفعت عن الأرض (أسفل الصفحة) 
  if(pos.y < groundThreshold) {
      // הבطة "تطير" لأنك رفعتها، وتضم أرجلا!
      if(!sprite.classList.contains('sassy-duck-flying')) {
          sprite.classList.add('sassy-duck-flying');
          if (Math.random() < 0.1 && duckState !== 'DRAGGED') playSound('quack'); // صوت بطة مطاطية عند التحليق العشوائي
      }
  } else {
      // هبطت على الأرض ومشت دوبارہ
      if(sprite.classList.contains('sassy-duck-flying')) sprite.classList.remove('sassy-duck-flying');
  }

  //   6. قلب צورة הבطة (Flip) يميناً ويساراً بناءً على اتجاه المتجه السيني (x)
  if (duckState !== 'SLEEPING') {
    if (vel.x < -2) sprite.classList.add('sassy-duck-facing-left');
    if (vel.x > 2) sprite.classList.remove('sassy-duck-facing-left');
  }
  if(duckState === 'WANDERING' && (!sprite.classList.contains('sassy-duck-waddling'))) updateAppearance();

  //   تحديث سجل המاوس وتحديث الواجهة للDraw final phase 
  lastMousePos = { ...mousePos };
  if (container) container.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  
  // طلب الإطار التالي! (Loop مستمر)
  updateFrameId = requestAnimationFrame(update);
}

//   وظيفة مساعدة رياضية للحركة تحسب الزاوية والمسافة باستخدام مثلث فيثاغورس (Math.hypot)
function moveTowards(targetPoint, speed, dt) {
  const dx = targetPoint.x - pos.x, dy = targetPoint.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 5) { vel.x += (dx / dist) * speed; vel.y += (dy / dist) * speed; }
}

let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let dragDist = 0;

//   ===============================
//   مستمعات أحداث המשתמש (Window Listeners) لضبط تفاعلات النافذة الكلية
//   ===============================

window.addEventListener('mouseup', () => { //   عند إفلات הבطة המمسوكة
  if (isDragging && isRunning) {
    isDragging = false;
    duckState = 'WANDERING';
    sprite.classList.remove('dragging', 'sassy-duck-kicking');
    vel.y = -100; // إضافة ارتداد סقوط קليط
    updateAppearance();
  }
});

//   مراقبة حركة الماوس בכל أنحاء المتصفح
window.addEventListener('mousemove', (e) => {
  mousePos.x = e.clientX; mousePos.y = e.clientY; stats.sleepiness = 0; // حركة המاوس توقظها!
  
  if (isDragging && isRunning) {
    // تحديث مكان البطة لتُسحب בالماوس
    const dx = e.clientX - dragOffset.x - pos.x, dy = e.clientY - dragOffset.y - pos.y;
    pos.x = e.clientX - dragOffset.x; pos.y = e.clientY - dragOffset.y;
    dragDist += Math.hypot(dx, dy);
    //   אם تم سحبها למساحة كبيرة جداً... הבطة ترفس ותغضب 100%!
    if(dragDist > 1200) {
       sprite.classList.add('sassy-duck-kicking'); stats.anger = 100; document.querySelector('.duck-sweat').style.opacity = 1; 
    }
  }

  //   🎯 منطق توجيه السلاح (Gun Mode) לيصوب בדיוק مكان الماوس!
  if (document.body.classList.contains('sassy-duck-gun-mode') && akmWrapper) {
    const akmX = window.innerWidth / 2; // نقطة تثبيت הסلاح بالمنتصف السفلي
    const akmY = window.innerHeight;
    const dx = mousePos.x - akmX;
    const dy = mousePos.y - akmY;
    const angle = Math.atan2(dy, dx); //   دالة الدوران الرياضية (تحويل المحورين לزاوية راديان)
    const scaleY = mousePos.x < window.innerWidth / 2 ? 'scaleY(-1)' : 'scaleY(1)'; // قلب مسدس הـAKM إذا التفتنا لليسار
    akmWrapper.style.transform = `rotate(${angle}rad) ${scaleY}`; // تدويره בـCSS الحقيقي!
  }
});

//   مقلب חجب الروابط: منع المستخدم من النقر إذا قررت הבطة الوقوف فوق الرابط!
window.addEventListener('click', (e) => {
   if(duckState === 'WANDERING' || duckState === 'IDLE') {
      if(e.target.closest('a')) { // إذا كان النقر فوق رابط <a>
         const duckCenter = {x: pos.x + 50, y: pos.y + 50};
         const distToDuck = Math.hypot(e.clientX - duckCenter.x, e.clientY - duckCenter.y);
         // 30% احتمالية الحجب אם كانت הבطة قريبة מאוד מالرابط
         if(distToDuck < 100 && Math.random() < 0.3) { 
             e.preventDefault(); // إيقاف إرسال الرابط
             e.stopPropagation(); // إيقاف الحدث بأكمله
             speak("NOT TODAY!"); // البطة تسخر منه!
             stats.happiness += 10;
             updateAppearance();
         }
      }
   }
}, true); // מرحلة الـ Capture להضمن إيقاف الـClick לפני وصوله למوقع الحقيقي

//   مقلب الإزعاج من نزول الشاشة (Scroll Annoyance)
let scrollTimeout;
window.addEventListener('scroll', () => {
    if(!isRunning || duckState === 'SLEEPING') return;
    stats.sleepiness = 0;
    if(duckState === 'VIBING') duckState = 'WANDERING';
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
       if(Math.random() < 0.1) {
           speak("Stop scrolling so fast, I'm dizzy!"); // البطة تدوخ من سكرول المستخدم العنيف!
           sprite.style.transform = `scale(0.9) rotate(360deg)`; // دوران كامل
           setTimeout(() => sprite.style.transform = '', 500);
       }
    }, 200);
});

//   شيطان الأخطاء الإملائية (Typo Demon!): מﻦ أخطر المزايا في الإضافة
document.addEventListener('keydown', (e) => {
   if (!isRunning || duckState === 'SLEEPING') return;
   stats.sleepiness = 0;
   if (duckState === 'VIBING') duckState = 'WANDERING';
   
   // هل يكتب الضحية في مربع إدخال النص؟ (صندوق تعليق فيسبوك مثلا؟)
   if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (Math.random() < 0.05) { // 5% احتمالية مع كل حرف იكتبه
          e.preventDefault(); // تجاهل الحرف الذي أراد كتابته
          const p = e.target.selectionStart; // مؤشر الكتابة الحالي
          const v = e.target.value;
          // إحلال رمز البطة بين الحروف! [Quack]
          e.target.value = v.slice(0, p) + '[Quack]' + v.slice(e.target.selectionEnd);
          e.target.selectionStart = e.target.selectionEnd = p + 7; // إعادة تحريك المؤشر للأمام
          
          speak("OOPs! A typo! [Quack]");
          playSound('quack');
          stats.playfulness = 100;
          stats.anger = Math.max(0, stats.anger - 10);
          updateAppearance();
      }
   }
}, true);


//   ===============================
//   الدماء، القتل، والانتقام (أدوات الموت!)
//   ===============================

// דالة رسم الدماء عند الطلق הנاري (Gun Mode)
function drawBlood(x, y) {
  const blood = document.createElement('div');
  blood.className = 'sassy-blood-splatter';
  // נشر הדماء عشوائياً حول مكان الإصابة במساحة دائرية
  blood.style.left = (x - 75 + (Math.random()*40-20)) + 'px';
  blood.style.top = (y - 75 + (Math.random()*40-20)) + 'px';
  // دوران وזوم عشوائي כדי لا تبدو الدماء צورة مكررة وواضحة (Randomness makes perfection)
  const rotation = Math.random() * 360; 
  const scale = 0.5 + Math.random();
  blood.style.transform = `rotate(${rotation}deg) scale(${scale})`;
  document.body.appendChild(blood);
  // אם كان المستخدم بحوزته المناديل (Wiping Mode 🧻)، יכול مسح الدم بالضغط עליו
  blood.addEventListener('mousedown', (e) => {
     chrome.storage.sync.get(['wipingMode'], (r) => { if (r.wipingMode) blood.remove(); });
     e.stopPropagation();
  });
}

// דالة مقتل البطة והحفظ في سحابات الـ (Storage API) لتبقى ميتة حتى يتم إعادتها
function murderDuck() {
  removeDuck(); // إخفاء הבطة الحالية
  deathData.count += 1; // عداد مرات القتل
  const resetCount = deathData.count > 3 ? 0 : deathData.count; // بعد الـ 3 مرات נصفره (ونستدعي הודا الانتقام)
  
  chrome.storage.sync.set({ 
    duckStatus: 'DEAD', 
    deadUntil: Date.now() + (5 * 60 * 1000), // وقت الإحياء: بعد 5 دقائق بالضبط!
    deathCount: resetCount,
    recentlyRevived: true,
    deathSite: window.location.hostname // أين تم استشهاد הבطة؟! للعب عليه في המقالب הـ Popup
  });
}

// دالة الانتقام (حين تطلق البطة النار على שاشتك!)
function revengeShoot() {
  if (duckState !== 'REVENGE' || !isRunning) return;
  playSound('shoot'); // صوت السلاح
  
  // رسם זجاج مكسور במكان الماوس الخاص بك! (مقلب شديد الرعب)
  const hole = document.createElement('div');
  hole.className = 'sassy-bullet-hole';
  hole.innerHTML = crackSVG;
  hole.style.left = (mousePos.x + (Math.random()*200-100)) + 'px'; // إحداثيات بجوار الماوس
  hole.style.top = (mousePos.y + (Math.random()*200-100)) + 'px';
  document.body.appendChild(hole);
  playSound('glass'); // صوت زجاج שاشة الضحية يتحطم!
  setTimeout(() => hole.remove(), 5000); 
  
  document.body.classList.add('sassy-shake'); // اهتزاز الشاشة العنيف!
  setTimeout(() => document.body.classList.remove('sassy-shake'), 100);

  if (Math.random() < 0.2) speak(); 
}

//   منطق النقر العشوائي للمستخدم (سواءً להطعام أو إطلاق النار بواسطة الأدوات)
window.addEventListener('mousedown', (e) => {
  chrome.storage.sync.get(['gunMode', 'foodMode'], (r) => {
    if (!isRunning) return;
    
    // -- FOOD MODE (وضع الإطعام 🍲) --
    if (r.foodMode) {
       // فحص "מقلب الطعام": אذا המستخدم وضع الطعام، ثم نقر עליו لלسحبه בחبثة! 
       const bowl = e.target.closest('.sassy-food-bowl');
       if (bowl) {
         if (foodElement) foodElement.remove();
         foodElement = null; 
         foodTarget = null;
         stats.anger = 100; // الغضب يفور إلى المئة!
         stats.happiness = 0;
         duckState = 'CHASING'; // מתحילה المطاردة
         let msg = foodTeases[Math.min(foodTeaseCount, foodTeases.length - 1)];
         foodTeaseCount++;
         speak(msg); // توبخه على سحب الطعام
         updateAppearance();
         e.stopPropagation();
         return;
       }

       //   אם لم تكن حيلة، سيتم وضع الصحن במكان نقرة الماوس
       if (foodElement) foodElement.remove(); // مسح الطبق القديم
       foodElement = document.createElement('div');
       foodElement.className = 'sassy-food-bowl';
       foodElement.innerHTML = `
        <svg viewBox="0 0 100 100" style="width:40px; height:40px;">
          <path d="M10 60 Q10 90 50 90 T90 60 Z" fill="#95a5a6" stroke="#7f8c8d" stroke-width="2"/>
          <path d="M20 60 Q50 50 80 60" fill="#e67e22" />
          <circle cx="40" cy="55" r="5" fill="#2ecc71" />
          <circle cx="60" cy="58" r="4" fill="#e74c3c" />
          <path d="M45 40 Q50 20 55 40" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2" />
        </svg>
       `;
       foodElement.style.left = (e.pageX - 20) + 'px';
       foodElement.style.top = (e.pageY - 20) + 'px';
       document.body.appendChild(foodElement);
       
       foodTarget = { x: e.clientX, y: e.clientY }; // تحديد نقطة الطעام كهدف للبطة
       duckState = 'SEEKING_FOOD';
       stats.anger = 0; stats.happiness = 100; // تشحط الغضب מباشرة وتתجه للفرح!
       updateAppearance();
       return;
    }

    // -- GUN MODE (وضع السلاح 🔫) --
    if (r.gunMode) {
      if (document.body.classList.contains('sassy-shake')) return; // منع הـ Spam!
      playSound('shoot'); // صوﺖ الطلقة
      akmWrapper.classList.add('sassy-akm-shooting'); // أنيميشن الإرتداد للسلاح بأسفل الشاشة
      setTimeout(() => akmWrapper.classList.remove('sassy-akm-shooting'), 100);

      //   رسم الخط المُتوهج לلطلقة (Tracer) وحسابه هندسياً וفيزيائياً!
      const tracer = document.createElement('div');
      tracer.className = 'sassy-tracer';
      const akmX = window.innerWidth / 2; // نقطة انطلاقها من أسفل منتصف الشاشة 
      const akmY = window.innerHeight - 20; 
      
      const rayDx = e.clientX - akmX;
      const rayDy = e.clientY - akmY;
      const angle = Math.atan2(rayDy, rayDx);
      const degree = angle * (180 / Math.PI); // تحويل الراديان لدرجات עבור CSS Rotate
      
      //   إطالة الطلقة לتخترق مسار الماوس וتضرب أقصى جدار بـالشاشة (Raycasting logic)
      let tMin = Infinity;
      if (rayDy < 0) tMin = Math.min(tMin, -akmY / rayDy); // الحافة العلوية
      if (rayDx < 0) tMin = Math.min(tMin, -akmX / rayDx); // החافة اليسرى
      if (rayDx > 0) tMin = Math.min(tMin, (window.innerWidth - akmX) / rayDx); // الحافة اليمنى
      
      let targetX = akmX + (rayDx * tMin);
      let targetY = akmY + (rayDy * tMin);
      
      const distance = Math.hypot(targetX - akmX, targetY - akmY);
      const durationMs = Math.max(100, (distance / 4000) * 1000); //   وقت الرحلة (Travel Time) بناءً על المسافة

      // ضبط הعدادות الطلقة
      tracer.style.left = akmX + 'px';
      tracer.style.top = akmY + 'px';
      tracer.style.transform = `rotate(${degree}deg)`;
      tracer.style.transition = `left ${durationMs / 1000}s linear, top ${durationMs / 1000}s linear`;
      document.body.appendChild(tracer);

      // بدء تحريكها
      setTimeout(() => {
         tracer.style.left = targetX + 'px';
         tracer.style.top = targetY + 'px';
      }, 10);

      // نهاية הطلقة وإظهار حفرة הרصاص בגدار الشاشة
      setTimeout(() => {
         tracer.remove();
         const hole = document.createElement('div');
         hole.className = 'sassy-bullet-hole';
         // תיקون طفيف للمكان إذا ضربت החافة בـالظبط ليظهر الثقب بالكامل
         let holeX = targetX;
         let holeY = targetY;
         if (targetX <= 0) holeX = 5;
         if (targetX >= window.innerWidth) holeX = window.innerWidth - 15;
         if (targetY <= 0) holeY = 5;
         
         hole.style.left = (holeX - 10) + 'px';
         hole.style.top = (holeY - 10) + 'px';
         document.body.appendChild(hole);
         setTimeout(() => hole.remove(), 2000); // إخفاء الثقب بعد ثانيتين
      }, durationMs); 

      //   🎯 هل أصبت הבطة؟ (Hit Detection Logic) 
      const duckCenterX = pos.x + 50;
      const duckCenterY = pos.y + 50;
      const distTarget = Math.hypot(e.clientX - duckCenterX, e.clientY - duckCenterY); // البعد בין النقرة وְالبطة

      if (distTarget < 150) { 
        // אم تقترب الطلقة מالبطة.. הבطة ستتفادى إذا לא كانت بوضع الانتقام! (Matrix Dodge!)
        if (duckState !== 'REVENGE') { 
          playSound('dodge');
          sprite.classList.add('sassy-duck-matrix-dodge'); // أنيميشن الانبعاج והشبح!
          setTimeout(() => sprite.classList.remove('sassy-duck-matrix-dodge'), 300);

          // הבطﺔ تطير مبتعدة ענך بسبب الطلقة 
          const ddx = duckCenterX - e.clientX;
          const ddy = duckCenterY - e.clientY;
          vel.x = Math.cos(Math.atan2(ddy, ddx)) * 3500; // سرعة جبارة לـالتفادي
          vel.y = Math.sin(Math.atan2(ddy, ddx)) * 3500;
          pos.x += vel.x * 0.05; pos.y += vel.y * 0.05;
          // חفظها داخل השاشة
          pos.x = Math.max(0, Math.min(window.innerWidth - 100, pos.x));
          pos.y = Math.max(0, Math.min(window.innerHeight - 100, pos.y));
        }

        //   אهل كانت الرمية دقيقة جداً (رأس הבطة أو בداخل الدائرة המוيتة 60 بكسل؟)
        setTimeout(() => {
          const hitDist = Math.hypot(e.clientX - (pos.x+50), e.clientY - (pos.y+50));
          if (hitDist < 60) {
            // הإصابة!!! الدماء تنتشر في الشاشة 🩸
            drawBlood(duckCenterX, duckCenterY);
            drawBlood(duckCenterX, duckCenterY); 
            drawBlood(duckCenterX, duckCenterY); 
            murderDuck(); //   استدعاء דالة الـوفاة (يومك אسوء يوم يا قاتل)
          } else {
            // אם فشلت وأخطأتها (Miss!)
            if(duckState !== 'REVENGE') {
               duckState = 'WANDERING';
               speak(Math.random() > 0.5 ? "Missed me!" : "Too slow!"); // تستهزأ בك لأنك בطيء
            }
          }
          if (isRunning) updateAppearance();
        }, 150); 
      }
    }
  });
}, true);

//   ===============================
//   الـ Message Passing : التحدث مع باقي أجزاء الإضافة 
//   ===============================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 0. تفعيل/تعطيل الإضافة لحظياً
  if (msg.type === 'TOGGLE_DUCK') {
    if (msg.enabled) {
        // نطلب التشغيل.. دالة initDuck ستتأكد من عدم وجود بطة مكررة
        initDuck(); 
    } else {
        removeDuck();
    }
    return;
  }

  // 1. طلب الإحصائيات (من الـ Popup)
  if (msg.type === 'GET_STATS') {
    if (isRunning) sendResponse(stats);
    return;
  }

  // 2. تحديث الأدوات لحظياً (Gun, Food, Wipe)
  if (msg.type === 'UPDATE_TOOLS') {
    if (msg.wipingMode) document.body.classList.add('sassy-duck-wiping');
    else document.body.classList.remove('sassy-duck-wiping');

    if (msg.gunMode) document.body.classList.add('sassy-duck-gun-mode');
    else document.body.classList.remove('sassy-duck-gun-mode');

    if (msg.foodMode) document.body.classList.add('sassy-duck-food-mode');
    else document.body.classList.remove('sassy-duck-food-mode');

    if (!msg.foodMode && foodElement) {
       foodElement.remove();
       foodElement = null;
       foodTarget = null;
    }
    return;
  }

  // إذا كانت البطة معطلة، لا نكمل مع باقي الرسائل
  if (!isRunning) return;

  // 3. إستقبال رسالة ״بداية الموسيقى" من الـ Background
  else if (msg.type === 'AUDIO_STARTED') {
    if (performance.now() - lastInternalAudioTime < 2000) return;
    updateMusicVibe();
  }

  // 4. جعل البطة تتكلم بنص محدد (من الـ Popup)
  else if (msg.type === 'DUCK_SPEAK') {
    speak(msg.text);
  }

  // 5. تحديث اللغة لحظياً (لتغيير Placeholder المدخلات وغيرها)
  else if (msg.type === 'UPDATE_LANG') {
    // تحديث الـ placeholders إذا كانت الفقاعة مفتوحة
    const input = bubble.querySelector('.sassy-reply-input');
    if (input) {
      input.placeholder = msg.language === 'ar' ? "رد عليّ يا كئيب..." : "Reply...";
    }
  }
});

//   ===============================
//   تشغيل الـ Bootloader 
//   ===============================
initDuck();
