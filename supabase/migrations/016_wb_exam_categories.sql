-- West Bengal exams first, All India exams last.
-- Data-only: no table / column / policy change. Idempotent (safe to run more than once).
-- Existing rows are renamed IN PLACE (same id) so pdf_products.category_id links are preserved.
-- Matching is case-insensitive by name.

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

-- 3) NEET and CTET are no longer separate categories: move their PDFs to "Other All India Exams",
--    then remove the two empty categories. Only category_id of those PDFs changes (no other PDF data/files).
update public.pdf_products
set category_id = (select id from public.exam_categories where lower(trim(name)) = 'other all india exams' limit 1)
where category_id in (select id from public.exam_categories where lower(trim(name)) in ('neet', 'ctet'))
  and exists (select 1 from public.exam_categories where lower(trim(name)) = 'other all india exams');

delete from public.exam_categories c
where lower(trim(c.name)) in ('neet', 'ctet')
  and not exists (select 1 from public.pdf_products p where p.category_id = c.id);

-- 4) Display order: West Bengal (1-15) -> All India (16-21)
update public.exam_categories c set sort_order = o.ord
from (values
  ('WBCS', 1), ('WBPSC', 2), ('WBSSC', 3), ('WB Primary TET', 4), ('WB Upper Primary TET', 5),
  ('WB SLST', 6), ('WB Police', 7), ('Kolkata Police', 8), ('WBPSC Clerkship', 9),
  ('WBPSC Miscellaneous', 10), ('WB Group C & D', 11), ('WB Food SI', 12), ('WB ICDS Supervisor', 13),
  ('WB Excise', 14), ('Other West Bengal Exams', 15),
  ('UPSC', 16), ('SSC (All India)', 17), ('Railway (All India)', 18), ('Banking', 19), ('Defence', 20),
  ('Other All India Exams', 21)
) as o(name, ord)
where lower(trim(c.name)) = lower(o.name);

-- 5) Bengali / Hindi names for the new or renamed categories, using the EXISTING translation system
--    (website_settings key 'i18n', entries "cat.<category id>"). Translations already saved from
--    Admin -> Translations are kept (they win over these defaults). Abbreviations stay in Latin script.
insert into public.website_settings (key, value) values ('i18n', '{"bn":{},"hi":{}}'::jsonb)
on conflict (key) do nothing;

update public.website_settings w
set value = jsonb_set(
              jsonb_set(coalesce(w.value, '{}'::jsonb), '{bn}', t.bn || coalesce(w.value -> 'bn', '{}'::jsonb)),
              '{hi}', t.hi || coalesce(w.value -> 'hi', '{}'::jsonb))
from (
  select jsonb_object_agg('cat.' || c.id::text, tr.bn) as bn,
         jsonb_object_agg('cat.' || c.id::text, tr.hi) as hi
  from public.exam_categories c
  join (values
    ('WB Primary TET',          'WB প্রাইমারি TET',                'WB प्राइमरी TET'),
    ('WB Upper Primary TET',    'WB আপার প্রাইমারি TET',           'WB अपर प्राइमरी TET'),
    ('Kolkata Police',          'কলকাতা পুলিশ',                    'कोलकाता पुलिस'),
    ('WBPSC Clerkship',         'WBPSC ক্লার্কশিপ',                'WBPSC क्लर्कशिप'),
    ('WBPSC Miscellaneous',     'WBPSC বিবিধ',                     'WBPSC विविध'),
    ('WB Group C & D',          'WB গ্রুপ C ও D',                  'WB ग्रुप C और D'),
    ('WB Food SI',              'WB ফুড SI',                       'WB फूड SI'),
    ('WB ICDS Supervisor',      'WB ICDS সুপারভাইজার',             'WB ICDS सुपरवाइज़र'),
    ('WB Excise',               'WB আবগারি',                       'WB आबकारी'),
    ('Other West Bengal Exams', 'অন্যান্য পশ্চিমবঙ্গ পরীক্ষা',      'अन्य पश्चिम बंगाल परीक्षाएँ'),
    ('SSC (All India)',         'SSC (সর্বভারতীয়)',               'SSC (अखिल भारतीय)'),
    ('Railway (All India)',     'রেলওয়ে (সর্বভারতীয়)',           'रेलवे (अखिल भारतीय)'),
    ('Banking',                 'ব্যাংকিং',                        'बैंकिंग'),
    ('Defence',                 'প্রতিরক্ষা',                      'रक्षा'),
    ('Other All India Exams',   'অন্যান্য সর্বভারতীয় পরীক্ষা',    'अन्य अखिल भारतीय परीक्षाएँ')
  ) as tr(name, bn, hi) on lower(trim(c.name)) = lower(tr.name)
) t
where w.key = 'i18n' and t.bn is not null;
