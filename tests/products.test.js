const request = require('supertest');
const app = require('../server');
const { User, Product, sequelize } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

describe('Products API', () => {
    let token;

    beforeAll(async () => {
        await sequelize.sync({ force: true });
        
        // Create an admin user to get token
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const user = await User.create({
            username: 'adminuser',
            password: hashedPassword,
            role: 'admin'
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

    it('should add a new product', async () => {
        const res = await request(app)
            .post('/api/products/add')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Burger Test',
                price: 150,
                category: 'Burgers',
                description: 'Tasty burger for test'
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body.product.name).toBe('Burger Test');
    });

    it('should get all products (categorized)', async () => {
        const res = await request(app)
            .get('/api/products')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('Burgers');
        expect(res.body.Burgers.length).toBeGreaterThan(0);
    });

    it('should get products by category', async () => {
        const res = await request(app)
            .get('/api/products/Burgers')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0].category).toBe('Burgers');
    });

    it('should update a product', async () => {
        const productsRes = await request(app)
            .get('/api/products/Burgers')
            .set('Authorization', `Bearer ${token}`);
        const product = productsRes.body[0];

        const res = await request(app)
            .put(`/api/products/${product.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Updated Burger',
                price: 175,
                category: 'Burgers',
                description: 'Even better burger'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.product.name).toBe('Updated Burger');
    });

    it('should delete a product', async () => {
        const productsRes = await request(app)
            .get('/api/products/Burgers')
            .set('Authorization', `Bearer ${token}`);
        const product = productsRes.body[0];

        const res = await request(app)
            .delete(`/api/products/${product.id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
    });
});
