const { exec } = require('child_process');

// ✅ دالة لإعادة تشغيل السيرفر
exports.restartServer = (req, res) => {
    try {
        console.log('🚀 Restarting server...');

        // ✅ إعادة تشغيل البرنامج بالكامل (Electron Relaunch)
        try {
            const { app } = require('electron');
            if (app) {
                console.log('♻️ Relaunching Electron app...');
                app.relaunch();
                app.exit(0);
                return res.json({ message: 'System relaunching...' });
            }
        } catch (e) {
            console.log('⚠️ Not in Electron, just exiting process.');
            process.exit(0);
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error);
        res.status(500).json({ message: 'Unexpected error during server restart' });
    }
};