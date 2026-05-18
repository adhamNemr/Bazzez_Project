-- تنظيف بيانات الاختبار (Test Data)
-- مع الاحتفاظ بالمنتجات، الأصناف، المخزون، والعملاء، والإعدادات الأساسية

DELETE FROM "Orders";
DELETE FROM "OrderDetails";
DELETE FROM "Payments";
DELETE FROM "Expenses";
DELETE FROM "MerchantTransactions";
DELETE FROM "SyncQueues";
DELETE FROM "AuditLogs";
DELETE FROM "RateLimitLogs";
DELETE FROM "TokenBlacklists";
DELETE FROM "DailyClosings";
DELETE FROM "MonthlyClosings";

-- تصفير عدادات الأوردرات (مسلسل الفواتير يرجع لـ 1)
DELETE FROM "Settings" WHERE key = 'last_serial_date';
DELETE FROM "Settings" WHERE key = 'daily_serial';

-- لتأكيد التغييرات (في بعض قواعد البيانات)
VACUUM;
