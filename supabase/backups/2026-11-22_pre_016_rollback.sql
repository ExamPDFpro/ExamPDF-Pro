-- ROLLBACK for 016_wb_exam_categories.sql (state captured 2026-11-22 02:46 UTC, before the migration).
-- Restores the original 9 categories (same ids), re-links PDFs, removes categories added by 016 and the i18n row it created.
-- Run only if you need to undo 016. Original backup data: 2026-11-22_pre_016_backup.json

-- 1) re-create deleted categories (NEET, CTET) with their original ids
insert into public.exam_categories (id, name, sort_order, is_hidden, created_at) values
 ('84ea8c13-1c1f-4cfb-a4c7-c0d1a17163cf','NEET',5,false,'2026-11-10T08:24:54.8747+00:00'),
 ('22ade8c1-0aae-4b86-9529-ff1c0a39f71a','CTET',6,false,'2026-11-10T08:24:54.8747+00:00')
on conflict (id) do nothing;

-- 2) restore names and order of the original categories
update public.exam_categories c set name = o.name, sort_order = o.ord
from (values
 ('6f811d6c-6eb3-4158-8fbc-bdbb7e802fe0'::uuid,'UPSC',1),
 ('fc5258c0-1495-491d-acb2-e6a335623c56','SSC CGL',2),
 ('225a4273-dc05-4d50-be63-c4cdca398dc3','Railway',3),
 ('3be9bffd-d0cc-4737-80d0-09526cc2fbb2','Banking IBPS',4),
 ('84ea8c13-1c1f-4cfb-a4c7-c0d1a17163cf','NEET',5),
 ('22ade8c1-0aae-4b86-9529-ff1c0a39f71a','CTET',6),
 ('eaf8d110-7673-4cf0-9eee-1d4a21ea2a86','WBCS',7),
 ('57aaea47-3eaf-4616-b020-8c2bb1e9657d','ICDS Supervisor',8),
 ('876cce6f-8fd9-4d99-9d6d-aa7cc237d192','WB Police',8)
) as o(id,name,ord) where c.id = o.id;

-- 3) re-link the two PDFs that were moved
update public.pdf_products set category_id = '84ea8c13-1c1f-4cfb-a4c7-c0d1a17163cf' where id = '706f0784-0de9-45fe-8c82-f5aadd1082ec';
update public.pdf_products set category_id = '22ade8c1-0aae-4b86-9529-ff1c0a39f71a' where id = '6751c15b-123b-4a5f-a9eb-854960dd7f6c';

-- 4) remove categories that 016 added (only if no PDF uses them)
delete from public.exam_categories c
where c.id not in ('6f811d6c-6eb3-4158-8fbc-bdbb7e802fe0','fc5258c0-1495-491d-acb2-e6a335623c56','225a4273-dc05-4d50-be63-c4cdca398dc3','3be9bffd-d0cc-4737-80d0-09526cc2fbb2','84ea8c13-1c1f-4cfb-a4c7-c0d1a17163cf','22ade8c1-0aae-4b86-9529-ff1c0a39f71a','eaf8d110-7673-4cf0-9eee-1d4a21ea2a86','57aaea47-3eaf-4616-b020-8c2bb1e9657d','876cce6f-8fd9-4d99-9d6d-aa7cc237d192')
  and not exists (select 1 from public.pdf_products p where p.category_id = c.id);

-- 5) remove the translation row 016 created (there was none before)
delete from public.website_settings where key = 'i18n';
