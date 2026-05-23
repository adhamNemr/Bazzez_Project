const request = require('supertest');
const app = require('../server');
const { User, Order, DailyClosing, MonthlyClosing, Product, Inventory, Customer, sequelize } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

describe('Order Cancellation Closing Sync API', () => {
    let token;
    let managerToken;

    beforeAll(async () => {
        await sequelize.sync({ force: true });

        // Create user
        const hashedPassword = await bcrypt.hash('password123', 10);
        const managerUser = await User.create({
            username: 'manageruser',
            password: hashedPassword,
            role: 'manager'
        });

        managerToken = jwt.sign(
            { id: managerUser.id, username: managerUser.username, role: managerUser.role },
            process.env.JWT_SECRET || 'fallback_secret_for_dev',
            { expiresIn: '1h' }
        );
    });

    afterAll(async () => {
        await sequelize.close();
    });

    it('should update DailyClosing and MonthlyClosing when an order is cancelled', async () => {
        const businessDate = '2026-05-22';
        
        // 1. Create a dummy product
        const product = await Product.create({
            name: 'T-Shirt Test',
            price: 200,
            category: 'Clothes',
            description: 'Test clothing item'
        });

        // Create inventory
        await Inventory.create({
            name: 'T-Shirt Test',
            quantity: 10,
            cost: 100,
            min: 2
        });

        // 2. Create a customer and an order
        const customer = await Customer.create({
            name: 'Customer Test',
            phone: '1234567890'
        });

        const orderDetails = JSON.stringify([{
            name: 'T-Shirt Test',
            quantity: 2,
            price: 200
        }]);

        const order = await Order.create({
            customerId: customer.id,
            customerName: 'Customer Test',
            orderTotal: 400,
            discountAmount: 0,
            payment_method: 'Cash',
            businessDate: businessDate,
            orderDetails: orderDetails,
            isCancelled: 'No'
        });

        // 3. Create DailyClosing & MonthlyClosing records (simulating closed day/month)
        const dailyClosing = await DailyClosing.create({
            closingDate: businessDate,
            totalOrders: 1,
            totalSandwiches: 2,
            totalRevenue: 400,
            totalCost: 200,
            totalExpenses: 50,
            totalEarnings: 150,
            totalDiscount: 0,
            onlinePaymentsTotal: 0
        });

        const monthlyClosing = await MonthlyClosing.create({
            month_year: '2026-05',
            total_orders: 1,
            total_sandwiches: 2,
            total_revenue: 400,
            total_cost: 200,
            totalExpenses: 50,
            total_earnings: 150,
            totalDiscount: 0,
            onlinePaymentsTotal: 0
        });

        // 4. Cancel the order via API
        const res = await request(app)
            .put(`/api/orders/${order.id}/cancel`)
            .set('Authorization', `Bearer ${managerToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);

        // 5. Verify the order is cancelled
        const updatedOrder = await Order.findByPk(order.id);
        expect(updatedOrder.isCancelled).toBe('Yes');

        // 6. Verify DailyClosing totals are updated (decremented to 0)
        const updatedDailyClosing = await DailyClosing.findOne({ where: { closingDate: new Date(businessDate) } });
        expect(Number(updatedDailyClosing.totalOrders)).toBe(0);
        expect(Number(updatedDailyClosing.totalSandwiches)).toBe(0);
        expect(Number(updatedDailyClosing.totalRevenue)).toBe(0);
        expect(Number(updatedDailyClosing.totalCost)).toBe(0);
        expect(Number(updatedDailyClosing.totalEarnings)).toBe(-50); // revenue(0) - cost(0) - expenses(50)

        // 7. Verify MonthlyClosing totals are updated (decremented to 0)
        const updatedMonthlyClosing = await MonthlyClosing.findOne({ where: { month_year: '2026-05' } });
        expect(Number(updatedMonthlyClosing.total_orders)).toBe(0);
        expect(Number(updatedMonthlyClosing.total_sandwiches)).toBe(0);
        expect(Number(updatedMonthlyClosing.total_revenue)).toBe(0);
        expect(Number(updatedMonthlyClosing.total_cost)).toBe(0);
        expect(Number(updatedMonthlyClosing.total_earnings)).toBe(-50); // revenue(0) - cost(0) - expenses(50)
    });
});
