-- West Bengal exams first, All India exams last (data-only: no table/column/policy change).
-- Existing rows are renamed IN PLACE (same id), so every pdf_products.category_id link is preserved.
-- Idempotent: safe to run more than once. Matching is case-insensitive by name.

-- 1) Rename existing categories to the requested names (ids unchanged)
update public.exam_categories set name = 'SSC (All India)'      where lower(trim(name)) = 'ssc cgl';
update public.exam_categories set name = 'Railway (All India)'  where lower(trim(name)) = 'railway';
update public.exam_categories set name = 'Banking'              where lower(trim(name)) = 'banking ibps';
update public.exam_categories set name = 'WB ICDS Supervisor'   where lower(trim(name)) = 'icds supervisor';

-- 2) Add the missing categories (only if no category with that name exists)
insert into public.exam_categories (name, sort_order, is_hidden)
select v.name, 0, false
from (values
  ('WBPSC'), ('WBSSC'), ('WB Primary TET'), ('WB Upper Primary TET'), ('WB SLST'),
  ('Kolkata Police'), ('WBPSC Clerkship'), ('WBPSC Miscellaneous'), ('WB Group C & D'),
  ('WB Food SI'), ('WB Excise'), ('Other West Bengal Exams'),
  ('Defence'), ('Other All India Exams')
) as v(name)
where not exists (select 1 from public.exam_categories c where lower(trim(c.name)) = lower(v.name));

-- 3) Display order: West Bengal (1-15) -> All India (16-23)
update public.exam_categories c set sort_order = o.ord
from (values
  ('WBCS', 1), ('WBPSC', 2), ('WBSSC', 3), ('WB Primary TET', 4), ('WB Upper Primary TET', 5),
  ('WB SLST', 6), ('WB Police', 7), ('Kolkata Police', 8), ('WBPSC Clerkship', 9),
  ('WBPSC Miscellaneous', 10), ('WB Group C & D', 11), ('WB Food SI', 12), ('WB ICDS Supervisor', 13),
  ('WB Excise', 14), ('Other West Bengal Exams', 15),
  ('UPSC', 16), ('SSC (All India)', 17), ('Railway (All India)', 18), ('Banking', 19), ('Defence', 20),
  ('NEET', 21), ('CTET', 22), ('Other All India Exams', 23)
) as o(name, ord)
where lower(trim(c.name)) = lower(o.name);
