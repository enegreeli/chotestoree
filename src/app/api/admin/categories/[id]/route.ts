import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isStaffOrAdmin } from '@/lib/auth';
import { storeDb } from '@/lib/storeDb';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isStaffOrAdmin(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = params;
    const { name, slug, description, imageUrl, sortOrder, isActive } = await req.json();

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        imageUrl,
        sortOrder: parseInt(sortOrder, 10) || 0,
        isActive: !!isActive,
      },
    });

    return NextResponse.json({
      success: true,
      category,
      snapshot: storeDb.getRawData(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar categoria' }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isStaffOrAdmin(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = params;

    // If there are products linked to this category, reassign them to another category or create 'Geral'
    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) {
      let otherCat = await prisma.category.findFirst({
        where: { id: { not: id } },
      });

      if (!otherCat) {
        otherCat = await prisma.category.create({
          data: {
            name: 'Geral',
            slug: 'geral',
            description: 'Categoria Geral Padrão',
            isActive: true,
            sortOrder: 0,
          },
        });
      }

      // Reassign products to safe fallback
      const prods = await prisma.product.findMany({ where: { categoryId: id } });
      for (const p of prods) {
        await prisma.product.update({
          where: { id: p.id },
          data: { categoryId: otherCat.id },
        });
      }
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({
      success: true,
      message: 'Categoria excluída com sucesso!',
      snapshot: storeDb.getRawData(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir categoria' }, { status: 500 });
  }
}

