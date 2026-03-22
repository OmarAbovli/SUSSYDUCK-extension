document.addEventListener('DOMContentLoaded', () => {
  // ===== 1. DOM REFERENCES (must match popup.html IDs exactly) =====
  const $chatLogs     = document.getElementById('chatMessages');
  const $chatInput    = document.getElementById('chatInput');
  const $sendBtn      = document.getElementById('sendBtn');
  const $barAnger     = document.getElementById('barAnger');
  const $barHappiness = document.getElementById('barHappiness');
  const $barSleepiness= document.getElementById('barSleepiness');
  const $powerBtn     = document.getElementById('powerBtn');
  const $themeBtn     = document.getElementById('themeBtn');
  const $labelEn      = document.getElementById('labelEn');
  const $labelAr      = document.getElementById('labelAr');
  const $stateText    = document.getElementById('stateText');
  const $pixelDuck    = document.getElementById('pixelDuck');
  const $btnFood      = document.getElementById('btnFood');
  const $btnClean     = document.getElementById('btnClean');
  const $btnGun       = document.getElementById('btnGun');

  let lang = 'en';

  // ===== 2. PIXEL DUCK RENDERER =====
  const DUCK_ART = [
    "   rrrr   ","  rrrrrr  ","  ryyyyyyr","  yyyyyyyy",
    " bbbbbbbbb"," bWbbbbbWb","  yyyyyyyy","   ggggggg",
    "    gggggg","    rrrrrr","     y  yr"," yyyyyyyyy",
    "yyyyyyyyyy","yyyyyyyyyy"," yyyyyyyy "
  ];
  (function renderDuck() {
    let h = '';
    DUCK_ART.forEach((row, y) => {
      row.split('').forEach((c, x) => {
        const colors = {r:'#e74c3c',y:'#f1c40f',b:'#2c3e50',W:'#fff',g:'#d35400'};
        if (colors[c]) h += `<div style="position:absolute;left:${x*3}px;top:${y*3}px;width:4px;height:4px;background:${colors[c]}"></div>`;
      });
    });
    $pixelDuck.innerHTML = h;
  })();

  // ===== 3. INITIAL STATE LOAD =====
  const $mainView      = document.getElementById('mainView');
  const $settingsView  = document.getElementById('settingsView');
  const $settingsBtn   = document.getElementById('settingsBtn');
  const $backBtn       = document.getElementById('backBtn');
  const $saveApiBtn    = document.getElementById('saveApiBtn');
  const $apiKeyInput   = document.getElementById('groqApiKey');

  chrome.storage.sync.get(['enabled','stats','language','darkMode','foodMode','gunMode','wipingMode','groqApiKey'], d => {
    lang = d.language || 'en'; 
    if (d.groqApiKey) { $apiKeyInput.value = d.groqApiKey; }
    
    refreshLangUI();
    refreshBars(d.stats);
    refreshPowerUI(!!d.enabled);
    refreshToolUI(d);
    
    if (d.darkMode) { 
      document.body.classList.add('dark-mode'); 
      $themeBtn.innerText = '🌞'; 
    }
  });

  // ===== View Switching =====
  $settingsBtn.onclick = () => {
    $mainView.style.display = 'none';
    $settingsView.style.display = 'flex';
  };

  $backBtn.onclick = () => {
    $mainView.style.display = 'block';
    $settingsView.style.display = 'none';
  };

  $saveApiBtn.onclick = () => {
    const newKey = $apiKeyInput.value.trim();
    chrome.storage.sync.set({ groqApiKey: newKey }, () => {
      const originalText = $saveApiBtn.innerText;
      $saveApiBtn.innerText = lang === 'ar' ? 'تم الحفظ! ✅' : 'SAVED! ✅';
      $saveApiBtn.style.background = '#27ae60';
      
      setTimeout(() => {
        $saveApiBtn.innerText = originalText;
        $saveApiBtn.style.background = '';
        $mainView.style.display = 'block';
        $settingsView.style.display = 'none';
      }, 1000);
    });
  };

  // ===== 4. POWER BUTTON =====
  $powerBtn.onclick = () => {
    chrome.storage.sync.get(['enabled'], d => {
      const next = !d.enabled;
      chrome.storage.sync.set({ enabled: next }, () => {
        refreshPowerUI(next);
        broadcast({ type: 'TOGGLE_DUCK', enabled: next });
      });
    });
  };

  function refreshPowerUI(on) {
    const ar = (lang === 'ar');
    $powerBtn.innerText = on ? (ar ? 'شغّال' : 'ON') : (ar ? 'مطفي' : 'OFF');
    $powerBtn.className = `icon-btn ${on ? 'power-on' : 'power-off'}`;
    $stateText.innerText = on ? (ar ? 'متصلة' : 'ACTIVE') : (ar ? 'غير مفعلة' : 'OFFLINE');
    $stateText.style.color = on ? '#27ae60' : '#e74c3c';
  }

  // ===== 5. THEME TOGGLE =====
  $themeBtn.onclick = () => {
    document.body.classList.toggle('dark-mode');
    const dark = document.body.classList.contains('dark-mode');
    $themeBtn.innerText = dark ? '🌞' : '🌗';
    chrome.storage.sync.set({ darkMode: dark });
  };

  // ===== 6. LANGUAGE SWITCH =====
  $labelEn.onclick = () => switchLang('en');
  $labelAr.onclick = () => switchLang('ar');

  function switchLang(l) {
    lang = l;
    chrome.storage.sync.set({ language: l });
    refreshLangUI();
    broadcast({ type: 'UPDATE_LANG', language: l });
  }

  function refreshLangUI() {
    const ar = (lang === 'ar');
    $labelEn.classList.toggle('active', lang === 'en');
    $labelAr.classList.toggle('active', lang === 'ar');
    $chatInput.placeholder = ar ? 'اكتب خربشة...' : 'Scribble something...';
    document.querySelector('.label-anger').innerText     = ar ? 'غضب'   : 'Anger';
    document.querySelector('.label-happiness').innerText  = ar ? 'سعادة' : 'Happy';
    document.querySelector('.label-sleepiness').innerText = ar ? 'نعاس'  : 'Sleepy';
    $btnFood.innerText  = ar ? 'طعام'   : 'FOOD';
    $btnClean.innerText = ar ? 'تنظيف'  : 'CLEAN';
    $btnGun.innerText   = ar ? 'سلاح'   : 'AKM';
    
    // Settings translations
    document.querySelector('#settingsView h2').innerText = ar ? 'إعدادات الذكاء' : 'AI Settings';
    document.querySelector('.sketch-label').innerText    = ar ? 'مفتاح Groq API:' : 'Groq API Key:';
    $saveApiBtn.innerText = ar ? 'حفظ المفتاح' : 'SAVE API';
    $backBtn.innerText    = ar ? 'رجوع' : 'BACK';
    document.querySelector('.sketch-hint').innerText     = ar ? 'احصل على مفتاحك من console.groq.com' : 'Get your key at console.groq.com';

    // Refresh power text to match new language
    chrome.storage.sync.get(['enabled'], d => refreshPowerUI(!!d.enabled));
  }

  // ===== 7. STAT BARS =====
  function refreshBars(s) {
    if (!s) return;
    $barAnger.style.width     = (s.anger || 0) + '%';
    $barHappiness.style.width = (s.happiness || 0) + '%';
    $barSleepiness.style.width= (s.sleepiness || 0) + '%';
  }

  // Poll stats every 800ms
  setInterval(() => {
    chrome.storage.sync.get(['stats'], d => refreshBars(d.stats));
  }, 800);

  // ===== 8. TOOLS =====
  $btnFood.onclick  = () => toggleTool('foodMode');
  $btnClean.onclick = () => toggleTool('wipingMode');
  $btnGun.onclick   = () => toggleTool('gunMode');

  function toggleTool(mode) {
    chrome.storage.sync.get(['foodMode','gunMode','wipingMode'], d => {
      const state = { foodMode: false, gunMode: false, wipingMode: false };
      state[mode] = !d[mode]; // toggle
      chrome.storage.sync.set(state, () => {
        refreshToolUI(state);
        broadcast({ type: 'UPDATE_TOOLS', ...state });
      });
    });
  }

  function refreshToolUI(d) {
    $btnFood.classList.toggle('tool-active',  !!d.foodMode);
    $btnClean.classList.toggle('tool-active', !!d.wipingMode);
    $btnGun.classList.toggle('tool-active',   !!d.gunMode);
  }

  // ===== 9. CHAT =====
  $sendBtn.onclick = sendChat;
  $chatInput.onkeydown = e => { if (e.key === 'Enter') sendChat(); };

  function sendChat() {
    const text = $chatInput.value.trim();
    if (!text) return;
    addMsg('user', text);
    $chatInput.value = '';

    chrome.storage.sync.get(['stats'], res => {
      chrome.runtime.sendMessage({
        type: 'GET_AI_ROAST',
        userMsg: text,
        language: lang,
        stats: res.stats || null,
        context: 'Direct chat in popup'
      }, resp => {
        if (resp && resp.success) {
          addMsg('duck', resp.reply);
          chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'DUCK_SPEAK', text: resp.reply }).catch(() => {});
          });
        } else {
          const errHint = resp?.error || (lang === 'ar' ? 'مشكلة مجهولة' : 'Unknown error');
          addMsg('duck', (lang === 'ar' ? 'في عطل: ' : 'Error: ') + errHint);
        }
      });
    });
  }

  function addMsg(role, text) {
    const div = document.createElement('div');
    div.className = `msg ${role === 'user' ? 'user' : 'duck'}-msg`;
    div.innerText = text;
    $chatLogs.appendChild(div);
    $chatLogs.scrollTop = $chatLogs.scrollHeight;
  }

  // ===== 10. BROADCAST HELPER =====
  function broadcast(msg) {
    chrome.tabs.query({}, tabs => {
      tabs.forEach(t => {
        chrome.tabs.sendMessage(t.id, msg).catch(() => {});
      });
    });
  }
});
