import dbConnect from './utils/dbConnect';
import Menu from './models/Menu';

async function debug() {
  await dbConnect();
  const menus = await Menu.find({}).lean();
  console.log('MENUS FOUND:', menus.length);
  menus.forEach(m => {
    console.log(`- Menu ID: ${m._id}, Type: ${m.menuType}`);
    console.log(`  Default Customizations:`, JSON.stringify(m.defaultCustomizations, null, 2));
    console.log(`  Categories: ${m.categories?.length}`);
    if (m.categories?.[0]) {
        console.log(`  First Category First Item Customizations:`, JSON.stringify(m.categories[0].items?.[0]?.customizations, null, 2));
    }
  });
  process.exit(0);
}

debug();
