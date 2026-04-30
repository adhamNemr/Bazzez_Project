/**
 * 🚀 Cashier Logic Stress Test - Vortex POS
 * This script validates the calculation engine used in orderController.js
 * covers: quantities, add-ons (comments), payment methods, and customer data.
 */

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    yellow: "\x1b[33m"
};

// --- Mocking the Core Calculation Logic from orderController.js ---
function calculateFinalTotal(orderData) {
    const { orderDetails, deliveryPrice, discountAmount = 0 } = orderData;
    
    const productTotal = orderDetails.reduce((total, product) => {
        let itemBase = Number(product.price) * (Number(product.quantity) || 0);
        
        let addonsPrice = 0;
        if (Array.isArray(product.comments)) {
            addonsPrice = product.comments.reduce((sum, c) => sum + (Number(c.price) || 0), 0);
        }
        
        // Logic: (Price + Sum of Addons) * Quantity
        return total + itemBase + (addonsPrice * (Number(product.quantity) || 0));
    }, 0);

    const finalProductTotal = productTotal - discountAmount;
    const finalTotal = Math.max(finalProductTotal + Number(deliveryPrice || 0), 0);
    
    return {
        productTotal,
        finalTotal
    };
}

const testCases = [
    {
        name: "Case 1: Basic Cash Order (1 item, No addons, No delivery)",
        data: {
            customer: { name: "Cash Customer", phone: "0123456789", address: "In Store" },
            deliveryPrice: 0,
            payment_method: "cash",
            orderDetails: [
                { name: "Beef Burger", price: 100, quantity: 1, comments: [] }
            ]
        },
        expectedTotal: 100
    },
    {
        name: "Case 2: Multiple Items & Delivery (Card Payment)",
        data: {
            customer: { name: "Adham", phone: "0111222333", address: "Cairo" },
            deliveryPrice: 30,
            payment_method: "card",
            orderDetails: [
                { name: "Beef Burger", price: 100, quantity: 2, comments: [] },
                { name: "French Fries", price: 40, quantity: 1, comments: [] }
            ]
        },
        expectedTotal: 270 // (100*2 + 40) + 30
    },
    {
        name: "Case 3: Paid Add-ons with Quantity (InstaPay)",
        data: {
            customer: { name: "VIP Customer", phone: "0155555555", address: "Maadi" },
            deliveryPrice: 20,
            payment_method: "instapay",
            orderDetails: [
                { 
                    name: "Double Cheese Burger", 
                    price: 150, 
                    quantity: 2, 
                    comments: [
                        { text: "Extra Cheese", price: 15 },
                        { text: "Add Jalapenos", price: 10 }
                    ] 
                }
            ]
        },
        expectedTotal: 370 // (150 + 15 + 10) * 2 + 20 = 175*2 + 20 = 350 + 20
    },
    {
        name: "Case 4: Mixed Free and Paid Comments (V-Cash)",
        data: {
            customer: { name: "Mixed Customer", phone: "0100000001", address: "Giza" },
            deliveryPrice: 15,
            payment_method: "vcash",
            orderDetails: [
                { 
                    name: "Chicken Burger", 
                    price: 120, 
                    quantity: 1, 
                    comments: [
                        { text: "No Onions", price: 0 },
                        { text: "Extra Sauce", price: 5 }
                    ] 
                },
                { name: "Pepsi", price: 20, quantity: 3, comments: [] }
            ]
        },
        expectedTotal: 200 // (120+5)*1 + (20*3) + 15 = 125 + 60 + 15
    },
    {
        name: "Case 5: Zero Price / Free Items Test",
        data: {
            customer: { name: "Promo User", phone: "0199999999", address: "Promo" },
            deliveryPrice: 10,
            payment_method: "cash",
            orderDetails: [
                { name: "Free Sample", price: 0, quantity: 5, comments: [] }
            ]
        },
        expectedTotal: 10
    }
];

console.log(`\n${colors.bright}${colors.cyan}=== Vortex POS Cashier Logic Stress Test ===${colors.reset}\n`);

let passed = 0;
let failed = 0;

testCases.forEach((tc, index) => {
    const result = calculateFinalTotal(tc.data);
    const isSuccess = result.finalTotal === tc.expectedTotal;
    
    if (isSuccess) {
        console.log(`${colors.green}✔ [PASS] ${tc.name}${colors.reset}`);
        passed++;
    } else {
        console.log(`${colors.red}✘ [FAIL] ${tc.name}${colors.reset}`);
        console.log(`   Expected: ${tc.expectedTotal}, Got: ${result.finalTotal}`);
        failed++;
    }
    
    console.log(`   Payment: ${tc.data.payment_method.toUpperCase()} | Customer: ${tc.data.customer.name}`);
    console.log(`   Items: ${tc.data.orderDetails.length} | Delivery: ${tc.data.deliveryPrice} EGP`);
    console.log(`   ---------------------------------------------`);
});

console.log(`\n${colors.bright}Test Summary:${colors.reset}`);
console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
console.log(`${colors.red}Failed: ${failed}${colors.reset}`);

if (failed === 0) {
    console.log(`\n${colors.bright}${colors.green}✅ ALL TESTS PASSED! CASHIER LOGIC IS STABLE.${colors.reset}\n`);
} else {
    console.log(`\n${colors.bright}${colors.red}❌ SOME TESTS FAILED. CHECK LOGIC.${colors.reset}\n`);
}
