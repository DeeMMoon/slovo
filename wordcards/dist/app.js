'use strict';
const $ = id => document.getElementById(id);
const {seeds, validateCards, parseBackup, makeQueue} = WordCards;
const STORAGE_KEY = 'slovo.cards.v1';
const cloud = SlovoCloud;
let cards, storageBlocked = false;
try {
  const stored = cloud.enabled ? null : localStorage.getItem(STORAGE_KEY);
  cards = cloud.enabled ? [] : stored === null ? seeds() : parseBackup(stored);
} catch (error) {
  cards = [];
  storageBlocked = true;
  setTimeout(() => toast('Не удалось прочитать сохранение. Оно не перезаписано. Восстановите карточки через импорт резервной копии.', true, 15000), 0);
}
let view = 'study', filter = 'all', queue = [], position = 0, finished = false, flipped = false, editingId = null, confirmAction = null, toastTimer;
let saving = false, refreshing = false, authMode = 'signin', cloudReady = false;
function toast(message, error = false, duration = 4000) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').classList.toggle('error', error);
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, duration);
}
async function persist(nextCards, recovery = false) {
  if (saving) { toast('Дождитесь завершения сохранения'); return false; }
  saving = true;
  document.body.classList.add('saving');
  try {
    if (!cloud.enabled && storageBlocked && !recovery) throw new Error('Сохранение недоступно. Сначала восстановите данные через импорт.');
    const clean = validateCards(nextCards);
    if (cloud.enabled) cards = await cloud.save(cards, clean);
    else { localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 1, cards: clean})); cards = clean; }
    storageBlocked = false;
    return true;
  } catch (error) {
    toast(`${cloud.enabled ? 'Не удалось подтвердить сохранение. Обновите словарь перед повторной попыткой.' : 'Изменения не сохранены.'} ${error.name === 'QuotaExceededError' ? 'В хранилище браузера закончилось место. Сделайте экспорт.' : error.message}`, true, 9000);
    return false;
  } finally { saving = false; document.body.classList.remove('saving'); }
}
function resetSession() {
  queue = makeQueue(cards, filter, $('shuffle').checked);
  position = 0;
  finished = false;
  renderCard();
}
function currentCard() { return cards.find(c => c.id === queue[position]); }
function updateStats() {
  const known = cards.filter(c => c.status === 'known').length;
  const learning = cards.length - known;
  const percent = cards.length ? Math.round(known / cards.length * 100) : 0;
  for (const [id, n] of [['stat-all', cards.length], ['stat-learning', learning], ['stat-known', known], ['nav-count', cards.length], ['count-all', cards.length], ['count-learning', learning], ['count-known', known]]) $(id).textContent = n;
  $('stat-percent').textContent = `${percent}%`;
  $('overall-progress').style.width = `${percent}%`;
}
function setFlipped(value) {
  flipped = value;
  $('flashcard').classList.toggle('flipped', flipped);
  document.querySelector('.card-front').inert = flipped;
  document.querySelector('.card-back').inert = !flipped;
  $('flashcard').setAttribute('aria-label', flipped ? 'Показан ответ. Нажмите, чтобы вернуться к слову' : 'Перевернуть карточку и посмотреть ответ');
}
function renderCard() {
  setFlipped(false);
  const card = currentCard();
  const empty = !card || finished;
  for (const id of ['card-scene', 'study-actions', 'session-navigation']) $(id).hidden = empty;
  $('study-empty').hidden = !empty;
  $('session-label').textContent = finished ? 'Практика завершена' : queue.length ? `КАРТОЧКА ${position + 1} ИЗ ${queue.length}` : 'ВАША ПРАКТИКА';
  if (empty) {
    $('empty-title').textContent = finished ? 'Ещё один шаг вперёд.' : filter === 'known' ? 'Здесь будут знакомые слова' : filter === 'learning' && cards.length ? 'Все слова уже знакомы!' : 'Начнём с первого слова?';
    $('empty-description').textContent = finished ? `Вы прошли все карточки в этой подборке — ${queue.length}. Повторение помогает словам остаться с вами.` : filter === 'known' ? 'Отмечайте карточки кнопкой «Запомнил», чтобы повторять их отдельно.' : filter === 'learning' && cards.length ? 'Повторите запомненные карточки или добавьте новые.' : 'Добавьте свою карточку и начните практику.';
    $('empty-action').textContent = finished ? 'Повторить подборку ↻' : filter === 'known' || (filter === 'learning' && cards.length) ? 'Показать все слова' : '＋ Добавить карточку';
    return;
  }
  const english = $('direction').value === 'en';
  $('front-language').textContent = english ? 'АНГЛИЙСКИЙ' : 'РУССКИЙ';
  $('back-language').textContent = english ? 'ПЕРЕВОД НА РУССКИЙ' : 'АНГЛИЙСКИЙ';
  $('word-type').textContent = card.en.trim().includes(' ') ? 'phrase' : 'word';
  $('front-word').textContent = english ? card.en : card.ru;
  $('front-word').classList.toggle('long-word', $('front-word').textContent.length > 30);
  $('hint-text').textContent = card.hint;
  $('hint-text').hidden = true;
  $('hint-button').setAttribute('aria-expanded', 'false');
  $('hint-button').querySelector('span').textContent = 'Нужна подсказка?';
  $('back-word').textContent = english ? card.ru : card.en;
  $('back-secondary').textContent = english ? card.en : card.ru;
  $('examples').replaceChildren(...card.examples.map(example => { const li = document.createElement('li'); li.textContent = example; return li; }));
  $('card-status').textContent = card.status === 'known' ? '✓ Запомнил' : '◒ Ещё учу';
  $('card-status').classList.toggle('known', card.status === 'known');
  $('mark-known').classList.toggle('selected', card.status === 'known');
  $('mark-learning').classList.toggle('selected', card.status === 'learning');
  $('mark-known').setAttribute('aria-pressed', String(card.status === 'known'));
  $('mark-learning').setAttribute('aria-pressed', String(card.status === 'learning'));
  $('previous').disabled = position === 0;
  $('session-progress').style.width = `${(position + 1) / queue.length * 100}%`;
  $('session-position').textContent = `${position + 1} / ${queue.length}`;
}
async function changeStatus(id, status) {
  const old = cards.find(c => c.id === id);
  if (!old || old.status === status) return;
  if (!await persist(cards.map(c => c.id === id ? {...c, status} : c))) return;
  updateStats();
  if (view === 'library') { resetSession(); renderLibrary(); }
  else {
    const wasFlipped = flipped;
    renderCard();
    setFlipped(wasFlipped);
  }
  toast(status === 'known' ? 'Слово отмечено как запомненное' : 'Слово вернулось в изучение');
}
function navigate(step) {
  if (!queue.length || finished) return;
  if (step > 0 && position === queue.length - 1) finished = true;
  else position = Math.max(0, Math.min(queue.length - 1, position + step));
  renderCard();
}
function setFilter(value) {
  filter = value;
  document.querySelectorAll('[data-filter]').forEach(b => { b.classList.toggle('active', b.dataset.filter === filter); b.setAttribute('aria-pressed', String(b.dataset.filter === filter)); });
  resetSession();
  renderLibrary();
}
function setView(value) {
  view = value;
  const study = view === 'study';
  $('study-view').hidden = !study;
  $('library-view').hidden = study;
  document.querySelector('.study-options').hidden = !study;
  $('breadcrumb').querySelector('strong').textContent = study ? 'Практика' : 'Мои карточки';
  $('page-title').textContent = study ? 'Слово за словом.' : 'Ваш маленький словарь.';
  $('page-subtitle').textContent = study ? 'Вспоминайте, открывайте новое и учитесь в своём темпе.' : 'Слова и фразы, которые постепенно становятся вашими.';
  $('section-title').textContent = study ? 'Время для практики' : 'Все ваши карточки';
  $('section-note').textContent = study ? 'Несколько минут для себя' : 'Каждое слово — новая возможность';
  document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('active', b.dataset.view === value); if (b.dataset.view === value) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (!study) renderLibrary();
}
function renderLibrary() {
  const query = $('search').value.trim().toLocaleLowerCase();
  const results = cards.filter(c => (filter === 'all' || c.status === filter) && `${c.en} ${c.ru}`.toLocaleLowerCase().includes(query));
  $('search-count').textContent = `Карточек: ${results.length}`;
  $('library-empty').hidden = results.length > 0;
  $('library-list').replaceChildren(...results.map(card => {
    const row = document.createElement('div'); row.className = 'library-row';
    const word = document.createElement('span'); word.className = 'library-word'; word.textContent = card.en;
    const translation = document.createElement('span'); translation.className = 'library-translation'; translation.textContent = card.ru;
    const status = document.createElement('button'); status.className = `status-pill ${card.status === 'known' ? 'known' : ''}`; status.textContent = card.status === 'known' ? '✓ Запомнил' : '◒ Учу'; status.setAttribute('aria-label', `Сменить статус: ${card.en}`); status.onclick = () => changeStatus(card.id, card.status === 'known' ? 'learning' : 'known');
    const actions = document.createElement('div'); actions.className = 'row-buttons';
    for (const [text, label, action] of [['✎', 'Редактировать', () => openEditor(card.id)], ['×', 'Удалить', () => confirmDelete(card)]]) {
      if (!cloud.canEdit(card.id)) continue;
      const button = document.createElement('button'); button.className = 'icon-button'; button.textContent = text; button.setAttribute('aria-label', `${label}: ${card.en}`); button.title = label; button.onclick = action; actions.append(button);
    }
    row.append(word, translation, status, actions); return row;
  }));
}
function openEditor(id = null) {
  if (cloud.enabled && (!cloud.user || !cloudReady)) { toast('Войдите и дождитесь загрузки словаря'); return; }
  if (id && !cloud.canEdit(id)) return;
  editingId = id;
  const card = cards.find(c => c.id === id);
  $('card-form').reset(); $('form-error').textContent = '';
  $('editor-title').textContent = card ? 'Редактировать карточку' : 'Новое слово — новый шаг';
  for (const key of ['en', 'ru', 'hint']) $(`field-${key}`).value = card?.[key] || '';
  $('field-examples').value = card?.examples.join('\n') || '';
  $('editor').showModal(); $('field-en').focus();
}
function askConfirmation(title, description, action, label = 'Подтвердить') {
  $('confirm-title').textContent = title; $('confirm-description').textContent = description; $('confirm-ok').textContent = label; confirmAction = action; $('confirm-dialog').showModal(); $('confirm-cancel').focus();
}
function confirmDelete(card) {
  askConfirmation('Удалить карточку?', `«${card.en}» будет удалено${cloud.enabled ? ' из общего словаря у всех пользователей' : ''} вместе с отметками о прогрессе. Вернуть карточку можно будет только из резервной копии.`, async () => {
    if (await persist(cards.filter(c => c.id !== card.id))) { updateStats(); resetSession(); renderLibrary(); toast('Карточка удалена'); }
  }, 'Удалить');
}
$('card-form').addEventListener('submit', async event => {
  event.preventDefault();
  const old = cards.find(c => c.id === editingId);
  const card = {id: old?.id || crypto.randomUUID(), en: $('field-en').value.trim(), ru: $('field-ru').value.trim(), hint: $('field-hint').value.trim(), examples: $('field-examples').value.split(/\r?\n/).map(x => x.trim()).filter(Boolean), status: old?.status || 'learning'};
  if (!card.en || !card.ru || !card.hint || !card.examples.length) { $('form-error').textContent = 'Заполните все поля и добавьте хотя бы один пример.'; return; }
  const duplicate = cards.find(c => c.id !== card.id && c.en.toLocaleLowerCase() === card.en.toLocaleLowerCase());
  if (duplicate) { $('form-error').textContent = 'Такая карточка уже есть. Её можно изменить в разделе «Мои карточки».'; return; }
  if (await persist(old ? cards.map(c => c.id === old.id ? card : c) : [...cards, card])) {
    $('editor').close(); updateStats(); resetSession(); renderLibrary(); toast(old ? 'Карточка обновлена' : 'Новое слово уже в вашем словаре');
  }
});
$('hint-button').onclick = event => {
  event.stopPropagation();
  const shown = $('hint-text').hidden;
  $('hint-text').hidden = !shown;
  $('hint-button').setAttribute('aria-expanded', String(shown));
  $('hint-button').querySelector('span').textContent = shown ? 'Скрыть подсказку' : 'Нужна подсказка?';
};
$('hint-button').onkeydown = event => event.stopPropagation();
$('flashcard').onclick = () => setFlipped(!flipped);
$('flashcard').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); setFlipped(!flipped); } };
$('add-card').onclick = () => openEditor();
$('close-editor').onclick = $('cancel-editor').onclick = () => $('editor').close();
$('previous').onclick = () => navigate(-1);
$('next').onclick = () => navigate(1);
$('mark-learning').onclick = () => { const card = currentCard(); if (card) changeStatus(card.id, 'learning'); };
$('mark-known').onclick = () => { const card = currentCard(); if (card) changeStatus(card.id, 'known'); };
$('empty-action').onclick = () => { if (finished) resetSession(); else if (cards.length || filter === 'known') setFilter('all'); else openEditor(); };
$('direction').onchange = () => renderCard();
$('shuffle').onchange = resetSession;
$('search').oninput = renderLibrary;
document.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => setFilter(button.dataset.filter));
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => setView(button.dataset.view));
document.querySelector('.brand').onclick = event => { event.preventDefault(); setView('study'); };
$('confirm-cancel').onclick = () => { confirmAction = null; $('confirm-dialog').close(); };
$('confirm-ok').onclick = () => { const action = confirmAction; confirmAction = null; $('confirm-dialog').close(); action?.(); };
$('confirm-dialog').addEventListener('close', () => { confirmAction = null; });
$('export').onclick = () => {
  const blob = new Blob([JSON.stringify({version: 1, exportedAt: new Date().toISOString(), cards}, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  const now = new Date();
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  link.href = url; link.download = `slovo-backup-${date}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Резервная копия подготовлена для скачивания');
};
$('import').onclick = () => $('import-file').click();
$('import-file').onchange = async event => {
  const file = event.target.files[0]; event.target.value = '';
  if (!file) return;
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error('Файл слишком большой. Максимум — 20 МБ.');
    const imported = parseBackup(await file.text());
    askConfirmation(cloud.enabled ? 'Добавить карточки из копии?' : 'Восстановить резервную копию?', cloud.enabled ? `Карточек в файле: ${imported.length}. Новые слова станут доступны всем. У существующих слов обновится только ваш прогресс; их текст и чужие карточки сохранятся.` : `В файле карточек: ${imported.length}. Импорт полностью заменит текущие карточки (${cards.length}) и их прогресс. Сначала сделайте экспорт, если хотите их сохранить.`, async () => {
      let nextCards = imported;
      if (cloud.enabled) {
        const byWord = new Map(cards.map(c => [c.en.trim().toLocaleLowerCase(), {...c}]));
        for (const card of imported) {
          const key = card.en.trim().toLocaleLowerCase();
          const existing = byWord.get(key);
          if (existing) existing.status = card.status;
          else byWord.set(key, {...card, id: crypto.randomUUID()});
        }
        nextCards = [...byWord.values()];
      }
      if (await persist(nextCards, true)) { updateStats(); resetSession(); renderLibrary(); toast(`Импорт завершён. Карточек в копии: ${imported.length}`); }
    }, cloud.enabled ? 'Добавить в словарь' : 'Заменить и восстановить');
  } catch (error) { toast(`Не удалось импортировать файл. ${error.message}`, true, 9000); }
};
document.addEventListener('keydown', event => {
  if (view !== 'study' || $('editor').open || $('confirm-dialog').open || /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Space' && currentCard() && !finished) { event.preventDefault(); setFlipped(!flipped); }
  if (event.key === 'ArrowRight') { event.preventDefault(); navigate(1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); navigate(-1); }
});
window.addEventListener('storage', event => {
  if (cloud.enabled) return;
  if (event.key !== STORAGE_KEY) return;
  if (event.newValue === null) { storageBlocked = true; toast('Сохранение удалено в другой вкладке. Экспортируйте карточки и восстановите их через импорт.', true, 12000); return; }
  try { cards = parseBackup(event.newValue); storageBlocked = false; updateStats(); resetSession(); renderLibrary(); toast('Карточки обновлены из другой вкладки'); }
  catch { storageBlocked = true; toast('Сохранение в другой вкладке повреждено. Изменения заблокированы до импорта резервной копии.', true, 12000); }
});
updateStats();
setFilter('all');
setView('study');
if (!cloud.enabled && !storageBlocked && localStorage.getItem(STORAGE_KEY) === null) persist(cards);

function setAuthMode(mode) {
  authMode = mode;
  $('auth-message').textContent = '';
  $('auth-password').value = '';
  $('email-label').hidden = mode === 'password';
  $('auth-email').required = mode !== 'password';
  $('password-label').hidden = mode === 'reset';
  $('auth-password').required = mode !== 'reset';
  $('auth-password').autocomplete = ['signup', 'password'].includes(mode) ? 'new-password' : 'current-password';
  $('auth-title').textContent = {signin: 'С возвращением.', signup: 'Начните с одного слова.', reset: 'Восстановить доступ', password: 'Ваш новый пароль'}[mode];
  $('auth-submit').textContent = {signin: 'Войти', signup: 'Создать аккаунт', reset: 'Отправить ссылку', password: 'Сохранить пароль'}[mode];
  $('auth-switch').textContent = mode === 'signin' ? 'Создать аккаунт' : 'Уже есть аккаунт? Войти';
  $('auth-reset').hidden = mode !== 'signin';
}
function showAccount() {
  const signedIn = Boolean(cloud.user);
  $('auth-panel').hidden = signedIn && authMode !== 'password';
  $('account-bar').hidden = !signedIn;
  $('app-content').hidden = !signedIn || !cloudReady || authMode === 'password';
  $('add-card').disabled = !signedIn || !cloudReady;
  $('account-label').textContent = signedIn ? cloud.user.email : '';
  $('refresh-cloud').textContent = cloudReady ? '↻ Обновить словарь' : '↻ Загрузить словарь';
}
async function refreshCloud() {
  if (!cloud.user || saving || refreshing || $('editor').open || $('confirm-dialog').open) return;
  refreshing = true;
  $('refresh-cloud').disabled = true;
  try {
    const loaded = await cloud.load();
    const changed = JSON.stringify(cards) !== JSON.stringify(loaded);
    cards = loaded;
    cloudReady = true;
    if (changed || !queue.length) { updateStats(); resetSession(); renderLibrary(); }
    showAccount();
  } catch (error) { toast(`Не удалось загрузить словарь. ${error.message}`, true, 9000); }
  finally { refreshing = false; $('refresh-cloud').disabled = false; }
}
if (cloud.enabled) {
  $('storage-label').textContent = 'Общий словарь';
  $('storage-note').textContent = 'Карточки и прогресс сохраняются в вашем аккаунте.';
  document.querySelector('[data-view="library"]').childNodes.forEach(node => { if (node.nodeType === 3 && node.textContent.includes('Мои карточки')) node.textContent = ' Общий словарь '; });
  showAccount();
  window.addEventListener('slovo-auth', event => {
    if (event.detail.event === 'PASSWORD_RECOVERY') setAuthMode('password');
    if (event.detail.event === 'SIGNED_OUT') { cards = []; cloudReady = false; updateStats(); resetSession(); renderLibrary(); }
    showAccount();
    if (cloud.user) setTimeout(refreshCloud, 0);
  });
  cloud.init().then(async () => { showAccount(); if (cloud.user) await refreshCloud(); }).catch(error => { $('auth-message').textContent = error.message; });
  $('auth-switch').onclick = () => setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
  $('auth-reset').onclick = () => setAuthMode('reset');
  $('auth-form').onsubmit = async event => {
    event.preventDefault(); $('auth-submit').disabled = true; $('auth-message').textContent = '';
    try {
      const mode = authMode;
      const data = await cloud.authenticate(mode, $('auth-email').value.trim(), $('auth-password').value);
      $('auth-password').value = '';
      if (mode === 'signup' && !data?.session) $('auth-message').textContent = 'Проверьте почту: для подтверждения регистрации может потребоваться перейти по ссылке в письме.';
      if (mode === 'reset') $('auth-message').textContent = 'Если аккаунт существует, на почту придёт ссылка для восстановления доступа.';
      if (mode === 'password') { setAuthMode('signin'); showAccount(); toast('Пароль обновлён'); }
    } catch (error) { $('auth-message').textContent = error.message; }
    finally { $('auth-submit').disabled = false; }
  };
  $('sign-out').onclick = async () => {
    if (saving) return;
    try { await cloud.signOut(); $('editor').close(); $('confirm-dialog').close(); setAuthMode('signin'); showAccount(); }
    catch (error) { toast(error.message, true); }
  };
  $('refresh-cloud').onclick = refreshCloud;
  window.addEventListener('focus', refreshCloud);
  // shortcut: the shared deck refreshes on focus and once per minute; add Realtime if live co-editing becomes necessary.
  setInterval(() => { if (!document.hidden) refreshCloud(); }, 60000);
}
