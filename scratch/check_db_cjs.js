const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Mock models and utils since require might fail on ESM files
async function debug() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const Menu = mongoose.models.Menu || mongoose.model('Menu', new mongoose.Schema({ locations: Array }));
        const AffiliateProspect = mongoose.models.AffiliateProspect || mongoose.model('AffiliateProspect', new mongoose.Schema({ phoneHash: String, discountCode: String, discountPercentage: Number, createdAt: Date }));

        // 1. Check Menu Config
        const menu = await Menu.findOne({}).lean();
        console.log('--- MENU CONFIG ---');
        const loc2 = menu.locations.find(l => l.nameId === 'location2');
        console.log('Location 2 AffiliateClub Config:', JSON.stringify(loc2.affiliateClub, null, 2));

        // 2. Check latest prospect
        const latest = await AffiliateProspect.findOne({}).sort({ createdAt: -1 }).lean();
        console.log('--- LATEST PROSPECT ---');
        if (latest) {
            console.log('Phone Hash:', latest.phoneHash);
            console.log('Discount Code:', latest.discountCode);
            console.log('Discount Percentage:', latest.discountPercentage);
            console.log('Created At:', latest.createdAt);
        } else {
            console.log('No prospects found');
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debug();
