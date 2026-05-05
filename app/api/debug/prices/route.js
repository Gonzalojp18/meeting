import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';

export async function GET() {
  await dbConnect();
  
  const execMenu = await Menu.findOne({ menuType: 'executive' }).lean();
  const stdMenu = await Menu.findOne({ 
    $or: [{ menuType: 'standard' }, { menuType: { $exists: false } }, { menuType: null }] 
  }).lean();
  
  const result = {};
  
  if (execMenu) {
    result.executive = {
      totalCategories: execMenu.categories?.length || 0,
      categories: (execMenu.categories || []).map(cat => ({
        name: cat.name,
        isActive: cat.isActive !== false,
        locations: cat.locations,
        totalItems: cat.items?.length || 0,
        items: (cat.items || []).map(item => ({
          name: item.name,
          prices: item.prices,
        })),
      })),
    };
  }
  
  if (stdMenu) {
    result.standard = {
      totalCategories: stdMenu.categories?.length || 0,
      categories: (stdMenu.categories || []).map(cat => ({
        name: cat.name,
        isActive: cat.isActive !== false,
        locations: cat.locations,
        totalItems: cat.items?.length || 0,
        items: (cat.items || []).map(item => ({
          name: item.name,
          prices: item.prices,
        })),
      })),
    };
  }
  
  return NextResponse.json(result);
}
