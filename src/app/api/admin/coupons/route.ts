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

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, coupons });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar cupons' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isStaffOrAdmin(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const {
      code,
      discountType, // PERCENTAGE, FIXED, FREE_SHIPPING
      discountValue,
      minPurchaseValue,
      maxUses,
      expiresAt,
      isActive,
    } = await req.json();

    if (!code || !discountType) {
      return NextResponse.json({ error: 'Código e tipo de desconto são obrigatórios' }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: parseFloat(discountValue) || 0,
        minPurchaseValue: parseFloat(minPurchaseValue) || 0,
        maxUses: maxUses ? parseInt(maxUses, 10) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== undefined ? !!isActive : true,
      },
    });

    return NextResponse.json({
      success: true,
      coupon,
      snapshot: storeDb.getRawData(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao criar cupom' }, { status: 400 });
  }
}

