import dbConnect from '../utils/dbConnect';
import Menu from '../models/Menu';
import AffiliateProspect from '../models/AffiliateProspect';

async function debug() {
    try {
        await dbConnect();
        
        // 1. Check Menu Config
        const menu = await Menu.findOne({ 
            $or: [{ menuType: 'standard' }, { menuType: { $exists: false } }, { menuType: null }] 
        }).lean();
        
        console.log('--- MENU CONFIG ---');
        const loc2 = menu.locations.find(l => l.nameId === 'location2');
        console.log('Location 2 AffiliateClub Config:', JSON.stringify(loc2.affiliateClub, null, 2));

        // 2. Check latest prospect
        const latest = await AffiliateProspect.findOne({}).sort({ createdAt: -1 }).lean();
        console.log('--- LATEST PROSPECT ---');
        console.log('Phone Hash:', latest.phoneHash);
        console.log('Discount Code:', latest.discountCode);
        console.log('Discount Percentage:', latest.discountPercentage);
        
        // 3. OPTIONAL: Delete specific prospect to allow re-testing
        // await AffiliateProspect.deleteOne({ phoneHash: '...' });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debug();
