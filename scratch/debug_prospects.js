const mongoose = require('mongoose');
const dbConnect = require('./utils/dbConnect').default;
const AffiliateProspect = require('./models/AffiliateProspect').default;

async function debug() {
    await dbConnect();
    const prospects = await AffiliateProspect.find({}).sort({ createdAt: -1 }).limit(5).lean();
    console.log(JSON.stringify(prospects, null, 2));
    process.exit(0);
}

debug();
