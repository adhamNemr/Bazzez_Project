const Joi = require('joi');

/**
 * دالة عامة للتحقق من صحة البيانات المرسلة للـ API
 * @param {Object} schema - Joi schema object
 */
const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
    
    if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(', ');
        const err = new Error(errorMessage);
        err.isJoi = true;
        err.details = error.details;
        return next(err);
    }
    
    next();
};

// --- Schemas ---

const orderSchema = Joi.object({
    customer: Joi.object({
        name: Joi.string().allow('').optional().default('عميل تيك أواي'),
        phone: Joi.string().allow('').optional().default('00000000000'),
        address: Joi.string().allow('').optional()
    }).required(),
    orderDetails: Joi.array().items(
        Joi.object({
            name: Joi.string().required(),
            price: Joi.number().min(0).required(),
            quantity: Joi.number().min(1).required(),
            comments: Joi.array().items(
                Joi.object({
                    text: Joi.string().required(),
                    price: Joi.number().min(0).optional()
                })
            ).optional()
        })
    ).min(1).required().messages({ 'array.min': 'يجب إضافة منتج واحد على الأقل للطلب' }),
    orderTotal: Joi.number().min(0).required(),
    payment_method: Joi.string().valid('cash', 'card', 'instapay', 'vcash', 'electronic').default('cash')
});

const productSchema = Joi.object({
    name: Joi.string().required().messages({ 'any.required': 'اسم المنتج مطلوب' }),
    price: Joi.number().min(0).required().messages({ 'number.min': 'السعر لا يمكن أن يكون أقل من صفر' }),
    category: Joi.string().required()
});

module.exports = {
    validate,
    orderSchema,
    productSchema
};
