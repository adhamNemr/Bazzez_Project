const sequelize = require('./config/db');
const { Product, Inventory } = require('./models');

const menProducts = [
    {
        name: "الفقي",
        category: "جلباب رجالي",
        variants: [
            { name: "جولد", price: 1000 },
            { name: "جولد ملوك", price: 1000 },
            { name: "جولد سحاب", price: 1000 },
            { name: "جولد اساور", price: 1100 },
            { name: "فرنساوي", price: 1200 },
            { name: "فرنساوي اساور", price: 1300 },
            { name: "موهير", price: 1350 },
            { name: "دونير", price: 1300 },
            { name: "بيكا", price: 900 },
            { name: "السلطان", price: 900 },
            { name: "دبي ابيض", price: 1200 }
        ]
    },
    {
        name: "الباز",
        category: "جلباب رجالي",
        variants: [
            { name: "مسك", price: 1100 },
            { name: "خليه", price: 1000 },
            { name: "كريستال", price: 1000 },
            { name: "فهد", price: 1000 },
            { name: "رافد", price: 1150 },
            { name: "جولد", price: 900 },
            { name: "أطلاله", price: 1100 },
            { name: "سوداني كشمير", price: 900 }
        ]
    },
    {
        name: "الأصل العربي",
        category: "جلباب رجالي",
        variants: [
            { name: "7772", price: 1250 },
            { name: "ابيض", price: 1200 },
            { name: "نص كم", price: 800 }
        ]
    },
    {
        name: "العز",
        category: "جلباب رجالي",
        variants: [
            { name: "نص كم فخامه", price: 700 },
            { name: "نص كم زمزم", price: 750 },
            { name: "نص كم تميز - صفا", price: 650 },
            { name: "نص كم روعه مطعم", price: 650 },
            { name: "نص كم فخامه سبعه", price: 700 },
            { name: "نص كم نص لياقه روعه", price: 750 },
            { name: "سوداني جولد", price: 850 },
            { name: "شعراوي جولد", price: 800 },
            { name: "شعراوي كتان", price: 750 },
            { name: "فخامه كم طويل", price: 750 }
        ]
    },
    {
        name: "رداء هندام",
        category: "جلباب رجالي",
        variants: [
            { name: "نص كم مطعم", price: 650 },
            { name: "سبن مطرز اساور", price: 1200 },
            { name: "جولد", price: 1000 },
            { name: "جولد 300 جم", price: 1200 },
            { name: "ابيض", price: 1100 },
            { name: "مطعم لياقه", price: 1100 },
            { name: "نص كم مطعم (ثقيل)", price: 1100 }
        ]
    },
    {
        name: "مالك",
        category: "جلباب رجالي",
        variants: [
            { name: "كتان نص كم", price: 450 },
            { name: "نص كم مطعم", price: 450 }
        ]
    },
    {
        name: "سروال الامثل",
        category: "سراويل",
        variants: [
            { name: "عادي", price: 250 }
        ]
    }
];

const ihramProducts = [
    {
        name: "احرام الفاروق",
        category: "ملابس إحرام",
        variants: [
            { name: "1100 جم", price: 800 },
            { name: "1200 جم", price: 850 }
        ]
    },
    {
        name: "احرام زمزم",
        category: "ملابس إحرام",
        variants: [
            { name: "1500 جم", price: 1100 }
        ]
    }
];

const kidsProducts = [
    { 
        name: "جلباب أطفالي مطرز", 
        category: "جلباب أطفالي", 
        variants: [
            { name: "أبيض", price: 450 },
            { name: "كريمي", price: 450 }
        ]
    }
];

const singleProducts = [
    { name: "العزة نص كم", category: "جلباب رجالي", price: 550 },
    { name: "الذهبيه عماني", category: "جلباب رجالي", price: 850 }
];

async function seed() {
    try {
        console.log("🚀 Starting Comprehensive Category Seeding...");

        // Combine all products for the loop
        const allComplexProducts = [...menProducts, ...ihramProducts];
        
        for (const brand of allComplexProducts) {
            const basePrice = brand.variants[0].price;
            
            const [product] = await Product.findOrCreate({
                where: { name: brand.name },
                defaults: {
                    category: brand.category,
                    price: basePrice,
                    wholesalePrice: basePrice
                }
            });
            
            // Sync category in case it changed
            await product.update({ category: brand.category });
            
            const inventoryVariants = brand.variants.map(v => ({
                id: Math.random().toString(36).substr(2, 9),
                name: v.name,
                price: v.price,
                wholesalePrice: v.price,
                quantity: 0
            }));
            
            await Inventory.upsert({
                name: brand.name,
                quantity: 0,
                cost: basePrice,
                total: 0,
                min: 5,
                variants: inventoryVariants
            });
            
            console.log(`✅ Seeded ${brand.category}: ${brand.name}`);
        }
        
        // Seed Kids placeholder
        for (const k of kidsProducts) {
             await Product.findOrCreate({
                where: { name: k.name },
                defaults: { category: k.category, price: k.price, wholesalePrice: k.price }
            });
            console.log(`✅ Seeded Category: ${k.category}`);
        }

        for (const p of singleProducts) {
            await Product.findOrCreate({
                where: { name: p.name },
                defaults: {
                    category: p.category,
                    price: p.price,
                    wholesalePrice: p.price
                }
            });
            
            await Product.update({ category: p.category }, { where: { name: p.name } });

            await Inventory.upsert({
                name: p.name,
                quantity: 0,
                cost: p.price,
                total: 0,
                min: 5,
                variants: []
            });
            console.log(`✅ Seeded Single Product: ${p.name}`);
        }

        console.log("✨ Category Reorganization Complete!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding Failed:", error);
        process.exit(1);
    }
}

seed();
