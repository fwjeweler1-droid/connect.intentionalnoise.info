// Intentional Noise Connect: on-demand, recipient-controlled message translation.
// Original message remains the authoritative text. Never translate without a click.
const SUPPORTED = [
  ["en","English"],["es","Español"],["fr","Français"],["de","Deutsch"],
  ["pa","ਪੰਜਾਬੀ (Punjabi)"],["hi","हिन्दी (Hindi)"],["ur","اردو (Urdu)"],
  ["ar","العربية (Arabic)"],["pt","Português"],["bn","বাংলা (Bengali)"],
  ["ta","தமிழ் (Tamil)"],["te","తెలుగు (Telugu)"],["zh-CN","中文 (简体)"],
  ["ja","日本語"],["ko","한국어"],["sw","Kiswahili"],["it","Italiano"],
  ["tr","Türkçe"],["ru","Русский"],["id","Bahasa Indonesia"],["vi","Tiếng Việt"],
  ["nl","Nederlands"]
];
const allowed = new Set(SUPPORTED.map(([code])=>code));
const requested = (navigator.language||"en").toLowerCase();
const browserDefault = requested.startsWith("zh") ? "zh-CN" : requested.split("-")[0];
let language = allowed.has(browserDefault) ? browserDefault : "en";
const translated = new Map();
const userLanguageKey = "in-connect-translation-language";
try { const saved=localStorage.getItem(userLanguageKey); if (allowed.has(saved)) language=saved; } catch (_) {}

export function mountTranslationSettings(element, db) {
  if (!element) return;
  const label=document.createElement("label");
  label.htmlFor="translateLanguage";
  label.textContent="Translate incoming messages into";
  const picker=document.createElement("select");
  picker.id="translateLanguage";
  picker.setAttribute("aria-label","Translation language");
  for (const [code,name] of SUPPORTED) {
    const option=document.createElement("option"); option.value=code;
    option.textContent=name; option.selected=language===code;
    picker.append(option);
  }
  const hint=document.createElement("p");
  hint.className="muted";
  hint.textContent="Translation is optional. Choose Translate on an incoming message. Its text will be processed by Google Cloud Translation; your original is unchanged.";
  const providerStatus=document.createElement("span");
  providerStatus.className="muted"; providerStatus.setAttribute("role","status");
  picker.addEventListener("change",()=>{
    language=picker.value;
    translated.clear();
    try { localStorage.setItem(userLanguageKey,language); } catch (_) {}
    // Existing translations were for a different target language.
    document.querySelectorAll(".translated-content").forEach(el=>el.remove());
    document.querySelectorAll(".translation-action").forEach(btn=>{btn.hidden=false;btn.textContent="Translate";btn.disabled=false;});
  });
  element.append(label,picker,hint,providerStatus);
  // Availability probe is non-blocking: inbox continues working even without translation.
  db.functions.invoke("translate-message",{method:"GET"})
    .then(({data,error})=>{
      if (error || !data?.available) providerStatus.textContent="Translation service is not configured yet; original messages remain available.";
    }).catch(()=>{providerStatus.textContent="Translation service is unavailable; original messages remain available.";});
}

export function enhanceIncomingBubble(element,row,db,userId) {
  if (!row || row.sender_id===userId || !Number.isSafeInteger(Number(row.id))) return;
  const controls=document.createElement("div");
  controls.className="translation-controls";
  const action=document.createElement("button");
  action.type="button";action.className="translation-action";
  action.textContent="Translate";action.setAttribute("aria-label","Translate this message");
  const feedback=document.createElement("span");
  feedback.className="muted";feedback.setAttribute("role","status");
  let currentText=null,showing=false;
  const messageText=element.querySelector(".original-content");
  action.addEventListener("click",async()=>{
    if (showing) {
      const existing=element.querySelector(".translated-content");
      if(existing) existing.remove();
      showing=false;action.textContent="Show translation";return;
    }
    if(currentText && currentText.targetLanguage===language) {
      render(currentText);return;
    }
    const cacheKey=String(row.id)+":"+language;
    if (translated.has(cacheKey)) {
      currentText=translated.get(cacheKey);render(currentText);return;
    }
    action.disabled=true;action.textContent="Translating…";feedback.textContent="";
    try {
      const targetLanguage=language;
      const {data,error}=await db.functions.invoke("translate-message",{
        body:{messageId:Number(row.id),targetLanguage}
      });
      if (error || !data?.translatedText) throw new Error(data?.error||"Translation is currently unavailable.");
      // Ignore stale results after the user switches languages.
      if(targetLanguage!==language) {action.textContent="Translate";return;}
      currentText={...data,targetLanguage};
      translated.set(cacheKey,currentText);
      render(currentText);
    } catch (_) {
      feedback.textContent="Couldn't translate this message. The original remains available.";
      action.textContent="Try translation again";
    } finally {action.disabled=false;}
  });
  function render(result) {
    const old=element.querySelector(".translated-content");if(old)old.remove();
    const panel=document.createElement("div");panel.className="translated-content";
    const heading=document.createElement("small");heading.textContent="Machine translation · "+result.targetLanguage;
    const text=document.createElement("span");text.textContent=result.translatedText;
    panel.append(heading,text);
    messageText.after(panel);
    showing=true;action.textContent="Show original";
    // The original is always retained in the DOM and is re-shown via the control.
    messageText.hidden=true;
    action.onclick=()=>{
      messageText.hidden=false;panel.remove();showing=false;
      action.textContent="Show translation";action.onclick=null;
    };
  }
  controls.append(action,feedback);element.append(controls);
}
