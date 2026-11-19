import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isStaffOrAdmin } from '@/lib/auth';
import { storeDb } from '@/lib/storeDb';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isStaffOrAdmin(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { order: 'asc' } },
        sizes: { orderBy: { size: 'asc' } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error('Admin product detail error:', error);
    return NextResponse.json({ error: 'Erro ao buscar detalhes do produto' }, { status: 500 });
  }
}

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

    const {
      name,
      sku,
      barcode,
      description,
      categoryId,
      brand,
      team,
      country,
      season,
      modelType,
      supplier,
      acquisitionCost,
      price,
      promoPrice,
      isFeatured,
      isBestSeller,
      isNewRelease,
      isPromo,
      isActive,
      images,
      sizes,
    } = body;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update basic product info
      const prod = await tx.product.update({
        where: { id },
        data: {
          name,
          sku: sku?.trim().toUpperCase(),
          barcode: barcode || null,
          description,
          categoryId,
          brand: brand !== undefined ? brand : '',
          team: team || '',
          country: country || '',
          season: season || '',
          modelType: modelType || 'GRIFE',
          supplier: supplier || null,
          acquisitionCost: parseFloat(acquisitionCost) || 0,
          price: parseFloat(price),
          promoPrice: promoPrice ? parseFloat(promoPrice) : null,
          isFeatured: !!isFeatured,
          isBestSeller: !!isBestSeller,
          isNewRelease: !!isNewRelease,
          isPromo: !!isPromo,
          isActive: isActive !== undefined ? !!isActive : true,
        },
      });

      // 2. Update images if provided
      if (images && Array.isArray(images)) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        for (let i = 0; i < images.length; i++) {
          const url = typeof images[i] === 'string' ? images[i] : images[i].url;
          if (url && url.trim()) {
            await tx.productImage.create({
              data: {
                productId: id,
                url: url.trim(),
                isPrimary: i === 0,
                order: i,
              },
            });
          }
        }
      }

      // 3. Update sizes and stock if provided
      if (sizes && Array.isArray(sizes)) {
        for (const s of sizes) {
          const targetStock = parseInt(s.stock, 10) || 0;
          const targetMin = parseInt(s.minStock, 10) || 2;

          const existing = await tx.productSizeStock.findFirst({
            where: { productId: id, size: s.size },
          });

          if (existing) {
            if (existing.stock !== targetStock) {
              await tx.stockMovement.create({
                data: {
                  productId: id,
                  sizeStockId: existing.id,
                  size: s.size,
                  type: 'AJUSTE',
                  quantity: Math.abs(targetStock - existing.stock),
                  previousStock: existing.stock,
                  newStock: targetStock,
                  reason: 'Ajuste manual via edição do produto',
                  createdById: user.id,
                },
              });
            }

            await tx.productSizeStock.update({
              where: { id: existing.id },
              data: {
                stock: targetStock,
                minStock: targetMin,
              },
            });
          } else {
            const createdSize = await tx.productSizeStock.create({
              data: {
                productId: id,
                size: s.size,
                stock: targetStock,
                minStock: targetMin,
              },
            });

            if (targetStock > 0) {
              await tx.stockMovement.create({
                data: {
                  productId: id,
                  sizeStockId: createdSize.id,
                  size: s.size,
                  type: 'ENTRADA',
                  quantity: targetStock,
                  previousStock: 0,
                  newStock: targetStock,
                  reason: 'Inclusão de novo tamanho no produto',
                  createdById: user.id,
                },
              });
            }
          }
        }
      }

      return prod;
    });

    return NextResponse.json({
      success: true,
      product: updated,
      snapshot: storeDb.getRawData(),
    });
  } catch (error: any) {
    console.error('Admin product update error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar produto' }, { status: 400 });
  }
}

// DELETE: Remove product or archive
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

    // Permanently cascade delete product and all relations
    await prisma.orderItem.deleteMany({ where: { productId: id } });
    await prisma.stockMovement.deleteMany({ where: { productId: id } });
    await prisma.productSizeStock.deleteMany({ where: { productId: id } });
    await prisma.productImage.deleteMany({ where: { productId: id } });
    await prisma.wishlist.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Produto excluído permanentemente com sucesso.',
      snapshot: storeDb.getRawData(),
    });
  } catch (error: any) {
    console.error('Admin delete product error:', error);
    return NextResponse.json({ error: 'Erro ao excluir produto' }, { status: 500 });
  }
}

// POST on [id]: DUPLICATE product
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isStaffOrAdmin(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = params;
    const original = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        sizes: true,
      },
    });

    if (!original) {
      return NextResponse.json({ error: 'Produto original não encontrado' }, { status: 404 });
    }

    const duplicateSuffix = Math.floor(1000 + Math.random() * 9000);
    const newSku = `${original.sku}-COPIA-${duplicateSuffix}`;
    const newSlug = `${original.slug}-copia-${duplicateSuffix}`;
    const newName = `${original.name} (Cópia)`;

    const duplicated = await prisma.product.create({
      data: {
        name: newName,
        slug: newSlug,
        sku: newSku,
        barcode: null,
        description: original.description,
        categoryId: original.categoryId,
        brand: original.brand || '',
        team: original.team,
        country: original.country,
        season: original.season,
        modelType: original.modelType,
        supplier: original.supplier,
        acquisitionCost: original.acquisitionCost,
        price: original.price,
        promoPrice: original.promoPrice,
        isFeatured: false,
        isBestSeller: false,
        isNewRelease: true,
        isPromo: original.isPromo,
        isActive: true,
        images: {
          create: (original.images || []).map((img: any) => ({
            url: img.url,
            isPrimary: img.isPrimary,
            order: img.order,
          })),
        },
        sizes: {
          create: (original.sizes || []).map((s: any) => ({
            size: s.size,
            stock: 0, // start with 0 stock to be populated
            minStock: s.minStock,
          })),
        },
      },
      include: {
        sizes: true,
        images: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Produto duplicado com sucesso!',
      product: duplicated,
    });
  } catch (error: any) {
    console.error('Duplicate product error:', error);
    return NextResponse.json({ error: 'Erro ao duplicar produto' }, { status: 500 });
  }
}

