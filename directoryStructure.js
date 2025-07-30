const fs = require('fs');
const path = require('path');

function getDirectoryStructure(dirPath) {
    const result = {};

    // قراءة محتويات المجلد
    const items = fs.readdirSync(dirPath);

    items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            // إذا كان العنصر مجلدًا، استدعاء الدالة بشكل متكرر
            result[item] = getDirectoryStructure(fullPath);
        } else {
            // إذا كان العنصر ملفًا، إضافته إلى النتيجة
            result[item] = 'file';
        }
    });

    return result;
}

// استبدل 'your_directory_path' بالمسار الذي تريد استعراضه
const directoryPath = '/Users/adham/Desktop/BAZEZZ/BAZEZZ_STM/pos-system/server';
const structure = getDirectoryStructure(directoryPath);
console.log(JSON.stringify(structure, null, 2));