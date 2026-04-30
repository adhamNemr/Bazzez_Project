const { Product } = require('./models');
async function test() {
  const prods = await Product.findAll();
  console.log(prods.map(p => ({ id: p.id, name: p.name, category: p.category })));
}
test();
