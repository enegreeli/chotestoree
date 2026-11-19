import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isStaffOrAdmin } from '@/lib/auth';
import { storeDb } from '@/lib/storeDb';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isStaffOrAdmin(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { sku: { contains: search } },
        { team: { contains: search } },
        { barcode: { contains: search } },
      ];
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        images: { orderBy: { order: 'asc' } },
        sizes: { orderBy: { size: 'asc' } },
      },
    });

    const formatted = products.map((p: any) => {
      const totalStock = (p.sizes || []).reduce((acc: number, s: any) => acc + (s.stock || 0), 0);
      const margin = p.price > 0 ? ((p.price - p.acquisitionCost) / p.price) * 100 : 0;
      return {
        ...p,
        totalStock,
        profitMargin: Math.round(margin * 10) / 10,
      };
    });

    return NextResponse.json({ success: true, count: formatted.length, products: formatted });
  } catch (error: any) {
    console.error('Admin products fetch error:', error);
    return NextResponse.json({ error: 'Erro ao listar produtos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isStaffOrAdmin(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

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
      images, // array of url strings
      sizes, // array of { size, stock, minStock }
    } = body;

    if (!name || price === undefined || price === null || price === '') {
      return NextResponse.json({ error: 'Preencha pelo menos o Nome e o Preço do produto.' }, { status: 400 });
    }

    const finalSku = (sku && sku.trim())
      ? sku.trim().toUpperCase()
      : `CK-${Date.now().toString(36).toUpperCase()}`;

    // Resolve or auto-create category if missing
    let targetCategoryId = categoryId;
    if (!targetCategoryId) {
      const firstCat = await prisma.category.findFirst();
      if (firstCat) {
        targetCategoryId = firstCat.id;
      } else {
        const createdCat = await prisma.category.create({
          data: {
            name: 'Geral',
            slug: 'geral',
            description: 'Categoria Padrão da Loja',
            isActive: true,
            sortOrder: 0,
          },
        });
        targetCategoryId = createdCat.id;
      }
    }

    // Slug generation
    let slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existingSlug = await prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name,
          slug,
          sku: finalSku,
          barcode: barcode || null,
          description: description || '',
          categoryId: targetCategoryId,
          brand: brand || '',
          team: team || '',
          country: country || 'Internacional',
          season: season || '2024/2025',
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
          images: {
            create: (images || []).map((url: string, index: number) => ({
              url,
              isPrimary: index === 0,
              order: index,
            })),
          },
          sizes: {
            create: (sizes && sizes.length > 0 ? sizes : [
              { size: 'P', stock: 0, minStock: 2 },
              { size: 'M', stock: 0, minStock: 2 },
              { size: 'G', stock: 0, minStock: 2 },
              { size: 'GG', stock: 0, minStock: 2 },
            ]).map((s: any) => ({
              size: s.size,
              stock: parseInt(s.stock, 10) || 0,
              minStock: parseInt(s.minStock, 10) || 2,
            })),
          },
        },
        include: {
          sizes: true,
          images: true,
        },
      });

      // Register initial stock movements for sizes with stock > 0
      for (const s of created.sizes) {
        if (s.stock > 0) {
          await tx.stockMovement.create({
            data: {
              productId: created.id,
              sizeStockId: s.id,
              size: s.size,
              type: 'ENTRADA',
              quantity: s.stock,
              previousStock: 0,
              newStock: s.stock,
              reason: 'Cadastro inicial do produto',
              createdById: user.id,
            },
          });
        }
      }

      return created;
    });

    return NextResponse.json({
      success: true,
      product,
      snapshot: storeDb.getRawData(),
    });
  } catch (error: any) {
    console.error('Admin create product error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao cadastrar produto' }, { status: 400 });
  }
}
