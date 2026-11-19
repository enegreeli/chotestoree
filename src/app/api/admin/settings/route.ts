import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isStaffOrAdmin } from '@/lib/auth';
import { storeDb } from '@/lib/storeDb';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isStaffOrAdmin(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const rawSettings = await prisma.storeSetting.findMany();
    const settings: Record<string, string> = {};
    rawSettings.forEach((s) => {
      settings[s.key] = s.value;
    });

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administradores podem alterar configurações globais' }, { status: 403 });
    }

    const updates = await req.json(); // Record<string, string>

    for (const [key, value] of Object.entries(updates)) {
      await prisma.storeSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
      snapshot: storeDb.getRawData(),
    });
  } catch (error: any) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 });
  }
}

