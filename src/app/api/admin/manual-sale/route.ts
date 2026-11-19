import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isStaffOrAdmin } from '@/lib/auth';
import { storeDb } from '@/lib/storeDb';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isStaffOrAdmin(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const {
      customerName,
      customerEmail,
      customerPhone,
      customerCpf,
      origin, // MANUAL_WHATSAPP, MANUAL_INSTAGRAM, MANUAL_PRESENCIAL
      paymentMethod, // PIX, CREDIT_CARD, DEBIT_CARD, MANUAL_BALCAO
      discount,
      notes,
      items, // array of { productId, size, quantity, unitPrice }
    } = await req.json();

    if (!customerName || !items || items.length === 0) {
      return NextResponse.json({ error: 'Nome do cliente e ao menos 1 item são obrigatórios' }, { status: 400 });
    }

    const order = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const validatedItems: any[] = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            sizes: { where: { size: item.size } },
            images: { where: { isPrimary: true }, take: 1 },
          },
        });

        if (!product) {
          throw new Error(`Produto não encontrado (ID: ${item.productId})`);
        }

        const sizeStock = product.sizes[0];
        if (!sizeStock || sizeStock.stock < item.quantity) {
          throw new Error(
            `Estoque insuficiente para "${product.name}" no tamanho ${item.size}. Disponível: ${sizeStock?.stock || 0}`
          );
        }

        const unitPrice = parseFloat(item.unitPrice) || product.promoPrice || product.price;
        const itemTotal = unitPrice * item.quantity;
        subtotal += itemTotal;

        validatedItems.push({
          productId: product.id,
          productName: product.name,
          productImage: product.images[0]?.url || '',
          size: item.size,
          sizeStockId: sizeStock.id,
          quantity: item.quantity,
          unitPrice,
          costPrice: product.acquisitionCost,
          totalPrice: itemTotal,
          currentStock: sizeStock.stock,
        });
      }

      const discountAmount = parseFloat(discount) || 0;
      const finalTotal = Math.max(0, subtotal - discountAmount);

      const count = await tx.order.count();
      const orderNumber = `#CT-MAN-${1000 + count + 1}`;

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerName,
          customerEmail: customerEmail || 'venda.balcao@chotestore.com',
          customerPhone: customerPhone || '(00) 00000-0000',
          customerCpf: customerCpf || '000.000.000-00',
          shippingAddress: 'Balcão / Retirada Física / WhatsApp',
          zipCode: '00000-000',
          city: 'Local',
          state: 'SP',
          status: 'ENTREGUE',
          paymentMethod: paymentMethod || 'PIX',
          paymentStatus: 'APPROVED',
          origin: origin || 'MANUAL_PRESENCIAL',
          subtotal,
          discount: discountAmount,
          shippingCost: 0,
          total: finalTotal,
          notes: notes || `Venda manual registrada por ${user.name}`,
          items: {
            create: validatedItems.map((vi) => ({
              productId: vi.productId,
              productName: vi.productName,
              productImage: vi.productImage,
              size: vi.size,
              quantity: vi.quantity,
              unitPrice: vi.unitPrice,
              costPrice: vi.costPrice,
              totalPrice: vi.totalPrice,
            })),
          },
          statusHistory: {
            create: {
              status: 'ENTREGUE',
              notes: `Venda manual concluída via ${origin}. Operador: ${user.name}`,
              changedBy: user.name,
            },
          },
        },
      });

      // Decrement stock & register movements
      for (const vi of validatedItems) {
        const previousStock = vi.currentStock;
        const newStock = previousStock - vi.quantity;

        await tx.productSizeStock.update({
          where: { id: vi.sizeStockId },
          data: { stock: { decrement: vi.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: vi.productId,
            sizeStockId: vi.sizeStockId,
            size: vi.size,
            type: 'SAIDA_VENDA',
            quantity: vi.quantity,
            previousStock,
            newStock,
            reason: `Venda Manual (${origin}) - ${orderNumber}`,
            notes: `Operador: ${user.name} | Cliente: ${customerName}`,
            createdById: user.id,
          },
        });
      }

      // Register financial transaction
      await tx.financialTransaction.create({
        data: {
          type: 'RECEITA',
          category: 'VENDA',
          description: `Venda Manual ${orderNumber} - ${customerName} (${origin})`,
          amount: finalTotal,
          status: 'PAGO',
          paymentMethod: paymentMethod || 'PIX',
          orderId: newOrder.id,
          paidAt: new Date(),
        },
      });

      return newOrder;
    });

    return NextResponse.json({
      success: true,
      message: 'Venda manual registrada com sucesso e estoque atualizado!',
      order,
      snapshot: storeDb.getRawData(),
    });
  } catch (error: any) {
    console.error('Manual sale error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao registrar venda manual' }, { status: 400 });
  }
}

