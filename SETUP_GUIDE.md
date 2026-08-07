# ربط تطبيق FMS Training LMS بـ Google Sheet
### Connecting the FMS Training LMS to Google Sheets

---

## الخطوات (Arabic)

1. **أنشئ Google Sheet جديد** على درايفك، سمّه مثلاً `AVH FMS Training Records`.
2. من القائمة العلوية: **Extensions ← Apps Script** (الإضافات ← Apps Script).
3. احذف أي كود موجود بالمحرر، والصق بدلاً منه محتوى الملف المرفق:
   `AVH_FMS_GoogleSheet_Backend.gs`
4. احفظ المشروع (أيقونة الحفظ أو Ctrl+S)، وسمّه مثلاً `FMS LMS Backend`.
5. اضغط **Deploy ← New deployment** (نشر ← نشر جديد).
6. بجانب "Select type" اضغط أيقونة الترس ⚙ واختر **Web app**.
7. اضبط الإعدادات:
   - **Execute as:** Me (حسابك)
   - **Who has access:** Anyone (أي شخص) — هذا ضروري ليقدر التطبيق يرسل البيانات
8. اضغط **Deploy**، وقد يطلب منك Google صلاحية الموافقة (Authorize access) — وافق بحسابك.
9. بعد النشر، انسخ **Web app URL** الذي يظهر (يبدأ بـ `https://script.google.com/macros/s/.../exec`).
10. افتح تطبيق LMS ← سجّل دخول كـ **Admin** ← اضغط أيقونة الترس ⚙ (Google Sheet Sync) ← الصق الرابط ← احفظ.
11. من هذه اللحظة، كل تسجيل موظف وكل نتيجة اختبار ستُحفظ تلقائياً في الشيت (بورقتين منفصلتين: Employees و Results).

**ملاحظة:** أي تعديل لاحق على كود الـ Apps Script يتطلب عمل **New deployment** جديد (أو Manage deployments ← Edit) حتى يُطبَّق.

**تحديث جديد:** الكود الحالي يرسل إيميلات فعلية (رمز استعادة كلمة المرور) عبر حساب Google نفسه المسجّل فيه الـ Apps Script. عند إعادة النشر لأول مرة بعد هذا التحديث، ستحتاج للموافقة على صلاحية إضافية (Gmail / إرسال بريد) بنفس خطوات الموافقة السابقة.

---

**Update:** the current code sends real emails (password reset codes) using the same Google account the Apps Script is running under. The first time you redeploy after this update, you'll be asked to approve one more permission (Gmail / send email) using the same authorization steps as before.

---

## Steps (English)

1. **Create a new Google Sheet** in your Drive, e.g. `AVH FMS Training Records`.
2. Menu: **Extensions → Apps Script**.
3. Delete any placeholder code and paste the contents of the attached file:
   `AVH_FMS_GoogleSheet_Backend.gs`
4. Save the project (give it a name like `FMS LMS Backend`).
5. Click **Deploy → New deployment**.
6. Click the gear icon next to "Select type" and choose **Web app**.
7. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
8. Click **Deploy** and authorize access when prompted.
9. Copy the **Web app URL** shown after deployment (ends in `/exec`).
10. In the LMS, log in as **Admin**, click the gear icon (Google Sheet Sync), paste the URL, and save.
11. From then on, every employee registration and every exam result is written automatically to your sheet (two tabs: Employees and Results).

**Note:** any future edit to the Apps Script code requires a **new deployment** (or Manage deployments → Edit) to take effect.
