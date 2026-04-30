/**
 * Project Branding Configuration
 * Centralizing values for easy customization by the buyer.
 */
module.exports = {
    restaurantName: process.env.RESTAURANT_NAME || "Vortex POS",
    hotline: process.env.HOTLINE || "01005078132",
    currency: "EGP",
    footerMessage: "شكراً لزيارتكم! نرجو أن تكون تجربتكم سعيدة.",
    printerSettings: {
        type: process.env.PRINTER_TYPE || 'epson',
        interface: process.env.PRINTER_INTERFACE || '//./COM1',
        characterSet: 'PC864_ARABIC' // Trying Arabic code page
    }
};
