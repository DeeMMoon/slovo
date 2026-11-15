begin;

create function public.slovo_valid_examples(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(value) <> 'array' then false else
    jsonb_array_length(value) between 1 and 100
    and not exists (select 1 from jsonb_array_elements(value) x where jsonb_typeof(x) <> 'string' or length(btrim(x #>> '{}')) = 0)
    and (select coalesce(sum(length(x #>> '{}')),0) + greatest(count(*) - 1,0) from jsonb_array_elements(value) x) <= 5000
  end;
$$;

create table public.slovo_cards (
  id text primary key check (length(id) between 1 and 200),
  owner_id uuid references auth.users(id) on delete set null default auth.uid(),
  en text not null check (length(btrim(en)) between 1 and 200),
  ru text not null check (length(btrim(ru)) between 1 and 300),
  hint text not null check (length(btrim(hint)) between 1 and 1000),
  examples jsonb not null check (public.slovo_valid_examples(examples)),
  created_at timestamptz not null default now()
);
create unique index slovo_cards_word on public.slovo_cards (lower(btrim(en)));
create index slovo_cards_owner on public.slovo_cards(owner_id);
create table public.slovo_progress (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  card_id text not null references public.slovo_cards(id) on delete cascade,
  status text not null check (status in ('learning', 'known')),
  primary key (user_id, card_id)
);
create index slovo_progress_card on public.slovo_progress(card_id);

alter table public.slovo_cards enable row level security;
alter table public.slovo_progress enable row level security;
create policy cards_read on public.slovo_cards for select to authenticated using (true);
create policy cards_add on public.slovo_cards for insert to authenticated with check (owner_id = (select auth.uid()));
create policy cards_edit on public.slovo_cards for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy cards_delete on public.slovo_cards for delete to authenticated using (owner_id = (select auth.uid()));
create policy progress_read on public.slovo_progress for select to authenticated using (user_id = (select auth.uid()));
create policy progress_add on public.slovo_progress for insert to authenticated with check (user_id = (select auth.uid()));
create policy progress_edit on public.slovo_progress for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.slovo_cards, public.slovo_progress from public, anon, authenticated;
grant select, insert, update, delete on public.slovo_cards to authenticated;
grant select, insert, update on public.slovo_progress to authenticated;
revoke all on function public.slovo_valid_examples(jsonb) from public, anon;
grant execute on function public.slovo_valid_examples(jsonb) to authenticated;

create function public.slovo_read() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'owner_id',c.owner_id,'en',c.en,'ru',c.ru,'hint',c.hint,'examples',c.examples,'status',coalesce(p.status,'learning')) order by c.created_at,c.id),'[]'::jsonb)
  from public.slovo_cards c left join public.slovo_progress p on p.card_id = c.id and p.user_id = (select auth.uid());
$$;

create function public.slovo_save(patch jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare item jsonb;
begin
  if auth.uid() is null then raise exception 'Войдите в аккаунт.'; end if;
  if jsonb_typeof(patch) is distinct from 'object' or jsonb_typeof(patch->'upserts') is distinct from 'array' or jsonb_typeof(patch->'deletes') is distinct from 'array' or jsonb_typeof(patch->'progress') is distinct from 'array'
    or jsonb_array_length(patch->'upserts') > 10000 or jsonb_array_length(patch->'deletes') > 10000 or jsonb_array_length(patch->'progress') > 10000
    then raise exception 'Неверный формат изменений.'; end if;
  for item in select value from jsonb_array_elements(patch->'deletes') loop
    delete from public.slovo_cards c where c.id = item->>'id' and c.owner_id = auth.uid()
      and jsonb_build_object('en',c.en,'ru',c.ru,'hint',c.hint,'examples',c.examples) = item->'expected';
    if not found then raise exception 'Карточка изменена или недоступна для удаления. Обновите словарь.'; end if;
  end loop;
  for item in select value from jsonb_array_elements(patch->'upserts') loop
    if item->'expected' = 'null'::jsonb then
      insert into public.slovo_cards(id,en,ru,hint,examples) values (item->>'id',item->>'en',item->>'ru',item->>'hint',item->'examples');
    else
      update public.slovo_cards c set en = item->>'en', ru = item->>'ru', hint = item->>'hint', examples = item->'examples'
        where c.id = item->>'id' and c.owner_id = auth.uid()
        and jsonb_build_object('en',c.en,'ru',c.ru,'hint',c.hint,'examples',c.examples) = item->'expected';
      if not found then raise exception 'Карточка изменена или недоступна для редактирования. Обновите словарь.'; end if;
    end if;
  end loop;
  for item in select value from jsonb_array_elements(patch->'progress') loop
    insert into public.slovo_progress(user_id,card_id,status) values(auth.uid(),item->>'card_id',item->>'status')
      on conflict(user_id,card_id) do update set status = excluded.status;
  end loop;
  return public.slovo_read();
end;
$$;
revoke all on function public.slovo_read(), public.slovo_save(jsonb) from public, anon;
grant execute on function public.slovo_read(), public.slovo_save(jsonb) to authenticated;
commit;
