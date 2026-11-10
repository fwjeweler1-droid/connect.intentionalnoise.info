/* Connect: optional on-device translation enhancement. No remote translation endpoint. */
(() => {
  'use strict';
  const inbox = document.getElementById('inbox');
  const messages = document.getElementById('messages');
  if (!inbox || !messages) return;
  const supported = typeof globalThis.Translator !== 'undefined';
  const detectSupported = typeof globalThis.LanguageDetector !== 'undefined';
  const languages = {
    ar: 'Arabic', de: 'German', en: 'English', es: 'Spanish', fr: 'French',
    hi: 'Hindi', it: 'Italian', ja: 'Japanese', ko: 'Korean',
    pt: 'Portuguese', ru: 'Russian', uk: 'Ukrainian', zh: 'Chinese'
  };
  const wrap = document.createElement('section');
  wrap.className = 'ondevice-translation';
  wrap.setAttribute('aria-label', 'Optional message translation');
  const heading = document.createElement('strong');
  heading.textContent = 'Translate messages on this device';
  const languageRow = document.createElement('div');
  languageRow.className = 'ondevice-language-row';
  const sourceLabel = document.createElement('label');
  sourceLabel.textContent = 'From ';
  const source = document.createElement('select');
  source.setAttribute('aria-label', 'Original message language');
  if (detectSupported) source.add(new Option('Detect language', 'auto'));
  for (const [code, name] of Object.entries(languages)) source.add(new Option(name, code));
  if (!detectSupported) source.value = 'es';
  sourceLabel.append(source);
  const targetLabel = document.createElement('label');
  targetLabel.textContent = ' To ';
  const target = document.createElement('select');
  target.setAttribute('aria-label', 'Language to translate into');
  for (const [code, name] of Object.entries(languages)) target.add(new Option(name, code));
  const browserLang = (navigator.language || 'en').split('-')[0];
  target.value = Object.hasOwn(languages, browserLang) ? browserLang : 'en';
  targetLabel.append(target);
  languageRow.append(sourceLabel, targetLabel);
  const autoLabel = document.createElement('label');
  autoLabel.className = 'ondevice-auto';
  const auto = document.createElement('input');
  auto.type = 'checkbox';
  auto.disabled = !supported;
  autoLabel.append(auto, ' Automatically translate incoming messages');
  const note = document.createElement('p');
  note.className = 'ondevice-note';
  note.setAttribute('role', 'status');
  note.textContent = supported
    ? 'Optional browser translation. Message text stays on this device; a language model may need to download first. Original messages remain visible.'
    : 'On-device chat translation is not supported by this browser. You can use a browser with built-in private page translation, if available. Messages are not sent to a translation service.';
  wrap.append(heading, languageRow, autoLabel, note);
  messages.parentElement.insertBefore(wrap, messages);
  const css = document.createElement('style');
  css.textContent = '.ondevice-translation{border:1px solid #42616e;border-radius:10px;padding:12px;margin:12px 0;background:#10232f}.ondevice-language-row{display:flex;gap:12px;flex-wrap:wrap;margin:10px 0}.ondevice-language-row label{color:#f4f7f8}.ondevice-language-row select{background:#0d202b;color:#fff;border:1px solid #78939e;border-radius:6px;padding:7px;max-width:185px}.ondevice-auto{display:block;line-height:1.5}.ondevice-auto input{margin-right:6px}.ondevice-note{font-size:.85rem;margin:8px 0 0}.ondevice-translation-button{font-size:.8rem;padding:5px 10px;margin:9px 0 0;display:block}.ondevice-translation-result{display:block;border-top:1px solid #5b7784;margin-top:10px;padding-top:10px;white-space:pre-wrap}.ondevice-translation-result[hidden]{display:none}';
  document.head.append(css);
  const cache = new Map();
  let detectorPromise;
  const getTranslator = (from, to) => {
    const key = from + ':' + to;
    if (!cache.has(key)) cache.set(key, (async () => {
      const readiness = await Translator.availability({sourceLanguage: from, targetLanguage: to});
      if (readiness === 'unavailable') throw new Error('This language pair is unavailable on this device.');
      return Translator.create({sourceLanguage: from, targetLanguage: to});
    })().catch(error => {cache.delete(key); throw error;}));
    return cache.get(key);
  };
  async function translateBubble(bubble) {
    if (!supported || bubble.dataset.translating === 'yes') return;
    const original = bubble.querySelector('span')?.textContent?.trim();
    const button = bubble.querySelector('.ondevice-translation-button');
    const output = bubble.querySelector('.ondevice-translation-result');
    if (!original || !button || !output) return;
    bubble.dataset.translating = 'yes';
    button.disabled = true;
    button.textContent = 'Translating…';
    output.hidden = false;
    output.textContent = '';
    try {
      let from = source.value;
      if (from === 'auto') {
        if (!detectSupported) throw new Error('Select the original language first.');
        if (!detectorPromise) detectorPromise = LanguageDetector.create().catch(error => {detectorPromise = null; throw error;});
        const guesses = await (await detectorPromise).detect(original);
        from = (guesses?.[0]?.detectedLanguage || 'und').split('-')[0];
      }
      if (!Object.hasOwn(languages, from)) throw new Error('Could not identify the language. Choose it manually.');
      const to = target.value;
      if (from === to) {
        output.textContent = 'This message is already in the selected language.';
      } else {
        const translator = await getTranslator(from, to);
        output.textContent = await translator.translate(original);
        output.lang = to;
      }
      button.textContent = 'Translate again';
    } catch (error) {
      output.textContent = 'Translation unavailable: ' + (error?.message || 'Please retry.');
      button.textContent = 'Retry translation';
    } finally {
      button.disabled = false;
      bubble.dataset.translating = 'no';
    }
  }
  function decorate() {
    for (const bubble of messages.querySelectorAll('.bubble:not(.mine)')) {
      if (bubble.dataset.ondevicePrepared) continue;
      bubble.dataset.ondevicePrepared = 'yes';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ondevice-translation-button';
      button.textContent = supported ? 'Translate' : 'Translation unavailable';
      button.disabled = !supported;
      const result = document.createElement('span');
      result.className = 'ondevice-translation-result';
      result.hidden = true;
      button.addEventListener('click', () => translateBubble(bubble));
      bubble.append(button, result);
      if (auto.checked && supported) translateBubble(bubble);
    }
  }
  const observer = new MutationObserver(decorate);
  observer.observe(messages, {childList:true});
  auto.addEventListener('change', () => {if (auto.checked) messages.querySelectorAll('.bubble:not(.mine)').forEach(translateBubble);});
  decorate();
})();
