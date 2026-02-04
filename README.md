<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1gLhz9Ik4NE6Okvmx6XsCrPBwcws9uVJe

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies: `npm install`
2. Copy [.env.example](.env.example) to `.env.local` and set any optional keys.
3. Run the app: `npm run dev`

### Optional: Supabase (PostgreSQL) database

To persist assessments in Supabase (PostgreSQL) instead of local storage:

1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase Dashboard, go to **SQL Editor** and run the schema from [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql).
3. In **Settings > API**, copy the project URL and the `anon` public key.
4. In `.env.local` set:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key

Restart the dev server. The app will use Supabase for sessions and tasks when these variables are set.
