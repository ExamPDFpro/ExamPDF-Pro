-- Seed the demo's eight core Popular Exams so they are also manageable from Admin.
-- Existing categories are preserved; matching is case-insensitive by name.
insert into public.exam_categories (name, sort_order, is_hidden)
select v.name, v.sort_order, false
from (values
  ('UPSC', 1),
  ('SSC CGL', 2),
  ('Railway', 3),
  ('Banking IBPS', 4),
  ('NEET', 5),
  ('CTET', 6),
  ('WBCS', 7),
  ('WB Police', 8)
) as v(name, sort_order)
where not exists (
  select 1 from public.exam_categories c
  where lower(trim(c.name)) = lower(v.name)
);
