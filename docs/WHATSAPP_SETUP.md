# הגדרת אינטגרציית WhatsApp עם GREEN-API

## דרישות מקדימות

- חשבון [GREEN-API](https://green-api.com/) עם Instance ID ו-API Token
- WhatsApp Business או מספר טלפון רגיל מחובר ל-GREEN-API

## שלב 1: יצירת Instance ב-GREEN-API

1. היכנס ל-[GREEN-API Console](https://console.green-api.com/)
2. צור Instance חדש
3. סרוק את קוד ה-QR עם WhatsApp שלך
4. העתק את **Instance ID** ו-**API Token** מההגדרות

## שלב 2: הגדרת Secrets ב-Supabase

1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard)
2. בחר את הפרויקט שלך
3. לך ל-**Project Settings** → **Edge Functions** → **Secrets**
4. הוסף את ה-Secrets הבאים:
   - `GREENAPI_INSTANCE_ID` - ה-Instance ID שלך
   - `GREENAPI_TOKEN` - ה-API Token שלך

## שלב 3: פריסת Edge Functions

פרוס את הפונקציות הבאות:

```bash
supabase functions deploy whatsapp-bot
supabase functions deploy parse-whatsapp-message
supabase functions deploy send-whatsapp-notification
```

## שלב 4: הגדרת Webhook ב-GREEN-API

1. היכנס ל-GREEN-API Console
2. בחר את ה-Instance שלך
3. לך ל-**Settings** → **Webhooks**
4. הגדר את **Webhook URL**:
   ```
   https://[YOUR_PROJECT_REF].supabase.co/functions/v1/whatsapp-bot
   ```
   החלף `[YOUR_PROJECT_REF]` במזהה הפרויקט שלך מ-Supabase (נמצא ב-URL של הפרויקט)

5. הפעל את הסוגים הבאים:
   - `incomingMessageReceived` - הודעות נכנסות

## שלב 5: הגדרת מספר הטלפון באפליקציה

1. היכנס לאפליקציה והתחבר
2. לך ל-**הגדרות** → **הגדרות WhatsApp**
3. הזן את מספר הטלפון שלך בפורמט:
   - `972501234567` (עם קידומת מדינה)
   - או `0501234567` (המערכת תמיר אוטומטית)
4. לחץ **שמור הגדרות WhatsApp**

## בדיקה

1. שלח הודעה למספר ה-WhatsApp המקושר ל-GREEN-API Instance
2. שלח את הפקודה `/help` - תקבל רשימת פקודות
3. שלח `/stats` - תקבל את סטטיסטיקות החודש

## פתרון בעיות

### הבוט לא מגיב
- ודא שה-Webhook URL נכון ומכוון לפונקציה `whatsapp-bot`
- בדוק את לוגים ב-Supabase Dashboard → Edge Functions → whatsapp-bot
- ודא שהמספר הטלפון מוגדר נכון בהגדרות

### "אינך מזוהה במערכת"
- ודא שהמספר שהזנת בהגדרות תואם למספר שממנו אתה שולח
- המספר נשמר בפורמט 972XXXXXXXXX

### שגיאות GREEN-API
- ודא שה-Instance מחובר ופעיל
- בדוק שה-Secrets מוגדרים נכון ב-Supabase
