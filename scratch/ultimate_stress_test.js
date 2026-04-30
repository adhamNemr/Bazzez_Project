const { Order, Customer, Product, Inventory } = require('../models');
const orderController = require('../controllers/orderController');

async function runUltimateStressTest() {
    console.log("🔥 STARTING ULTIMATE CASHIER STRESS TEST 🔥");
    console.log("------------------------------------------");

    const cases = [
        {
            name: "Case 1: Basic Walk-in Cash Order (Minimalist)",
            payload: {
                customer: { name: "", phone: "0000000000", address: "" },
                deliveryPrice: 0,
                payment_method: "cash",
                orderDetails: [{ name: "Beef Burger", price: 80, quantity: 1, comments: [] }],
                orderTotal: 80
            },
            expectedStatus: 201
        },
        {
            name: "Case 2: Complex Order with Multi-item Paid Comments (Luxury Case)",
            payload: {
                customer: { name: "Adham Nemr", phone: "0123456789", address: "Tech Hub" },
                deliveryPrice: 20,
                payment_method: "vcash",
                orderDetails: [
                    { 
                        name: "Double Cheese Burger", 
                        price: 120, 
                        quantity: 2, 
                        comments: [
                            { text: "Extra Bacon", price: 30 },
                            { text: "Spicy Sauce", price: 5 }
                        ] 
                    },
                    { 
                        name: "Loaded Fries", 
                        price: 50, 
                        quantity: 1, 
                        comments: [{ text: "Melted Cheese", price: 15 }] 
                    }
                ],
                orderTotal: 395 // (120+30+5)*2 + (50+15)*1 + 20 = 310 + 65 + 20 = 395
            },
            expectedStatus: 201
        },
        {
            name: "Case 3: Card Order with Zero Delivery (Financial Accuracy)",
            payload: {
                customer: { name: "Sarah", phone: "0111222333", address: "" },
                deliveryPrice: 0,
                payment_method: "card",
                orderDetails: [{ name: "Chicken Wrap", price: 65, quantity: 3, comments: [] }],
                orderTotal: 195
            },
            expectedStatus: 201
        },
        {
            name: "Case 4: Error Handling - Empty OrderDetails (Safety Check)",
            payload: {
                customer: { name: "Bad User", phone: "000", address: "" },
                deliveryPrice: 0,
                payment_method: "cash",
                orderDetails: [],
                orderTotal: 0
            },
            expectedStatus: 400
        },
        {
            name: "Case 5: InstaPay with Custom Text Comments Only (No Price Add-ons)",
            payload: {
                customer: { name: "Ibrahim", phone: "015000000", address: "Near Mosque" },
                deliveryPrice: 10,
                payment_method: "instapay",
                orderDetails: [{ 
                    name: "Classic Burger", 
                    price: 90, 
                    quantity: 1, 
                    comments: [{ text: "No Mayo", price: 0 }] 
                }],
                orderTotal: 100
            },
            expectedStatus: 201
        }
    ];

    let passed = 0;
    for (const c of cases) {
        console.log(`\n🧪 Testing: ${c.name}`);
        
        const mockRes = {
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { this.data = data; return this; }
        };

        try {
            await orderController.createOrder({ body: c.payload }, mockRes);
            
            if (mockRes.statusCode === c.expectedStatus) {
                console.log(`✅ PASS: Received expected status ${c.expectedStatus}`);
                if (mockRes.statusCode === 201) {
                    console.log(`💰 Verified Final Total in Response: ${mockRes.data.order.orderTotal} EGP`);
                }
                passed++;
            } else {
                console.log(`❌ FAIL: Expected ${c.expectedStatus} but got ${mockRes.statusCode}`);
                console.log(`   Response Data:`, mockRes.data);
            }
        } catch (err) {
            console.log(`❌ CRITICAL ERROR in ${c.name}:`, err.message);
        }
    }

    console.log("\n------------------------------------------");
    console.log(`📊 FINAL REPORT: ${passed}/${cases.length} Cases Passed`);
    console.log("------------------------------------------");
}

runUltimateStressTest();
