require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Menu = require('../models/Menu').default;
  const execMenu = await Menu.findOne({ menuType: 'executive' }).lean();
  const stdMenu = await Menu.findOne({ 
    $or: [{ menuType: 'standard' }, { menuType: { $exists: false } }, { menuType: null }] 
  }).lean();
  
  if (!execMenu) { console.log('No executive menu found'); process.exit(0); }
  
  console.log('=== EXECUTIVE MENU ===');
  console.log('Categories:', execMenu.categories?.length || 0);
  
  for (const cat of execMenu.categories || []) {
    console.log('');
    console.log(`--- Category: ${cat.name} (isActive: ${cat.isActive !== false}) ---`);
    console.log(`  Locations filter: ${JSON.stringify(cat.locations)}`);
    for (const item of cat.items || []) {
      console.log(`  Item: "${item.name}" | prices: ${JSON.stringify(item.prices)}`);
    }
  }
  
  if (stdMenu) {
    console.log('');
    console.log('=== STANDARD MENU (first 3 categories) ===');
    for (const cat of stdMenu.categories?.slice(0, 3) || []) {
      console.log('');
      console.log(`--- Category: ${cat.name} ---`);
      for (const item of cat.items?.slice(0, 2) || []) {
        console.log(`  Item: "${item.name}" | prices: ${JSON.stringify(item.prices)}`);
      }
    }
  }
  
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
