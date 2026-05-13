const request = require('supertest');
const app = require('../server');
const { User, Expense, sequelize } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

describe('Expenses API', () => {
    let token;

    beforeAll(async () => {
        await sequelize.sync({ force: true });
        
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const user = await User.create({
            username: 'manageruser',
            password: hashedPassword,
            role: 'manager'
        });

        token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret_for_dev',
            { expiresIn: '1h' }
        );
    });

    afterAll(async () => {
        await sequelize.close();
    });

    it('should create a new expense', async () => {
        const res = await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${token}`)
            .send({
                amount: 500,
                description: 'Electricity Bill',
                category: 'Utilities',
                payment_method: 'cash',
                date: new Date().toLocaleDateString('en-CA')
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body.expense).toBeDefined();
    });

    it('should get all expenses', async () => {
        const res = await request(app)
            .get('/api/expenses')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('expenses');
        expect(Array.isArray(res.body.expenses)).toBe(true);
    });
});
