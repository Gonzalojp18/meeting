import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Menu from '@/models/Menu';

export async function GET() {
  await dbConnect();
  const menus = await Menu.find({ menuType: 'executive' }).lean();
  return NextResponse.json(menus);
}
