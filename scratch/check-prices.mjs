// Script de diagnóstico — corre con: node scratch/check-prices.mjs
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

await mongoose.connect(process.env.MONGODB_URI);

const Menu = mongoose.model('Menu', new mongoose.Schema({}, { strict: false }));
const menus = await Menu.find({}).lean();

for (const menu of menus) {
  console.log(`\n=== MENU: ${menu.menuType || 'standard'} ===`);
  for (const cat of menu.categories || []) {
    console.log(`\n  Categoría: ${cat.name}`);
    for (const item of cat.items || []) {
      const p = item.prices || {};
      const issues = [];
      for (const loc of ['location1','location2','location3']) {
        if (p[loc] === null || p[loc] === 0) issues.push(`${loc}=${p[loc]}`);
      }
      const flag = issues.length ? ' ❌ CORROMPIDO' : '';
      console.log(`    - ${item.name}: loc1=${p.location1} | loc2=${p.location2} | loc3=${p.location3}${flag}`);
    }
  }
}

await mongoose.disconnect();
console.log('\nDone.');
