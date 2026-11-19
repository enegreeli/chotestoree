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
    const body = await req.json();

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: body.code ? body.code.trim().toUpperCase() : undefined,
        discountType: body.discountType,
        discountValue: body.discountValue !== undefined ? parseFloat(body.discountValue) : undefined,
        minPurchaseValue: body.minPurchaseValue !== undefined ? parseFloat(body.minPurchaseValue) : undefined,
        maxUses: body.maxUses !== undefined ? (body.maxUses ? parseInt(body.maxUses, 10) : null) : undefined,
        expiresAt: body.expiresAt !== undefined ? (body.expiresAt ? new Date(body.expiresAt) : null) : undefined,
        isActive: body.isActive !== undefined ? !!body.isActive : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      coupon,
      snapshot: storeDb.getRawData(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar cupom' }, { status: 400 });
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
    await prisma.coupon.delete({ where: { id } });
    return NextResponse.json({
      success: true,
      message: 'Cupom excluído com sucesso',
      snapshot: storeDb.getRawData(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir cupom' }, { status: 500 });
  }
}

