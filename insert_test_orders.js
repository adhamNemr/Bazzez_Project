const sequelize = require('./config/db');
const { Order, Customer } = require('./models');

async function insertTestOrders() {
    try {
        console.log("🚀 Starting insertion of comprehensive test orders (JSON Mode)...");

        // Ensure we have a default "Guest" customer for the NOT NULL constraint
        const [guestCustomer] = await Customer.findOrCreate({
            where: { phone: "0000000000" },
            defaults: { name: "عميل نقدي", address: "المحل" }
        });

        // 📅 Get current date for businessDate
        const businessDate = new Date().toLocaleDateString('en-CA');

        // --- 1. Simple Order (No Customer, No Delivery, No Comments) ---
        const details1 = [
            { name: "الفقي جولد", price: 1000, quantity: 1, variant: "جولد 56 S", comments: [] }
        ];
        await Order.create({
            customerId: guestCustomer.id,
            orderTotal: 1000,
            payment_method: "cash",
            payment_status: "Pending",
            deliveryPrice: 0,
            discountAmount: 0,
            businessDate: businessDate,
            orderDetails: JSON.stringify(details1),
            createdAt: new Date()
        });
        console.log("✅ Order 1 (Simple) Inserted.");

        // --- 2. Real Customer + Special Size (Automatic Surcharge) ---
        const [realCustomer] = await Customer.findOrCreate({
            where: { phone: "0123456789" },
            defaults: { name: "أدهم نمير", address: "القاهرة" }
        });
        const details2 = [
            { name: "الفقي جولد", price: 1050, quantity: 1, variant: "جولد 64 2XL - مقاس خاص", comments: [] }
        ];
        await Order.create({
            customerId: realCustomer.id,
            customerName: realCustomer.name,
            customerPhone: realCustomer.phone,
            customerAddress: realCustomer.address,
            orderTotal: 1050,
            payment_method: "card",
            payment_status: "Paid",
            deliveryPrice: 0,
            discountAmount: 0,
            businessDate: businessDate,
            orderDetails: JSON.stringify(details2),
            createdAt: new Date()
        });
        console.log("✅ Order 2 (Customer + Special Size) Inserted.");

        // --- 3. Order with Paid Add-on (Comment with Price) ---
        const details3 = [
            { 
                name: "الفقي فرنساوي", 
                price: 1200, 
                quantity: 1, 
                variant: "فرنساوي 58 L", 
                comments: [{ text: "تعديل تقصير", price: 20 }] 
            }
        ];
        await Order.create({
            customerId: guestCustomer.id,
            orderTotal: 1220,
            payment_method: "instapay",
            payment_status: "Paid",
            deliveryPrice: 0,
            discountAmount: 0,
            businessDate: businessDate,
            orderDetails: JSON.stringify(details3),
            createdAt: new Date()
        });
        console.log("✅ Order 3 (Paid Add-on) Inserted.");

        // --- 4. Order with Discount + Free Comment ---
        const details4 = [
            { 
                name: "الباز مسك", 
                price: 1100, 
                quantity: 1, 
                variant: "مسك 60 XL", 
                comments: [
                    { text: "خصم عميل مميز", price: -50, isDiscount: true },
                    { text: "تغليف هدية", price: 0 }
                ] 
            }
        ];
        await Order.create({
            customerId: guestCustomer.id,
            orderTotal: 1050,
            payment_method: "vodafone_cash",
            payment_status: "Paid",
            deliveryPrice: 0,
            discountAmount: 50,
            businessDate: businessDate,
            orderDetails: JSON.stringify(details4),
            createdAt: new Date()
        });
        console.log("✅ Order 4 (Discount + Free Comment) Inserted.");

        // --- 5. Full Combo (2 Items + Delivery + Special Size) ---
        const details5 = [
            { name: "الفقي جولد", price: 1050, quantity: 1, variant: "جولد 64 M - مقاس خاص", comments: [] },
            { name: "الباز جولد", price: 900, quantity: 1, variant: "جولد 58 L", comments: [] }
        ];
        await Order.create({
            customerId: realCustomer.id,
            customerName: realCustomer.name,
            customerPhone: realCustomer.phone,
            customerAddress: realCustomer.address,
            orderTotal: 1980,
            payment_method: "cash",
            payment_status: "Pending",
            deliveryPrice: 30,
            discountAmount: 0,
            businessDate: businessDate,
            orderDetails: JSON.stringify(details5),
            createdAt: new Date()
        });
        console.log("✅ Order 5 (Full Combo) Inserted.");

        console.log("\n✨ All test orders successfully inserted (JSON format)!");
        console.log("Check the 'Manage Orders' page to review them.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to insert test orders:", error);
        process.exit(1);
    }
}

insertTestOrders();
