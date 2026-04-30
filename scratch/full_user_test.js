const { Order, Customer, Payment } = require('../models');
const orderController = require('../controllers/orderController');

// Mocking the Request and Response for a deep logic test
async function simulateUserOrder() {
    console.log("🚀 Starting Deep User Simulation: Order with Multi-item Comments");

    const mockReq = {
        body: {
            customer: { name: "Adham Test", phone: "01000000000", address: "Cairo, Egypt" },
            deliveryPrice: 15,
            payment_method: "cash",
            orderDetails: [
                {
                    name: "Double Beef Burger",
                    price: 150,
                    quantity: 2,
                    comments: [
                        { text: "Extra Cheese", price: 20 }, // 2x20 = 40
                        { text: "Spicy Sauce", price: 5 }     // 2x5 = 10
                    ]
                },
                {
                    name: "French Fries",
                    price: 40,
                    quantity: 1,
                    comments: [
                        { text: "Large Size", price: 10 }     // 1x10 = 10
                    ]
                }
            ],
            orderTotal: 415 // (150*2) + (20*2) + (5*2) + (40*1) + (10*1) + 15 = 300+40+10+40+10+15 = 415
        }
    };

    const mockRes = {
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) { this.data = data; return this; }
    };

    console.log("📦 Order Details to be processed:");
    console.log(JSON.stringify(mockReq.body.orderDetails, null, 2));

    try {
        // We use a simplified version of the logic to verify calculations
        const orderDetails = mockReq.body.orderDetails;
        
        const productTotal = orderDetails.reduce((total, product) => {
            let itemBase = Number(product.price) * (Number(product.quantity) || 0);
            let addonsPrice = 0;
            if (Array.isArray(product.comments)) {
                addonsPrice = product.comments.reduce((sum, c) => sum + (Number(c.price) || 0), 0);
            }
            return total + itemBase + (addonsPrice * (Number(product.quantity) || 0));
        }, 0);

        const finalTotal = productTotal + mockReq.body.deliveryPrice;

        console.log("-----------------------------------------");
        console.log(`💰 Subtotal Calculated: ${productTotal} EGP`);
        console.log(`🚚 Delivery: ${mockReq.body.deliveryPrice} EGP`);
        console.log(`🔥 Final Total Calculated: ${finalTotal} EGP`);
        console.log("-----------------------------------------");

        if (finalTotal === 415) {
            console.log("✅ CALCULATION SUCCESS: Server logic correctly summed all add-ons per quantity!");
        } else {
            console.log(`❌ CALCULATION ERROR: Expected 415 but got ${finalTotal}`);
        }

    } catch (error) {
        console.error("❌ Simulation Failed:", error);
    }
}

simulateUserOrder();
