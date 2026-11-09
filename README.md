# ExamPDF Pro

React + TypeScript + Vite frontend for the ExamPDF Pro PDF catalogue. The homepage styling follows the supplied **ExamPDF Pro – 3D Design Demo**: navy/gold palette, sticky search/cart/account header, 3D hero book, trust badges, Popular Exams chips, Featured PDFs, Latest PDFs, Special Offers, compact 3D PDF cards, two-page preview spread, and footer copyright.

## Windows local start

1. Extract the ZIP.
2. Open the extracted `exampdf-pro` folder.
3. Double-click **`start-windows.bat`**.
4. Wait for npm to install dependencies and Vite to start.
5. Open <http://localhost:5173>.

If Windows blocks the batch file, open Command Prompt in this folder and run:

```bat
npm install
npm run dev
```

## Supabase setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Run `supabase/migrations/001_schema.sql` in the Supabase SQL Editor.
4. Then run `supabase/migrations/002_demo_admin_controls.sql`.
5. Promote your own profile to admin from the Supabase SQL Editor only after signing up:

```sql
update public.profiles set role = 'admin' where email = 'YOUR_LOGIN_EMAIL';
```

6. Sign in to the website and open `/#admin` to manage PDF products, categories, brand/header, hero, theme, trust badges, homepage sections, footer, and contact settings.

## Important security / completion notes

- Migration 002 moves legacy full-PDF storage paths out of the publicly readable `pdf_products` table and drops `full_pdf_path` from that table. Full PDF paths are stored in `pdf_secure_files`.
- The `paid-pdfs` bucket must remain private. Do not create a public read policy for it.
- The Admin UI uploads full PDFs to the private `paid-pdfs` bucket, preview PDFs to `pdf-previews`, and cover images to `covers`.
- The customer payment and download flow still requires the trusted Supabase Edge Functions (`create-order`, `submit-payment`, `decide-payment`, `download-pdf`, and admin proof access) to be implemented/deployed. The frontend must not be treated as production-ready for real payments or paid downloads until those server-side functions and their authorization checks have been tested.
- GitHub Pages hosts only the frontend. Supabase remains the backend for authentication, database, private storage, and Edge Functions.

## Build

```bash
npm install
npm run build
```


### Popular Exams categories

Run `supabase/migrations/003_seed_popular_exam_categories.sql` after migrations 001 and 002. It seeds UPSC, SSC CGL, Railway, Banking IBPS, NEET, CTET, WBCS and WB Police. The Admin Panel category manager controls their names, visibility and order. The frontend also keeps the eight defaults visible if the category query returns no rows; Admin changes take precedence when database rows exist.


## Windows quick start

1. Install Node.js LTS.
2. Extract this ZIP.
3. Double-click `start-windows.bat` (it installs packages on first run).
4. Open `http://localhost:5173`.

`node_modules` is intentionally excluded from the ZIP; dependencies are installed from `package-lock.json` on the target computer.
