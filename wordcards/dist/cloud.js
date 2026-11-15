'use strict';
window.SlovoCloud = (() => {
  const config = window.SLOVO_CONFIG || {};
  const enabled = Boolean(config.supabaseUrl && config.supabasePublishableKey);
  let client, user = null;
  let owners = new Map();
  function content(card) {
    return {en: card.en, ru: card.ru, hint: card.hint, examples: card.examples};
  }
  function changes(before, after) {
    const old = new Map(before.map(c => [c.id, c]));
    const next = new Map(after.map(c => [c.id, c]));
    return {
      upserts: after.filter(c => !old.has(c.id) || JSON.stringify(content(old.get(c.id))) !== JSON.stringify(content(c))).map(c => ({id: c.id, ...content(c), expected: old.has(c.id) ? content(old.get(c.id)) : null})),
      deletes: before.filter(c => !next.has(c.id)).map(c => ({id: c.id, expected: content(c)})),
      progress: after.filter(c => !old.has(c.id) || c.status !== old.get(c.id).status).map(c => ({card_id: c.id, status: c.status}))
    };
  }
  function decode(data) {
    owners = new Map(data.map(c => [c.id, c.owner_id]));
    return WordCards.validateCards(data.map(c => ({...c, status: c.status || 'learning'})));
  }
  async function init() {
    if (!enabled) return;
    if (!/^https:\/\/[^/]+\.supabase\.co\/?$/.test(config.supabaseUrl)) throw new Error('Проверьте адрес проекта Supabase в config.js.');
    if (!window.supabase) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Не удалось загрузить модуль входа. Проверьте соединение.'));
        document.head.append(script);
      });
    }
    client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    client.auth.onAuthStateChange((event, session) => {
      user = session?.user || null;
      if (['SIGNED_IN', 'SIGNED_OUT', 'PASSWORD_RECOVERY'].includes(event)) window.dispatchEvent(new CustomEvent('slovo-auth', {detail: {event, user}}));
    });
    const {data, error} = await client.auth.getSession();
    if (error) throw error;
    user = data.session?.user || null;
  }
  async function load() {
    if (!user) throw new Error('Войдите в аккаунт.');
    const userId = user.id;
    const {data, error} = await client.rpc('slovo_read');
    if (error) throw error;
    if (user?.id !== userId) throw new Error('Аккаунт изменился. Обновите страницу.');
    return decode(data);
  }
  async function save(before, after) {
    if (!user) throw new Error('Войдите в аккаунт.');
    const userId = user.id;
    const patch = changes(before, after);
    const {data, error} = await client.rpc('slovo_save', {patch});
    if (error) throw error;
    if (user?.id !== userId) throw new Error('Аккаунт изменился. Обновите страницу.');
    return decode(data);
  }
  async function authenticate(mode, email, password) {
    if (!client) throw new Error('Подключение ещё не готово. Обновите страницу.');
    const redirectTo = location.origin + location.pathname;
    let result;
    if (mode === 'signup') result = await client.auth.signUp({email, password, options: {emailRedirectTo: redirectTo}});
    else if (mode === 'reset') result = await client.auth.resetPasswordForEmail(email, {redirectTo});
    else if (mode === 'password') result = await client.auth.updateUser({password});
    else result = await client.auth.signInWithPassword({email, password});
    if (result.error) throw result.error;
    return result.data;
  }
  async function signOut() {
    const {error} = await client.auth.signOut({scope: 'local'});
    if (error) throw error;
    user = null;
  }
  return {enabled, init, load, save, authenticate, signOut, changes, get user() { return user; }, canEdit: id => !enabled || Boolean(user && owners.get(id) === user.id)};
})();
