const currentLang = localStorage.getItem('lang') || 'ar';
const isAr = currentLang === 'ar';

const t = {
    ar: {
        pageTitle: 'إعدادات النظام - Vortex POS',
        headerPill: 'إعدادات النظام',
        homeBtn: 'الرئيسية',
        secStore: 'بيانات المحل',
        storeName: 'اسم المحل',
        storeAddress: 'العنوان',
        storePhone: 'رقم الهاتف',
        secReceipt: 'إعدادات الفاتورة',
        receiptFooter: 'رسالة التذييل (Footer)',
        currency: 'العملة',
        vat: 'ضريبة القيمة المضافة (%)',
        showDiscount: 'إظهار الخصم في الإيصال',
        showComments: 'إظهار الإضافات والتعليقات',
        secSystem: 'إعدادات النظام',
        language: 'لغة الواجهة',
        systemMode: 'نوع النشاط (System Mode)',
        printMode: 'وضع الطباعة',
        btnSave: 'حفظ كل الإعدادات',
        successTitle: 'تم الحفظ',
        successText: 'تم تحديث الإعدادات بنجاح',
        errorTitle: 'خطأ',
        errorMsg: 'فشل في حفظ الإعدادات',
        secDanger: 'منطقة الخطورة - تصفير النظام للتسليم',
        btnResetDb: 'تصفير فواتير وعمليات النظام بالكامل',
        resetWarnTitle: 'هل أنت متأكد من تصفير النظام؟',
        resetWarnText: 'سيتم مسح جميع الفواتير والمبيعات والمصروفات والعمليات بالكامل محلياً وعلى السحابة! هذا الإجراء لا يمكن التراجع عنه!',
        resetConfirmBtn: 'نعم، قم بالتصفير!',
        resetCancelBtn: 'إلغاء',
        resetSuccessTitle: 'تم التصفير بنجاح!',
        resetSuccessText: 'تمت تهيئة وتصفير النظام بنجاح للتسليم.'
    },
    en: {
        pageTitle: 'System Settings - Vortex POS',
        headerPill: 'System Settings',
        homeBtn: 'Home',
        secStore: 'Store Information',
        storeName: 'Store Name',
        storeAddress: 'Address',
        storePhone: 'Phone Number',
        secReceipt: 'Receipt Settings',
        receiptFooter: 'Footer Message',
        currency: 'Currency',
        vat: 'VAT (%)',
        showDiscount: 'Show Discount on Receipt',
        showComments: 'Show Addons & Comments',
        secSystem: 'System Configuration',
        language: 'Interface Language',
        systemMode: 'Business Type',
        printMode: 'Printing Mode',
        btnSave: 'Save All Settings',
        successTitle: 'Saved',
        successText: 'Settings updated successfully',
        errorTitle: 'Error',
        errorMsg: 'Failed to save settings',
        secDanger: 'Danger Zone - Production Reset',
        btnResetDb: 'Reset All System Invoices & Operations',
        resetWarnTitle: 'Are you absolutely sure?',
        resetWarnText: 'All invoices, sales, expenses, and transaction logs will be permanently wiped locally and from the cloud! This action CANNOT be undone!',
        resetConfirmBtn: 'Yes, Wipe Everything!',
        resetCancelBtn: 'Cancel',
        resetSuccessTitle: 'Reset Complete!',
        resetSuccessText: 'All transactional data has been successfully wiped.'
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    applyTranslations();
    await fetchSettings();
    
    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const settingsData = {};
        formData.forEach((value, key) => {
            settingsData[key] = value;
        });

        try {
            const response = await fetch('/api/settings/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(settingsData)
            });

            if (response.ok) {
                // Update local storage for language and mode if changed
                if (settingsData.language) {
                    localStorage.setItem('lang', settingsData.language);
                }
                if (settingsData.system_mode) {
                    localStorage.setItem('systemMode', settingsData.system_mode);
                }

                Swal.fire({
                    icon: 'success',
                    title: t[currentLang].successTitle,
                    text: t[currentLang].successText,
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.reload();
                });
            } else {
                throw new Error(t[currentLang].errorMsg);
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: t[currentLang].errorTitle,
                text: error.message
            });
        }
    });

    // 🔴 Danger Zone: Database Reset Event Listener
    const resetBtn = document.getElementById('reset-db-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            const langT = t[currentLang];
            const result = await Swal.fire({
                title: langT.resetWarnTitle,
                text: langT.resetWarnText,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#64748b',
                confirmButtonText: langT.resetConfirmBtn,
                cancelButtonText: langT.resetCancelBtn
            });

            if (result.isConfirmed) {
                // Show loading spinner
                Swal.fire({
                    title: isAr ? 'جاري التصفير والتهيئة...' : 'Resetting system...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                try {
                    const response = await fetch('/api/settings/reset-database', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (response.ok) {
                        Swal.fire({
                            icon: 'success',
                            title: langT.resetSuccessTitle,
                            text: langT.resetSuccessText,
                            confirmButtonColor: 'var(--primary)'
                        }).then(() => {
                            window.location.reload();
                        });
                    } else {
                        throw new Error(isAr ? 'فشل في الاتصال بالسيرفر لتصفير البيانات' : 'Server failed to reset database');
                    }
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: langT.errorTitle,
                        text: error.message
                    });
                }
            }
        });
    }
});

function applyTranslations() {
    const langT = t[currentLang];
    
    // 🌍 Dynamic Layout Direction
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;

    // Apply texts
    document.title = langT.pageTitle;
    const updateLoc = (id, text) => {
        const el = document.getElementById(id);
        if(el) el.textContent = text;
    };

    updateLoc('loc-header-pill', langT.headerPill);
    updateLoc('loc-home', langT.homeBtn);
    updateLoc('loc-sec-store', langT.secStore);
    updateLoc('loc-store-name', langT.storeName);
    updateLoc('loc-store-address', langT.storeAddress);
    updateLoc('loc-store-phone', langT.storePhone);
    updateLoc('loc-sec-receipt', langT.secReceipt);
    updateLoc('loc-receipt-footer', langT.receiptFooter);
    updateLoc('loc-currency', langT.currency);
    updateLoc('loc-vat', langT.vat);
    updateLoc('loc-show-discount', langT.showDiscount);
    updateLoc('loc-show-comments', langT.showComments);
    updateLoc('loc-sec-system', langT.secSystem);
    updateLoc('loc-language', langT.language);
    updateLoc('loc-system-mode', langT.systemMode);
    updateLoc('loc-print-mode', langT.printMode);
    updateLoc('loc-btn-save', langT.btnSave);
    updateLoc('loc-sec-danger', langT.secDanger);
    updateLoc('loc-btn-reset-db', langT.btnResetDb);
    
    // Update placeholders for English
    if(!isAr) {
        const updatePlaceholder = (name, text) => {
            const el = document.querySelector(`input[name="${name}"]`);
            if(el) el.placeholder = text;
        };
        updatePlaceholder('store_address', 'Full Address');
        updatePlaceholder('receipt_footer', 'Thank you for your visit');
    }
}

async function fetchSettings() {
    try {
        const response = await fetch('/api/settings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const settings = await response.json();
        
        // تعبئة الفورم بالقيم الحالية
        const form = document.getElementById('settings-form');
        for (const [key, value] of Object.entries(settings)) {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = value;
            }
        }
    } catch (error) {
        console.error('Error fetching settings:', error);
    }
}
