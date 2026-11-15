-- Run in the SQL editor as postgres. All fixtures are rolled back.
begin;
insert into auth.users(id,aud,role,email) values
  ('f14b019f-8472-42e5-8d73-537cb5849a31','authenticated','authenticated','slovo-fixture-a@example.invalid'),
  ('f14b019f-8472-42e5-8d73-537cb5849a32','authenticated','authenticated','slovo-fixture-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','f14b019f-8472-42e5-8d73-537cb5849a31',true);
select public.slovo_save('{"upserts":[{"id":"slovo-rls-smoke","en":"slovo rls fixture","ru":"тест","hint":"A temporary security test.","examples":["This is a test."],"expected":null}],"deletes":[],"progress":[{"card_id":"slovo-rls-smoke","status":"known"}]}'::jsonb);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','f14b019f-8472-42e5-8d73-537cb5849a32',true);
do $$
declare denied boolean := false; affected integer; personal_status text;
begin
  if exists(select 1 from public.slovo_progress where user_id <> auth.uid()) then raise exception 'FAIL: another user progress is visible'; end if;
  select entry->>'status' into personal_status from jsonb_array_elements(public.slovo_read()) entry where entry->>'id' = 'slovo-rls-smoke';
  if personal_status is distinct from 'learning' then raise exception 'FAIL: progress was shared'; end if;
  update public.slovo_cards set ru = 'forbidden' where id = 'slovo-rls-smoke';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: editing another user card succeeded'; end if;
  begin
    perform public.slovo_save('{"upserts":[],"deletes":[{"id":"slovo-rls-smoke","expected":{"en":"slovo rls fixture","ru":"тест","hint":"A temporary security test.","examples":["This is a test."]}}],"progress":[]}'::jsonb);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'FAIL: deleting another user card succeeded'; end if;
  perform public.slovo_save('{"upserts":[],"deletes":[],"progress":[{"card_id":"slovo-rls-smoke","status":"learning"}]}'::jsonb);
end;
$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','f14b019f-8472-42e5-8d73-537cb5849a31',true);
do $$
begin
  if (select status from public.slovo_progress where card_id='slovo-rls-smoke') is distinct from 'known' then raise exception 'FAIL: another user overwrote personal progress'; end if;
end;
$$;
reset role;
rollback;
select 'PASS: shared cards, private progress, ownership checks; fixtures rolled back' as result;
