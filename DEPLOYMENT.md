# מדריך פריסה - GitHub Pages

## שלבים לפריסת האפליקציה ב-GitHub Pages

### 1. הגדרת GitHub Secrets

לפני הפריסה, יש להגדיר את משתני הסביבה ב-GitHub Secrets. **בלי מפתחות Firebase האפליקציה תחזיר `auth/invalid-api-key` ב-production.**

1. לך ל-Repository ב-GitHub
2. פתח **Settings** → **Secrets and variables** → **Actions**
3. לחץ על **New repository secret**
4. הוסף את המשתנים הבאים (חובה ל-Firebase):

   **Firebase (חובה – לאימות ו-Firestore):**
   - `VITE_FIREBASE_API_KEY` – מפתח API מ-Firebase Console → Project settings → General
   - `VITE_FIREBASE_AUTH_DOMAIN` – למשל `mettingcalculate-ai.firebaseapp.com`
   - `VITE_FIREBASE_PROJECT_ID` – מזהה הפרויקט
   - `VITE_FIREBASE_STORAGE_BUCKET` – למשל `mettingcalculate-ai.firebasestorage.app`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID` – מספר Sender ID
   - `VITE_FIREBASE_APP_ID` – מזהה האפליקציה (מתחיל ב-`1:...`)

   **התחברות עם Google:**
   - `VITE_GOOGLE_CLIENT_ID` – Client ID מ-Google Cloud Console (OAuth 2.0)

   **אופציונלי (אם משתמשים):**
   - `SUPABASE_URL` – כתובת פרויקט Supabase
   - `SUPABASE_PUBLISHABLE_KEY` – מפתח anon של Supabase
   - `VITE_OPENAI_API_KEY` – מפתח OpenAI אם יש פיצ'רים של AI בצד הלקוח

### 2. הגדרת GitHub Pages

1. לך ל-Repository ב-GitHub
2. פתח **Settings** → **Pages**
3. תחת **Source**, בחר **GitHub Actions**
4. שמור את השינויים

### 3. הפעלת הפריסה הראשונה

לאחר Push ל-main branch, ה-workflow יפעל אוטומטית:

1. לך ל-**Actions** tab ב-GitHub
2. בחר את ה-workflow האחרון: **Deploy to GitHub Pages**
3. לחץ עליו כדי לראות את הפרטים

### 4. בדיקת לוגי הפריסה

#### דרך GitHub Actions

1. לך ל-**Actions** tab
2. בחר את ה-workflow הרצוי
3. לחץ על ה-job: **build-and-deploy**
4. תצוגה של כל השלבים:

   - **Checkout**: שליפת הקוד
   - **Setup Node.js**: הגדרת Node.js
   - **Install dependencies**: התקנת התלויות
   - **Build**: בניית האפליקציה
     - ⚠️ אם זה נכשל, בדוק שהסודות הוגדרו נכון
   - **Setup Pages**: הגדרת Pages
   - **Upload artifact**: העלאת הקבצים
   - **Deploy to GitHub Pages**: פריסה

#### פתרון בעיות נפוצות

**Build נכשל?**
- בדוק שכל ה-Secrets של Firebase הוגדרו (ראה למעלה). שגיאת `auth/invalid-api-key` אחרי פריסה = חסרים מפתחות Firebase ב-Secrets.
- בדוק את הלוגים בשלב **Build** לראות מה השגיאה

**גישה ישירה ל-URL (למשל /dashboard) מחזירה 404?**
- זה צפוי: GitHub Pages מחזיר 404 ואז הקובץ `404.html` מבצע redirect לדף הראשי עם הנתיב, והאפליקציה נטענת. אם אתה רואה אחרי רגע את דף הלוגין או הדשבורד – זה עובד. אם נשאר 404, וודא ש-`404.html` קיים בתיקיית `public/` ונכלל ב-build.

**פריסה לא עובדת?**
- ודא שבחרת **GitHub Actions** ב-Pages Settings
- בדוק שה-permissions נכונים (ה-workflow כולל את זה)

**אפליקציה לא נטענת?**
- ודא שהגישה ל-URL נכונה: `https://ramqa211-1.github.io/[שם-הריפו]/` (החלף את שם-הריפו בשם הריפוזיטורי בפועל, למשל meetingCalaculteAI או meetingcalculate)
- בדוק את ה-console בדפדפן לראות שגיאות JavaScript
- ודא ש-Supabase URL ו-Key נכונים

### 5. פריסת Edge Functions ל-Supabase

לפני שהצ'אט AI יעבוד, יש לפרוס את ה-Edge Functions:

#### דרך Supabase CLI (מומלץ)

```bash
# התקן Supabase CLI
npm install -g supabase

# התחבר
supabase login

# קשר את הפרויקט
supabase link --project-ref owarzqykotsvmdbbhxyn

# פריסת פונקציות
supabase functions deploy ai-chat
supabase functions deploy calculate-monthly-stats
supabase functions deploy parse-whatsapp-message
```

#### דרך Supabase Dashboard

1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard/project/owarzqykotsvmdbbhxyn)
2. לך ל-**Edge Functions**
3. לחץ על **Create a new function**
4. לכל פונקציה:
   - **ai-chat**: העתק את הקוד מ-`supabase/functions/ai-chat/index.ts`
   - **calculate-monthly-stats**: העתק את הקוד מ-`supabase/functions/calculate-monthly-stats/index.ts`
   - **parse-whatsapp-message**: העתק את הקוד מ-`supabase/functions/parse-whatsapp-message/index.ts`
5. שמור ופרוס

#### הגדרת Secrets ב-Supabase

1. לך ל-Supabase Dashboard → **Settings** → **Edge Functions** → **Secrets**
2. ודא שקיימים:
   - `OPENAI_API_KEY` - נדרש ל-ai-chat
   - `SUPABASE_URL` - מוגדר אוטומטית
   - `SUPABASE_SERVICE_ROLE_KEY` - מוגדר אוטומטית

### 6. בדיקת הלוגים ב-Supabase

לבדיקת לוגים של Edge Functions:

1. לך ל-Supabase Dashboard
2. פתח **Edge Functions**
3. בחר את הפונקציה הרצויה (למשל `ai-chat`)
4. לחץ על **Logs** או **Invocations**
5. תראה את כל הקריאות והשגיאות

### 7. גישה לאפליקציה

לאחר הפריסה המוצלחת, האפליקציה תהיה זמינה ב:

```
https://ramqa211-1.github.io/[שם-הריפוזיטורי]/
```

(החלף את שם-הריפוזיטורי בשם הריפו שלך ב-GitHub - לדוגמה meetingCalaculteAI)

### 8. בדיקות אחרונות

- [ ] האפליקציה נטענת כראוי
- [ ] האימות עובד (Login/Signup)
- [ ] פגישות נטענות ונשמרות
- [ ] דוחות מוצגים נכון
- [ ] צ'אט AI עובד (אם פורס את Edge Functions)
- [ ] כל ה-routes עובדים כראוי

## עדכונים עתידיים

לעדכן את האפליקציה:

1. בצע שינויים בקוד
2. Commit ו-Push ל-main branch
3. ה-workflow יפעל אוטומטית ויפרס את הגרסה החדשה

**זמן פריסה ממוצע**: 2-5 דקות

## תמיכה

לשאלות או בעיות:
- פתח Issue ב-GitHub
- בדוק את הלוגים ב-Actions
- ראה [SETUP.md](./SETUP.md) לפתרון בעיות נפוצות
