// 🛡️ Vortex POS - Fine-grained Permissions Configuration
// Based on Claude's recommendations for professional RBAC

const PERMISSIONS = {
    // ---- Orders ----
    orders: {
        create:  'orders:create',
        view:    'orders:view',
        cancel:  'orders:cancel',    // Cashiers cannot cancel
        refund:  'orders:refund',    // Supervisors only
    },
    // ---- Inventory ----
    inventory: {
        view:    'inventory:view',
        edit:    'inventory:edit',
        delete:  'inventory:delete', // Managers only
    },
    // ---- Reports ----
    reports: {
        daily:   'reports:daily',
        monthly: 'reports:monthly',
        export:  'reports:export',
    },
    // ---- Finance & Merchants ----
    finance: {
        view:    'finance:view',
        edit:    'finance:edit',     // Accountant + Manager
        ledger:  'finance:ledger',
    },
    // ---- Users ----
    users: {
        manage:  'users:manage',     // Manager only
    },
};

const ROLES = {
    manager: {
        label: 'مدير (صلاحيات كاملة)',
        permissions: [
            ...Object.values(PERMISSIONS.orders),
            ...Object.values(PERMISSIONS.inventory),
            ...Object.values(PERMISSIONS.reports),
            ...Object.values(PERMISSIONS.finance),
            ...Object.values(PERMISSIONS.users),
        ],
    },

    supervisor: {
        label: 'مشرف',
        permissions: [
            PERMISSIONS.orders.create,
            PERMISSIONS.orders.view,
            PERMISSIONS.orders.cancel,
            PERMISSIONS.orders.refund,
            PERMISSIONS.inventory.view,
            PERMISSIONS.inventory.edit,
            PERMISSIONS.reports.daily,
            PERMISSIONS.finance.view,
        ],
    },

    accountant: {
        label: 'محاسب',
        permissions: [
            PERMISSIONS.orders.view,
            PERMISSIONS.reports.daily,
            PERMISSIONS.reports.monthly,
            PERMISSIONS.reports.export,
            PERMISSIONS.finance.view,
            PERMISSIONS.finance.edit,
            PERMISSIONS.finance.ledger,
        ],
    },

    cashier: {
        label: 'كاشير',
        permissions: [
            PERMISSIONS.orders.create,
            PERMISSIONS.orders.view,
            PERMISSIONS.inventory.view,
            PERMISSIONS.reports.daily,
        ],
    },

    owner: {
        label: 'مالك (عرض فقط)',
        permissions: [
            PERMISSIONS.orders.view,
            PERMISSIONS.reports.daily,
            PERMISSIONS.reports.monthly,
            PERMISSIONS.finance.view,
            PERMISSIONS.finance.ledger,
        ],
    },
};

module.exports = { PERMISSIONS, ROLES };
