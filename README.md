# מערכת ניהול פגישות - Meeting Calculate AI

מערכת ניהול פגישות חכמה עם AI לניהול פגישות, הרצאות ופרויקטים. המערכת מספקת ניהול מלא של פגישות, דוחות חודשיים, ניהול משתמשים, וצ'אט AI חכם.

## תכונות עיקריות

### משתמש רגיל
- 📅 ניהול פגישות אישיות
- 📊 דוחות חודשיים מפורטים
- ⚙️ הגדרות משתמש מותאמות אישית
- 💬 צ'אט AI לשאלות על הנתונים (קריאה בלבד)

### אדמין
- 👥 כל התכונות של משתמש רגיל
- 🌐 צפייה בכל הפגישות במערכת
- 🛡️ ניהול משתמשים ותפקידים
- 🤖 צ'אט AI עם יכולת כתיבה (יצירה, עדכון, מחיקה)
- 📈 גישה מלאה לכל הנתונים

## טכנולוגיות

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (Database + Auth + Edge Functions)
- **AI**: OpenAI GPT-4o-mini
- **Routing**: React Router v6
- **State Management**: TanStack Query

## התקנה והגדרה

### דרישות מקדימות

- Node.js 18+ ו-npm
- חשבון Supabase
- חשבון OpenAI (לצ'אט AI)
- חשבון Google Cloud (ל-OAuth - אופציונלי)

### הוראות התקנה מהירה

1. **שכפל את המאגר**
   ```bash
   git clone https://github.com/ramqa211-1/meetingcalculate.git
   cd meetingcalculate
   ```

2. **התקן תלויות**
   ```bash
   npm install
   ```

3. **הגדר משתני סביבה**
   - צור קובץ `.env` בתיקיית הפרויקט
   - העתק מ-`.env.example` (אם קיים) או הוסף:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. **הרץ את הפרויקט**
   ```bash
   npm run dev
   ```

### הגדרה מפורטת

עבור הוראות מפורטות על:
- הגדרת Supabase
- הרצת מיגרציות
- הגדרת Google OAuth
- הגדרת AI Chat
- פריסת Edge Functions

ראה: [SETUP.md](./SETUP.md)

## פיתוח

```bash
# הרצת שרת פיתוח
npm run dev

# Build לייצור
npm run build

# Preview של Build
npm run preview

# Linting
npm run lint

# הגדרת מסד נתונים
npm run db:setup

# Push מיגרציות ל-Supabase
npm run db:push
```

## פריסה ב-GitHub Pages

הפרויקט מוכן לפריסה ב-GitHub Pages עם GitHub Actions.

### לפני הפריסה

1. **הגדר GitHub Secrets**
   - לך ל-Settings → Secrets and variables → Actions
   - הוסף את המשתנים הבאים:
     - `VITE_SUPABASE_URL` - כתובת פרויקט Supabase
     - `VITE_SUPABASE_PUBLISHABLE_KEY` - מפתח anon של Supabase

2. **פרוס Edge Functions ל-Supabase**
   - ראה הוראות מפורטות ב-[SETUP.md](./SETUP.md#3-deploy-edge-functions)
   - ודא ש-`OPENAI_API_KEY` מוגדר ב-Supabase Secrets

### הפריסה

1. **Push ל-GitHub**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **הגדר GitHub Pages**
   - לך ל-Settings → Pages
   - תחת "Source", בחר "GitHub Actions"
   - ה-workflow יבנה ויפרס אוטומטית

3. **בדוק את הלוגים**
   - לך ל-Actions tab
   - בחר את ה-workflow האחרון
   - בדוק שהכל עבד בהצלחה

### גישה לאפליקציה

לאחר הפריסה, האפליקציה תהיה זמינה ב:
```
https://ramqa211-1.github.io/meetingcalculate/
```

## מבנה הפרויקט

```
meetingCalaculteAI/
├── src/
│   ├── components/      # רכיבי UI
│   │   ├── dashboard/   # רכיבי לוח הבקרה
│   │   └── ui/          # רכיבי shadcn/ui
│   ├── hooks/           # Custom React Hooks
│   ├── integrations/    # אינטגרציות (Supabase)
│   ├── lib/             # פונקציות עזר
│   ├── pages/           # דפי האפליקציה
│   └── App.tsx          # רכיב ראשי
├── supabase/
│   ├── functions/       # Edge Functions
│   │   ├── ai-chat/
│   │   ├── calculate-monthly-stats/
│   │   └── parse-whatsapp-message/
│   └── migrations/      # מיגרציות מסד נתונים
├── .github/
│   └── workflows/       # GitHub Actions workflows
└── public/              # קבצים סטטיים
```

## אבטחה

- ✅ כל המפתחות והסודות מנוהלים דרך משתני סביבה
- ✅ קובץ `.env` מופיע ב-`.gitignore` ולא עולה ל-GitHub
- ✅ Edge Functions משתמשות ב-Supabase Secrets לאבטחה מקסימלית
- ✅ אימות דרך Supabase Auth עם Google OAuth

## תרומה

תרומות תמיד מתקבלות בברכה! אנא:

1. Fork את המאגר
2. צור branch חדש (`git checkout -b feature/amazing-feature`)
3. Commit את השינויים (`git commit -m 'Add amazing feature'`)
4. Push ל-branch (`git push origin feature/amazing-feature`)
5. פתח Pull Request

## רישיון

הפרויקט זה הוא פרויקט אישי.

## תמיכה

לשאלות ותמיכה:
- פתח Issue ב-GitHub
- ראה [SETUP.md](./SETUP.md) לפתרון בעיות נפוצות

## קישורים

- [Supabase Dashboard](https://supabase.com/dashboard/project/owarzqykotsvmdbbhxyn)
- [Documentation](./SETUP.md)
