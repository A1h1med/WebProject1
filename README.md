# متجر العطور (Node.js + SQLite)
## التشغيل محلياً
1. ثبّت Node.js 18+ ثم: `npm install`
2. انسخ `.env.example` وعدّل القيم، ثم شغّل (Linux/Mac): `export $(cat .env | xargs) && npm start`
3. افتح http://localhost:3000 — لوحة التحكم: /admin/login
## النشر (Render / Railway / VPS)
- أمر التشغيل: `npm start`. أضف متغيرات `.env` في إعدادات الاستضافة.
- مهم: اربط قرصاً دائماً (Persistent Disk) بالمجلد `data/` وإلا ضاعت المنتجات والصور عند كل نشر.
- فعّل HTTPS واجعل SITE_URL بالنطاق الفعلي (يُستخدم في الروابط وsitemap).
## الأمان
جلسة موقّعة HttpOnly + SameSite=Strict، حد محاولات الدخول، Helmet، رفع صور jpg/png/webp فقط (3MB).
## النسخ الاحتياطي
انسخ مجلد `data/` دورياً.
