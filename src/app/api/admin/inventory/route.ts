import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isStaffOrAdmin } from '@/lib/auth';
import { storeDb } from '@/lib/storeDb';

export const dynamic = 'force-dynamic';

// GET: list inventory items by product & size with search and filter
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isStaffOrAdmin(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // 'all', 'low', 'out', 'category'
    const search = searchParams.get('search');
    const categoryId = searchParams.get('categoryId');

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { sku: { contains: search } },
        { team: { contains: search } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        category: { select: { id: true, name: true } },
        images: { where: { isPrimary: true }, take: 1 },
        sizes: { orderBy: { size: 'asc' } },
      },
    });

    let inventory = products.map((p: any) => {
      const totalStock = (p.sizes || []).reduce((acc: number, s: any) => acc + (s.stock || 0), 0);
      const hasLowStock = (p.sizes || []).some((s: any) => s.stock > 0 && s.stock <= s.minStock);
      const hasOutOfStock = (p.sizes || []).some((s: any) => s.stock === 0);

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        brand: p.brand || '',
        team: p.team,
        category: p.category?.name || '',
        image: p.images?.[0]?.url || '',
        price: p.price,
        acquisitionCost: p.acquisitionCost,
        totalStock,
        hasLowStock,
        hasOutOfStock,
        sizes: (p.sizes || []).map((s: any) => ({
          id: s.id,
          size: s.size,
          stock: s.stock,
          minStock: s.minStock,
          isLow: s.stock > 0 && s.stock <= s.minStock,
          isOut: s.stock === 0,
        })),
      };
    });

    if (filter === 'low') {
      inventory = inventory.filter((i) => i.hasLowStock);
    } else if (filter === 'out') {
      inventory = inventory.filter((i) => i.hasOutOfStock);
    }

    return NextResponse.json(
      { success: true, count: inventory.length, inventory },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Inventory list error:', error);
    return NextResponse.json({ error: 'Erro ao carregar estoque' }, { status: 500 });
  }
}

// POST: Register stock movement (ENTRADA, SAIDA_AVARIA, SAIDA_PERDA, DEVOLUCAO, AJUSTE)
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isStaffOrAdmin(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const {
      productId,
      sizeStockId,
      size,
      type, // ENTRADA, SAIDA_AVARIA, SAIDA_PERDA, DEVOLUCAO, AJUSTE
      quantity, // number to add/remove or absolute target for AJUSTE
      reason,
      notes,
      newMinStock,
    } = await req.json();

    if (!productId || !size) {
      return NextResponse.json({ error: 'Produto e tamanho são obrigatórios' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let sizeStock = await tx.productSizeStock.findFirst({
        where: { productId, size },
      });

      if (!sizeStock) {
        // Create size entry if it didn't exist
        sizeStock = await tx.productSizeStock.create({
          data: {
            productId,
            size,
            stock: 0,
            minStock: newMinStock || 2,
          },
        });
      }

      const previousStock = sizeStock.stock;
      let newStock = previousStock;
      const qtyNumber = parseInt(quantity, 10) || 0;

      if (type === 'ENTRADA' || type === 'DEVOLUCAO') {
        newStock = previousStock + qtyNumber;
      } else if (type === 'SAIDA_AVARIA' || type === 'SAIDA_PERDA' || type === 'SAIDA_VENDA') {
        if (previousStock < qtyNumber) {
          throw new Error(`Estoque insuficiente. Disponível: ${previousStock}, Solicitado: ${qtyNumber}`);
        }
        newStock = previousStock - qtyNumber;
      } else if (type === 'AJUSTE') {
        // Absolute quantity correction
        newStock = Math.max(0, qtyNumber);
      }

      // Update Size Stock
      const updatedSizeStock = await tx.productSizeStock.update({
        where: { id: sizeStock.id },
        data: {
          stock: newStock,
          minStock: newMinStock !== undefined ? parseInt(newMinStock, 10) : sizeStock.minStock,
        },
      });

      // Register Movement Audit Log
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          sizeStockId: sizeStock.id,
          size,
          type,
          quantity: Math.abs(newStock - previousStock),
          previousStock,
          newStock,
          reason: reason || `Movimentação registrada por ${user.name}`,
          notes: notes || null,
          createdById: user.id,
        },
      });

      return { sizeStock: updatedSizeStock, movement };
    });

    return NextResponse.json({
      success: true,
      message: 'Estoque atualizado com sucesso!',
      data: result,
      snapshot: storeDb.getRawData(),
    });
  } catch (error: any) {
    console.error('Inventory movement error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar estoque' }, { status: 400 });
  }
}
