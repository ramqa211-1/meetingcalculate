# הוראות הגדרה - מערכת ניהול פגישות

## הגדרת Supabase

### 1. הגדרת משתני סביבה

צור קובץ `.env` בתיקיית הפרויקט עם התוכן הבא:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

> **הערה:** בקובץ `.env` מקומי, השמות חייבים להתחיל ב-`VITE_` כדי ש-Vite יטען אותם. ב-GitHub Secrets, השתמש בשמות `SUPABASE_URL` ו-`SUPABASE_PUBLISHABLE_KEY`.

### 2. הרצת מיגרציות

#### אופציה א': שימוש ב-Supabase CLI (מומלץ)

```bash
# התקן Supabase CLI
npm install -g supabase

# קשר את הפרויקט
supabase link --project-ref owarzqykotsvmdbbhxyn

# הרץ מיגרציות
supabase db push
```

#### אופציה ב': PowerShell Script

```powershell
.\scripts\setup-db-cli.ps1
```

#### אופציה ג': Bash Script

```bash
chmod +x scripts/setup-db-cli.sh
./scripts/setup-db-cli.sh
```

#### אופציה ד': ידנית דרך Dashboard

1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard/project/owarzqykotsvmdbbhxyn)
2. לך ל-SQL Editor
3. העתק את התוכן מ-`supabase/migrations/20251118191750_7973c65e-6284-4a6d-a1cc-bdfe50a64ea6.sql`
4. העתק את התוכן מ-`supabase/migrations/20250120000000_add_admin_sharing.sql`
5. הרץ את שתי המיגרציות

### 3. הגדרת משתמש אדמין ראשון

לאחר הרצת המיגרציות, הגדר משתמש ראשון כאדמין:

```sql
-- החלף את USER_ID עם ה-ID של המשתמש שלך
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'USER_ID';
```

או דרך Supabase Dashboard:
1. לך ל-Authentication > Users
2. מצא את המשתמש שלך
3. העתק את ה-UUID
4. הרץ את ה-SQL לעיל

## הגדרת Google OAuth

### 1. יצירת פרויקט ב-Google Cloud Console

1. היכנס ל-[Google Cloud Console](https://console.cloud.google.com/)
2. צור פרויקט חדש או בחר פרויקט קיים
3. לך ל-APIs & Services > Credentials
4. לחץ על "Create Credentials" > "OAuth client ID"
5. בחר "Web application"
6. הוסף Authorized redirect URIs:
   ```
   https://owarzqykotsvmdbbhxyn.supabase.co/auth/v1/callback
   ```
7. העתק את Client ID ו-Client Secret

### 2. הגדרה ב-Supabase

1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard/project/owarzqykotsvmdbbhxyn)
2. לך ל-Authentication > Providers
3. מצא "Google" ולחץ עליו
4. הפעל את ה-Provider
5. הכנס את Client ID ו-Client Secret
6. שמור

### 3. בדיקה

1. הרץ את האפליקציה: `npm run dev`
2. לך לדף ההתחברות
3. לחץ על "Sign in with Google"
4. התחבר עם חשבון Google שלך

## הגדרת AI Chat

### 1. יצירת API Key ל-OpenAI

1. היכנס ל-[OpenAI Platform](https://platform.openai.com/)
2. לך ל-API Keys
3. צור API Key חדש
4. העתק את ה-Key

### 2. הגדרה ב-Supabase

1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard/project/owarzqykotsvmdbbhxyn)
2. לך ל-Edge Functions
3. מצא את הפונקציה `ai-chat`
4. לך ל-Settings > Secrets
5. הוסף Secret חדש:
   - Name: `OPENAI_API_KEY`
   - Value: ה-API Key שלך מ-OpenAI

### 3. Deploy Edge Functions

יש 3 Edge Functions שצריך לפרוס:
- `ai-chat` - צ'אט AI (דורש OPENAI_API_KEY)
- `calculate-monthly-stats` - חישוב סטטיסטיקות חודשיות
- `parse-whatsapp-message` - פרסור הודעות WhatsApp

#### אופציה א': שימוש ב-Supabase CLI (מומלץ)

```bash
# התקן Supabase CLI (אם עוד לא מותקן)
npm install -g supabase

# התחבר לחשבון Supabase
supabase login

# קשר את הפרויקט
supabase link --project-ref owarzqykotsvmdbbhxyn

# פריסת כל הפונקציות
supabase functions deploy ai-chat
supabase functions deploy calculate-monthly-stats
supabase functions deploy parse-whatsapp-message
```

#### אופציה ב': פריסה ידנית דרך Supabase Dashboard

1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard/project/owarzqykotsvmdbbhxyn)
2. לך ל-Edge Functions
3. לחץ על "Create a new function"
4. לכל פונקציה:
   - **ai-chat**: העתק את התוכן מ-`supabase/functions/ai-chat/index.ts`
   - **calculate-monthly-stats**: העתק את התוכן מ-`supabase/functions/calculate-monthly-stats/index.ts`
   - **parse-whatsapp-message**: העתק את התוכן מ-`supabase/functions/parse-whatsapp-message/index.ts`
5. שמור ופרוס

### 4. אימות Secrets

וודא שכל ה-Secrets מוגדרים:
1. לך ל-Settings → Edge Functions → Secrets
2. ודא שקיימים:
   - `OPENAI_API_KEY` (נדרש ל-ai-chat)
   - `SUPABASE_URL` (מוגדר אוטומטית)
   - `SUPABASE_SERVICE_ROLE_KEY` (מוגדר אוטומטית)

## הרצת הפרויקט

```bash
# התקן תלויות
npm install

# הרץ את השרת
npm run dev
```

## מבנה הפרויקט

- `src/pages/` - דפי האפליקציה
  - `Dashboard.tsx` - לוח בקרה עם כל הפגישות
  - `Reports.tsx` - דוחות חודשיים
  - `Settings.tsx` - הגדרות משתמש
  - `Admin.tsx` - ניהול משתמשים (רק לאדמינים)
  - `AIChat.tsx` - צ'אט AI
- `src/hooks/` - Custom hooks
  - `use-auth.ts` - ניהול אימות ותפקידים
- `supabase/migrations/` - מיגרציות מסד נתונים
- `supabase/functions/` - Edge Functions

## תכונות

### משתמש רגיל
- ניהול פגישות אישיות
- צפייה בדוחות אישיים
- הגדרות אישיות
- צ'אט AI (קריאה בלבד)

### אדמין
- כל התכונות של משתמש רגיל
- צפייה בכל הפגישות במערכת
- ניהול משתמשים ותפקידים
- צ'אט AI עם יכולת כתיבה (יצירה, עדכון, מחיקה)

## פתרון בעיות

### בעיות חיבור ל-Supabase
- ודא ש-`.env` מכיל את הערכים הנכונים
- ודא שהפרויקט ב-Supabase פעיל

### בעיות Google OAuth
- ודא שה-Client ID ו-Secret נכונים
- ודא שה-Redirect URI נכון ב-Google Console
- ודא שה-Provider מופעל ב-Supabase

### בעיות AI Chat
- ודא ש-`OPENAI_API_KEY` מוגדר ב-Supabase Secrets
- ודא שה-Edge Function deployed
- בדוק את ה-logs ב-Supabase Dashboard
