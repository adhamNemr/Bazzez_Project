# 🌪️ Vortex POS - Comprehensive Project Specifications

## 1. Project Overview
**Vortex POS** is a high-performance, production-ready Point of Sale and Accounting system designed for Retail and Wholesale businesses. It features real-time inventory tracking, complex financial ledger management for suppliers/clients, and an optimized reporting engine.

---

## 2. Technical Stack
### Backend:
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **ORM:** Sequelize (supporting PostgreSQL/Supabase and SQLite)
- **Security:** JWT (JSON Web Tokens) for authentication, bcrypt for password hashing.
- **Validation:** Joi for strict API request validation.
- **Printing:** `escpos` and `pdfkit` for professional thermal receipt generation with full Arabic font support.

### Frontend:
- **Structure:** Semantic HTML5
- **Styling:** Vanilla CSS3 with a focus on premium, modern UI (Dark mode optimized, glassmorphism, responsive grids).
- **Logic:** Vanilla JavaScript (ES6+) for maximum performance and minimum bundle size.
- **UI Components:** SweetAlert2 for interactive dialogs, Chart.js for analytics, Flatpickr for date management.

---

## 3. Core Modules & Architecture

### A. Cashier & Order Management
- **Shift-based Logic:** Orders are tied to an `active_business_date` managed in system settings, allowing for accurate end-of-day closings regardless of real-time clock resets.
- **Atomic Serial Generation:** Implements database-level `FOR UPDATE` locks to ensure unique daily serial numbers even under high concurrency.
- **Thermal Printing:** Optimized background worker for PDF receipt generation and USB/Network printing.

### B. Inventory & Recipe System
- **Ingredient Tracking:** Supports complex recipes (e.g., a "Product" deducting multiple "Ingredients" or "Materials").
- **Variants Support:** Handles colors, sizes, and fabrics within a JSON-based variant system.
- **Atomic Deduction:** Uses Sequelize `decrement` operations to prevent stock sync errors during simultaneous sales.

### C. Wholesale Ledger (Merchants)
- **Suppliers & Wholesale Clients:** Complete financial tracking with balance management.
- **Transaction Safety:** High-concurrency balance updates protected by Row-Level Locking to ensure financial integrity.
- **Ledger Export:** Comprehensive transaction history with CSV/Excel export capabilities.

### D. Expenses & Accounting
- **Category Management:** Categorized expense tracking (Salaries, Rent, Supplies, etc.).
- **Real-time Stats:** Automatic calculation of daily and monthly totals with payment method breakdowns.

### E. Reporting & Closing Engine
- **Parallel Query Optimization:** Aggregates totals (Sales, Expenses, Profits) using `Promise.all` to reduce latency by up to 70%.
- **Daily/Monthly Summaries:** Detailed performance metrics including top-selling items and revenue by category.

---

## 4. Stability & Performance Features
- **Race Condition Prevention:** Critical paths (Inventory, Serial Numbers, Merchant Balances) are wrapped in managed database transactions with explicit locking.
- **Database Indexing:** Performance-tuned indexes on `businessDate`, `payment_status`, and `createdAt` for sub-second query execution even with 100k+ records.
- **Auto-Backup System:** Scheduled 12-hour SQLite backups with automated cleanup to ensure zero data loss.
- **Stress Tested:** Validated under "Burst Attack" scenarios (50+ simultaneous orders and 30+ concurrent wholesale transactions) with 100% data accuracy.

---

## 5. Security & RBAC
- **Roles:** `manager` (Full Access) and `cashier` (Restricted Access - Orders/Inventory only).
- **Middleware:** Token-based authorization for all API routes.

---

## 6. Installation & Deployment
- Supports direct deployment on local servers or cloud providers.
- Requires Supabase/PostgreSQL connection string for the main database.
- Environment-ready via `.env` files for JWT secrets and ports.

---
*Created for Adham Nemr | Bazzez Project*
