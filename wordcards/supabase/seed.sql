-- Starter content, separate from schema migration.
insert into public.slovo_cards(id,en,ru,hint,examples) values
('starter-1','take your time','не торопиться','To do something at a comfortable pace, without rushing.','["Take your time — there''s no rush.","Take your time choosing a book you really like."]'),
('starter-2','curious','любопытный; любознательный','Wanting to learn or know more about something.','["I''m curious about how this works.","Children are naturally curious about the world."]'),
('starter-3','make sense','иметь смысл; быть понятным','To be clear, reasonable, or easy to understand.','["Your explanation makes sense now.","It doesn''t make sense to leave so early."]'),
('starter-4','eventually','в конце концов; со временем','After some time, especially after a long wait or a series of events.','["Eventually, we found the right place.","Keep practising and you will eventually get better."]'),
('starter-5','look forward to','ждать с нетерпением','To feel happy and excited about something that will happen.','["I look forward to hearing from you.","We''re looking forward to our holiday."]'),
('starter-6','a little goes a long way','даже небольшое количество даёт большой эффект','A small amount of something can have a surprisingly large effect.','["A little kindness goes a long way.","With this sauce, a little goes a long way."]'),
('starter-7','thoughtful','заботливый; внимательный','Showing that you think about what other people need or feel.','["That was a thoughtful gift.","It was thoughtful of you to call."]'),
('starter-8','figure out','разобраться; выяснить','To understand or solve something by thinking about it.','["Can you figure out the answer?","I finally figured out how to use this app."]'),
('starter-9','instead','вместо этого','In place of another person, thing, or action.','["Let''s walk instead of taking the bus.","I didn''t have tea, so I made coffee instead."]'),
('starter-10','keep in mind','иметь в виду; помнить','To remember a fact when making a decision or thinking about something.','["Keep in mind that the shop closes at six.","I''ll keep your advice in mind."]'),
('starter-11','reliable','надёжный','Someone or something you can trust to do what is expected.','["We need a reliable internet connection.","She''s a reliable friend who always keeps her promises."]'),
('starter-12','give it a try','попробовать','To attempt something to see whether you like it or can do it.','["I''ve never tried surfing, but I''d like to give it a try.","This exercise looks difficult, but give it a try."]'),
('starter-13','notice','замечать','To become aware of something by seeing, hearing, or feeling it.','["Did you notice the new painting?","I noticed that she was smiling."]'),
('starter-14','on purpose','нарочно; намеренно','Intentionally, rather than by accident.','["I didn''t break it on purpose.","She left early on purpose to avoid the traffic."]'),
('starter-15','improve','улучшать; улучшаться','To make something better, or to become better.','["Reading every day can improve your vocabulary.","My English has improved a lot this year."]'),
('starter-16','get used to','привыкнуть к','To become familiar or comfortable with something new.','["You''ll get used to the weather.","It took me a week to get used to waking up early."]'),
('starter-17','worthwhile','стоящий; заслуживающий усилий','Useful or enjoyable enough to be worth the time or effort.','["Learning a new language is a worthwhile challenge.","The long walk was worthwhile because of the view."]'),
('starter-18','one step at a time','шаг за шагом; постепенно','By dealing with one small part before moving on to the next.','["Let''s take this one step at a time.","You can build a new habit one step at a time."]')
on conflict do nothing;
