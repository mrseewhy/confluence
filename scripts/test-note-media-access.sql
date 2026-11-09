\set ON_ERROR_STOP on
begin;
create temp table media_test as
select (select id from auth.users where email='sarah@confluence.test') as owner_id,
 (select id from auth.users where email='marcus@confluence.test') as stranger_id,
 gen_random_uuid() as folder_id, gen_random_uuid() as note_id;
insert into public.folders(id,owner_id,title,slug,visibility)
select folder_id,owner_id,'Media test','media-test','private' from media_test;
insert into public.notes(id,folder_id,owner_id,title,slug,visibility)
select note_id,folder_id,owner_id,'Media note','media-note','private' from media_test;
insert into public.note_blocks(note_id,type,content,order_index)
select note_id,'image','storage://note-media/'||owner_id||'/test.png',0 from media_test;
grant select on media_test to authenticated, anon;
set local role authenticated;
do $$ declare f media_test%rowtype; p text;
begin
 select * into f from media_test; p:=f.owner_id||'/test.png';
 perform set_config('request.jwt.claim.sub',f.owner_id::text,true);
 if not public.can_read_note_media(p) then raise exception 'Owner denied'; end if;
 perform set_config('request.jwt.claim.sub',f.stranger_id::text,true);
 if public.can_read_note_media(p) then raise exception 'Stranger permitted'; end if;
 raise notice 'Private media owner and stranger checks passed';
end $$;
reset role;
update public.notes set visibility='public' where id=(select note_id from media_test);
set local role anon;
do $$ declare p text;
begin
 select owner_id||'/test.png' into p from media_test;
 if not public.can_read_note_media(p) then raise exception 'Public note image denied'; end if;
 raise notice 'Public note media check passed';
end $$;
rollback;
