// ... existing listeners ... (KEEP EVERYTHING ELSE) ...
// Ensure we handle language updates from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'UPDATE_LANG') {
    // Force a re-fetch of storage or update local state if needed
    // The speak() function already fetches language from storage.
    console.log("Language updated to:", msg.language);
  }
});

// DEFINITIVE FIX FOR THE speak() FUNCTION
function speak(msg) {
  if (!isRunning) return;
  
  chrome.storage.sync.get(['aiMode', 'language'], (data) => {
    const lang = data.language || 'en';
    
    // 1. If no specific message passed, choose a random one based on context
    if (!msg) {
      if (data.aiMode) {
        chrome.runtime.sendMessage({ 
          type: 'GET_AI_ROAST', 
          context: getPageContext(),
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

    // 2. Inject the message into the HTML bubble
    const placeholder = lang === 'ar' ? "رد عليّ يا كئيب..." : "Reply...";
    bubble.innerHTML = `<div class="bubble-text">${msg}</div><div class="bubble-chat" style="display:none; margin-top:5px;"><input type="text" placeholder="${placeholder}" class="sassy-reply-input"></div>`;
    bubble.classList.add('show'); 
    
    // 3. AI Chat functionality inside the bubble
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
             context: getPageContext(),
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
    bubbleTimeout = setTimeout(() => bubble.classList.remove('show'), 8000);
  });
}
let bubbleTimeout = null;
