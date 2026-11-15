(function (root) {
  'use strict';
  const seedWords = [
    ['take your time', 'не торопиться', 'To do something at a comfortable pace, without rushing.', "Take your time — there's no rush.", 'Take your time choosing a book you really like.'],
    ['curious', 'любопытный; любознательный', 'Wanting to learn or know more about something.', "I'm curious about how this works.", 'Children are naturally curious about the world.'],
    ['make sense', 'иметь смысл; быть понятным', 'To be clear, reasonable, or easy to understand.', 'Your explanation makes sense now.', "It doesn't make sense to leave so early."],
    ['eventually', 'в конце концов; со временем', 'After some time, especially after a long wait or a series of events.', 'Eventually, we found the right place.', 'Keep practising and you will eventually get better.'],
    ['look forward to', 'ждать с нетерпением', 'To feel happy and excited about something that will happen.', "I look forward to hearing from you.", "We're looking forward to our holiday."],
    ['a little goes a long way', 'даже небольшое количество даёт большой эффект', 'A small amount of something can have a surprisingly large effect.', 'A little kindness goes a long way.', 'With this sauce, a little goes a long way.'],
    ['thoughtful', 'заботливый; внимательный', 'Showing that you think about what other people need or feel.', 'That was a thoughtful gift.', "It was thoughtful of you to call."],
    ['figure out', 'разобраться; выяснить', 'To understand or solve something by thinking about it.', 'Can you figure out the answer?', "I finally figured out how to use this app."],
    ['instead', 'вместо этого', 'In place of another person, thing, or action.', "Let's walk instead of taking the bus.", "I didn't have tea, so I made coffee instead."],
    ['keep in mind', 'иметь в виду; помнить', 'To remember a fact when making a decision or thinking about something.', 'Keep in mind that the shop closes at six.', "I'll keep your advice in mind."],
    ['reliable', 'надёжный', 'Someone or something you can trust to do what is expected.', 'We need a reliable internet connection.', "She's a reliable friend who always keeps her promises."],
    ['give it a try', 'попробовать', 'To attempt something to see whether you like it or can do it.', "I've never tried surfing, but I'd like to give it a try.", 'This exercise looks difficult, but give it a try.'],
    ['notice', 'замечать', 'To become aware of something by seeing, hearing, or feeling it.', 'Did you notice the new painting?', 'I noticed that she was smiling.'],
    ['on purpose', 'нарочно; намеренно', 'Intentionally, rather than by accident.', "I didn't break it on purpose.", 'She left early on purpose to avoid the traffic.'],
    ['improve', 'улучшать; улучшаться', 'To make something better, or to become better.', 'Reading every day can improve your vocabulary.', 'My English has improved a lot this year.'],
    ['get used to', 'привыкнуть к', 'To become familiar or comfortable with something new.', "You'll get used to the weather.", 'It took me a week to get used to waking up early.'],
    ['worthwhile', 'стоящий; заслуживающий усилий', 'Useful or enjoyable enough to be worth the time or effort.', 'Learning a new language is a worthwhile challenge.', 'The long walk was worthwhile because of the view.'],
    ['one step at a time', 'шаг за шагом; постепенно', 'By dealing with one small part before moving on to the next.', "Let's take this one step at a time.", 'You can build a new habit one step at a time.']
  ];
  function seeds() {
    return seedWords.map(([en, ru, hint, ...examples], i) => ({id: `starter-${i + 1}`, en, ru, hint, examples, status: 'learning'}));
  }
  function validateCards(input) {
    if (!Array.isArray(input) || input.length > 10000) throw new Error('Ожидается список не более 10 000 карточек.');
    const ids = new Set();
    return input.map((card, i) => {
      const fail = () => { throw new Error(`Проверьте поля карточки №${i + 1}.`); };
      if (!card || typeof card !== 'object') fail();
      const result = {};
      for (const [key, max] of [['id', 200], ['en', 200], ['ru', 300], ['hint', 1000]]) {
        if (typeof card[key] !== 'string' || !card[key].trim() || card[key].length > max) fail();
        result[key] = card[key].trim();
      }
      if (ids.has(result.id)) throw new Error(`Повторяющийся идентификатор у карточки №${i + 1}.`);
      ids.add(result.id);
      if (!['learning', 'known'].includes(card.status)) fail();
      if (!Array.isArray(card.examples) || !card.examples.length || card.examples.length > 100 || card.examples.some(x => typeof x !== 'string' || !x.trim() || x.length > 5000) || card.examples.join('\n').length > 5000) fail();
      result.examples = card.examples.map(x => x.trim());
      result.status = card.status;
      return result;
    });
  }
  function parseBackup(text) {
    const data = JSON.parse(text);
    if (!data || data.version !== 1) throw new Error('Неподдерживаемый формат. Выберите резервную копию приложения «Слово».');
    return validateCards(data.cards);
  }
  function makeQueue(cards, filter, random, rng = Math.random) {
    const ids = cards.filter(c => filter === 'all' || c.status === filter).map(c => c.id);
    if (random) for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids;
  }
  const api = {seeds, validateCards, parseBackup, makeQueue};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WordCards = api;
})(globalThis);
