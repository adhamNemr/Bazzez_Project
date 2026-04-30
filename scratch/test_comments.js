const { applyAutomaticDiscount } = require('./controllers/orderController');

async function testCommentLogic() {
    console.log("🧪 Testing Comment & Add-on Logic...");
    
    const orderDetails = [
        {
            name: "Beef Burger",
            price: 100,
            quantity: 2,
            comments: [
                { text: "Extra Cheese", price: 10 },
                { text: "No Onion", price: 0 }
            ]
        }
    ];

    // Current logic in controller (Line 107 in orderController.js)
    const productTotal = orderDetails.reduce((total, product) => {
        let base = product.price * product.quantity;
        // Check if logic handles comments...
        return total + base;
    }, 0);

    console.log(`- Base Product Total: ${productTotal} EGP`);
    console.log(`- Expected Total (with 2x10 cheese): 220 EGP`);
    
    if (productTotal !== 220) {
        console.log("❌ BUG FOUND: Add-on prices are NOT being calculated on server-side!");
    } else {
        console.log("✅ Server-side calculation is correct.");
    }
}

testCommentLogic();
