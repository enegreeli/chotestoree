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

    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao listar categorias' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isStaffOrAdmin(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { name, slug, description, imageUrl, sortOrder, isActive } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Nome da categoria é obrigatório' }, { status: 400 });
    }

    const finalSlug = slug || name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');

    const category = await prisma.category.create({
      data: {
        name,
        slug: finalSlug,
        description: description || null,
        imageUrl: imageUrl || null,
        sortOrder: parseInt(sortOrder, 10) || 0,
        isActive: isActive !== undefined ? !!isActive : true,
      },
    });

    return NextResponse.json({
      success: true,
      category,
      snapshot: storeDb.getRawData(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao criar categoria' }, { status: 400 });
  }
}

