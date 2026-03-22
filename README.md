#  Sassy Duck Evolved - Browser Agent

**Sassy Duck Evolved** is not just a browser extension; it's a rogue, sentient cartoon duck that watches your every move, judges your browsing habits, and roasts you in real-time using advanced AI.

Built for the **Web Agents** challenge, this extension showcases the power of **Deep Environment Awareness**, **LLM Integration**, and **Dynamic SVG Animation**.

---

##  Features

###  1. Deep Environment Awareness
The duck isn't just wandering; it's observant. It knows:
- **What you're watching on YouTube**: Recognizes channel names and video titles to deliver tailored insults.
- **Your current task**: Scrapes page titles, `<h1>` tags, and meta-descriptions to understand your context.
- **The Time & Day**: It knows if you're pulling an all-nighter and will judge you for it.

###  2. Dynamic Mood & Accessory System
The duck has a complex state machine and distinct moods:
- **Philosopher**: Wears a graduation cap and drops "deep" (nonsense) wisdom.
- **Romantic**: Wears cute glasses, holds a dead rose, and recites failed poetry.
- **Vibing**: Dances to the rhythm whenever your browser tab is emitting audio (YouTube/Spotify).

###  3. Parkour Movement
Watch the duck jump over page elements like buttons and images using realistic parabolic physics and acrobatic flips.

###  4. Groq AI Integration (Llama 3)
Features a bilingual AI brain (Arabic/English) that can:
- Chat with you in a dedicated popup.
- Comment on your browsing in real-time using a **sarcastic Egyptian persona** (for Arabic) or a **hyper-aggressive bully** (for English).

###  5. Interaction Toolbox
- **Gun Mode**: Tired of the sarcasm? Shoot the duck (if you can hit it).
- **Food Mode**: Try to tame it with food (or tease it by pulling it away).
- **Wipe Mode**: Clean up the "messes" the duck leaves randomly on your screen.

---

##  Tech Stack
- **Languages**: JavaScript, HTML5, CSS3 (Custom Glassmorphism).
- **Architecture**: Chrome Extension Manifest V3.
- **AI Backend**: Groq API (Llama 3.1 & 3.3).
- **Graphics**: Dynamic SVG generation (no static PNGs for the duck).
- **Physics**: Custom Parabolic Arc implementation.

---

##  AI & Groq API Setup

This project uses **Groq AI** (Llama 3) for its aggressive and situational roasts. To get it working:

1.  **Get a Free API Key**:
    - Go to the [Groq Console](https://console.groq.com/).
    - Sign up and navigate to **API Keys**.
    - Create a new key (it starts with `gsk_`).

2.  **Add it to the Extension**:
    - Open the **Sassy Duck Popup** in Chrome.
    - Click the **Gear Icon (⚙️)** in the top header.
    - This will open the **AI Settings** page.
    - Paste your key in the box and click **SAVE API**.
    - You will see a "SAVED!" confirmation, and the extension will now use your key.

3.  **Enable the Brain**:
    - Chat with the duck in the popup or let it roast you as you browse. 
    - (Make sure the "Engine" status at the bottom shows **ACTIVE**).

---

##  Installation

1.  **Clone the Repo**:
    ```bash
    git clone https://github.com/your-username/SassyDuck-Evolved.git
    ```
2.  **Get an API Key**:
    - Sign up at [Groq Console](https://console.groq.com/).
    - Create a free API Key.
3.  **Configure**:
    - Load the extension in Chrome (see below).
    - Open the **Sassy Duck Popup** from your extensions bar.
    - Click on the settings/chat area (depending on the UI) to find where to paste your **Groq API Key**.
    - The key is saved securely in `chrome.storage.sync`.
4.  **Load the Extension**:
    - Go to `chrome://extensions/`.
    - Enable **Developer Mode** (top-right).
    - Click **Load Unpacked**.
    - Select the `SassyDuck` folder.

---

##  Presentation
For a deep dive into the architecture and code, open the included `SassyDuck_Presentation.html` in your browser. It's a Reveal.js-powered guide to the project's secrets.

---

##  Disclaimer
This duck is designed to be annoying, rude, and aggressive. If you're easily offended, maybe stick to a regular rubber duck. 

---

**Built with ❤️ and 🦆**
