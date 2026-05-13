const request = require('supertest');
const app = require('../server');
const { User, sequelize } = require('../models');
const bcrypt = require('bcryptjs');

describe('Authentication API', () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        
        // Create a test user
        const hashedPassword = await bcrypt.hash('password123', 10);
        await User.create({
            username: 'testuser',
            password: hashedPassword,
            role: 'admin'
        });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    it('should login successfully with correct credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'testuser',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.success).toBe(true);
    });

    it('should fail with incorrect password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'testuser',
                password: 'wrongpassword'
            });

        expect(res.statusCode).toEqual(401);
        expect(res.body.success).toBeUndefined();
    });

    it('should fail with non-existent user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'nonexistent',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(401);
    });
});
