const { User } = require('./models');
const jwt = require('jsonwebtoken');
const secretKey = 'mySuperSecretKey123'; // matches authMiddleware.js

async function test() {
  try {
    const user = await User.findOne({ where: { username: 'admin' } });
    if (!user) return console.log("No admin user found");
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, secretKey, { expiresIn: '1h' });
    
    const res = await fetch('http://localhost:8083/api/products/beef', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data length:", data.length);
    console.log("First item:", data[0]);
  } catch (e) {
    console.error(e);
  }
}
test();
