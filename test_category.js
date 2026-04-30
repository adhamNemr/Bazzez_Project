const Product = require('./models/Products');
const sequelize = require('./config/db');

async function testCategory() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB');
        
        // Sync the model to ensure the schema is updated
        await Product.sync({ alter: true });
        console.log('✅ Model synced');

        const newCat = 'Summer Collection ' + Math.floor(Math.random() * 1000);
        console.log(`🧪 Testing with new category: ${newCat}`);

        const testProduct = await Product.create({
            name: 'Test Shirt',
            category: newCat,
            price: 250.00,
            wholesalePrice: 180.00,
            sold: 0
        });

        console.log('✅ Product created successfully with NEW category!');
        console.log('📦 Data:', testProduct.toJSON());

        // Cleanup
        await testProduct.destroy();
        console.log('🧹 Test data cleaned up.');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        process.exit();
    }
}

testCategory();
