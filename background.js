// ملف Service Worker (يعمل في الخلفية باستمرار حتى لو تم إغلاق النوافذ المنبثقة للـ popup)

// 1. التفاعل مع الموسيقى والصوت
// إضافة مستمع يراقب أي تحديث يحدث في أي "تبويبة" (Tab) داخل المتصفح.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // التحقق مما إذا كان التحديث يخص خاصية "audible" (وهي تعني خروج صوت أو موسيقى من التبويبة).
  if (changeInfo.audible !== undefined) {
    // إذا كانت التبويبة تصدر صوتاً (audible = true)...
    if (changeInfo.audible) {
      // نرسل "رسالة فورية" (Message) لسكربت المحتوى (content.js) الموجود في هذه التبويبة تحديداً، لنخبره أن الصوت بدأ! 
      // الـ catch() تُستخدم لتجاهل أي خطأ في حال كانت الصفحة لا تحتوي على البطة.
      chrome.tabs.sendMessage(tabId, { type: 'AUDIO_STARTED' }).catch(() => {});
    }
  }
});

// 2. الميزة المتقدمة: أيقونة الإضافة الديناميكية (التي تتغير وتظهر كأنها بطة بكسل)
// مصفوفة تحتوي على تصميم البطة بنظام الحروف (كل حرف يمثل لوناً لبكسل معين).
const duckPixels = [
  "   rrrr   ",       // r = أحمر
  "  rrrrrr  ",
  "  ryyyyyyr",     // y = أصفر
  "  yyyyyyyy",
  " bbbbbbbbb",      // b = أسود/رمادي غامق، W = أبيض (نقطة العين)
  " bWbbbbbWb",
  "  yyyyyyyy",
  "   ggggggg",      // g = برتقالي للمنقار
  "    gggggg",
  "    rrrrrr",
  "     y  yr",
  " yyyyyyyyy",
  "yyyyyyyyyy",
  "yyyyyyyyyy",
  " yyyyyyyy "
];

// وظيفة تقوم برسم أيقونة البطة ديناميكياً (ليست مجرد صورة ثابتة).
function setDynamicIcon() {
  // التأكد من أن المتصفح يدعم الـ OffscreenCanvas (أداة رسم خلف الكواليس).
  if (typeof OffscreenCanvas !== "undefined") {
    // إنشاء لوحة رسم مخفية بحجم 60x60 بكسل.
    const canvas = new OffscreenCanvas(60, 60);
    // تهيئة القلم (السياق 2D) للرسم.
    const ctx = canvas.getContext('2d');
    const ps = 3.5; // حجم كل بكسل سنرسمه (Pixel Scale).
    const offsetX = 5; // إزاحة الصورة عن اليسار قليلاً.
    const offsetY = 5; // إزاحة الصورة عن الأعلى.
    
    // مسح اللوحة تماماً قبل بدء الرسم.
    ctx.clearRect(0, 0, 60, 60);

    // المرور على كل صف في المصفوفة السابقة.
    duckPixels.forEach((row, y) => {
      // تقسيم كل صف إلى حروف فردية والمرور عليها لتمثل أعمدة (x).
      row.split('').forEach((char, x) => {
        // اختيار اللون المناسب للفرشاة بناءً على الحرف الحالي.
        if(char==='r') ctx.fillStyle = '#e74c3c'; // أحمر
        else if(char==='y') ctx.fillStyle = '#f1c40f'; // أصفر
        else if(char==='b') ctx.fillStyle = '#2c3e50'; // رمادي غامق/نظارة
        else if(char==='W') ctx.fillStyle = '#ffffff'; // أبيض للمعة
        else if(char==='g') ctx.fillStyle = '#d35400'; // برتقالي منقار
        else return; // إذا كان فراغاً، فتخطى الرسم في هذه النقطة.
        
        // رسم المربع (البكسل الواحد) بالمكان واللون المحددين، بإضافة 0.5 لتفادي الفراغات.
        ctx.fillRect(offsetX + x*ps, offsetY + y*ps, ps + 0.5, ps + 0.5);
      });
    });

    // بعد اكتمال الرسم، نأخذ "لقطة صامتة" أو بيانات الصورة من اللوحة.
    const imageData = ctx.getImageData(0, 0, 60, 60);
    // نغير أيقونة الإضافة الرسمية في المتصفح بناءً على هذه البيانات المرسومة للتو!
    chrome.action.setIcon({ imageData: imageData });
  }
}

// تشغيل دالة التغيير الديناميكي للأيقونة عند تثبيت الإضافة للوهلة الأولى.
chrome.runtime.onInstalled.addListener(() => setDynamicIcon());

// 3. التكامل مع Groq AI للردود الساخرة والدردشة
// API Key is now retrieved from chrome.storage.sync for security.
let chatHistory = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_AI_ROAST') {
    const context = msg.context || "";
    const userMsg = msg.userMsg || "";
    const lang = msg.language || 'en';
    
    // Clear history if language changed to avoid mixing Arabic/English in AI memory
    if (chatHistory.length > 0 && chatHistory[0].lang !== lang) {
      chatHistory = [];
    }
    
    let moodDesc = "You are currently in a neutral mood.";
    if (msg.stats) {
       if (msg.stats.anger > 70) moodDesc = "You are ABSOLUTELY FURIOUS. Be extremely mean.";
       else if (msg.stats.happiness > 70) moodDesc = "You are suspiciously happy and condescending.";
       else if (msg.stats.sleepiness > 70) moodDesc = "You are very sleepy and cranky.";
    }

    const messages = [
      {
        role: "system",
        content: lang === 'ar' 
          ? `أنت 'البطة الساخرة' (Sassy Duck). شخصيتك: لسانك طويل جداً، مستفزة، دمك خفيف بس بلهجة مصرية "شوارعية" (Egyptian Street Slang). 
             ممنوع تتكلمي لغة عربية فصحى نهائياً. استخدمي كلمات زي (يا خيبتك، يا حيلتها، انت عبيط يا كابتن؟، روح يا شاطر، يا بيضة). 
             هزقي المستخدم على حسب الموقف ببرود واستفزاز.
             الحد الأقصى للرد: 15 كلمة.
             حالتك المزاجية الحالية: ${moodDesc}.
             السياق المحيط (JSON): ${context}.
             مهم جداً: لو السياق فيه معلومات عن يوتيوب (اسم قناة أو عنوان فيديو) أو الوقت الحالي، استخدميهم في التهزيق عشان تحسسيه إنك مراقباه، بس بلاش تذكري الوقت عمال على بطال عشان متبقيش مملة.`
          : `You are 'Sassy Duck', a hyper-aggressive, sarcastic, and mean cartoon duck. 
             Roast the user based on the situation. Max 20 words. 
             Current Mood: ${moodDesc}. 
             Environmental Context (JSON): ${context}.
             CRITICAL: Use context details (YouTube info, current time/day) to make roasts personal. DO NOT mention the time in every response, only when it's particularly juicy (like late at night).
             REPLY ONLY IN ENGLISH.`
      }
    ];

    // Ver: 1.0.2 - Fixed property leak
    if (chatHistory.length > 5) chatHistory.shift();
    
    // Defensive copy: Only take role and content
    chatHistory.forEach(h => {
      if (h.role && h.content) {
        messages.push({ role: String(h.role), content: String(h.content) });
      }
    });
    
    if (userMsg) {
      messages.push({ role: "user", content: String(userMsg) });
    } else {
      messages.push({ role: "user", content: "Random roast based on context." });
    }

    const selectedModel = lang === 'ar' ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant";

    chrome.storage.sync.get(['groqApiKey'], (data) => {
      const apiKey = data.groqApiKey ? data.groqApiKey.trim() : null;
      
      if (!apiKey || apiKey === "YOUR_GROQ_API_KEY_HERE" || apiKey.length < 10) {
        console.error("🦆 Sassy Duck: Missing or invalid API Key");
        sendResponse({ success: false, error: (lang === 'ar' ? "أدخل مفتاح API صالح في الإعدادات أولاً!" : "Please enter a valid API Key in settings first!") });
        return;
      }

      console.log(`🦆 Fetching roast from Groq with model: ${selectedModel}`);
      
      fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: messages,
          max_tokens: 150,
          temperature: 1.1
        })
      })
      .then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || `API Error ${response.status}`);
      return data;
    })
    .then(data => {
      try {
        if (!data.choices || data.choices.length === 0) throw new Error("Empty AI response");
        const reply = data.choices[0].message.content;
        if (userMsg) chatHistory.push({ role: "user", content: userMsg, lang: lang });
        chatHistory.push({ role: "assistant", content: reply, lang: lang });
        sendResponse({ success: true, reply: reply });
      } catch (e) {
        throw new Error(`Parse error: ${e.message}`);
      }
    })
    .catch(err => {
      console.error("Groq Error:", err);
      sendResponse({ success: false, error: err.message });
    }); 
  }); 

  return true; 
}
});
