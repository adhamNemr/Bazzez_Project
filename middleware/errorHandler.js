/**
 * المركز الرئيسي لمعالجة الأخطاء في السيرفر
 * يقوم بالتحقق من نوع الخطأ وإرسال استجابة مناسبة للفرونت إند
 */
const errorHandler = (err, req, res, next) => {
    console.error(`❌ Error logic: ${err.message}`);
    console.error(err.stack);

    // أخطاء Sequelize (قاعدة البيانات)
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            status: 'error',
            message: 'بيانات غير صالحة لقاعدة البيانات',
            errors: err.errors.map(e => ({ field: e.path, message: e.message }))
        });
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
            status: 'error',
            message: 'هذه البيانات مسجلة مسبقاً (قيمة مكررة)',
            errors: err.errors.map(e => ({ field: e.path, message: e.message }))
        });
    }

    // أخطاء JWT
    if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            status: 'error',
            message: 'انتهت صلاحية الجلسة أو تصريح غير صالح. يرجى تسجيل الدخول مجدداً.'
        });
    }

    // أخطاء Joi (التحقق من المدخلات)
    if (err.isJoi) {
        return res.status(400).json({
            status: 'error',
            message: 'خطأ في التحقق من البيانات المرسلة',
            details: err.details.map(d => d.message)
        });
    }

    // الأخطاء العامة
    const statusCode = err.statusCode || 500;
    const message = err.message || 'حدث خطأ داخلي في الخادم';

    res.status(statusCode).json({
        status: 'error',
        message: message,
        // إخفاء الـ stack trace في بيئة الـ Production للخصوصية والأمان
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = errorHandler;
