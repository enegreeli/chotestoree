import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, ShieldCheck, Trophy, ChevronRight } from 'lucide-react';
import prisma from '@/lib/prisma';
import HomeLiveProducts from '@/components/HomeLiveProducts';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatProduct(p: any) {
  const totalStock = (p.sizes || []).reduce((acc: number, s: any) => acc + (Number(s.stock) || 0), 0);
  return {
    ...p,
    totalStock,
    isOutOfStock: totalStock <= 0,
  };
}

async function getHomeData() {
  const [rawAll, rawFeatured, rawBest, rawNew, rawPromo, rawLux, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: {
        images: { orderBy: { order: 'asc' } },
        sizes: { orderBy: { size: 'asc' } },
        category: true,
      },
    }),
    prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take: 4,
      include: {
        images: { orderBy: { order: 'asc' } },
        sizes: { orderBy: { size: 'asc' } },
        category: true,
      },
    }),
    prisma.product.findMany({
      where: { isActive: true, isBestSeller: true },
      take: 4,
      include: {
        images: { orderBy: { order: 'asc' } },
        sizes: { orderBy: { size: 'asc' } },
        category: true,
      },
    }),
    prisma.product.findMany({
      where: { isActive: true, isNewRelease: true },
      take: 4,
      include: {
        images: { orderBy: { order: 'asc' } },
        sizes: { orderBy: { size: 'asc' } },
        category: true,
      },
    }),
    prisma.product.findMany({
      where: { isActive: true, isPromo: true },
      take: 4,
      include: {
        images: { orderBy: { order: 'asc' } },
        sizes: { orderBy: { size: 'asc' } },
        category: true,
      },
    }),
    prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { modelType: 'GRIFE' },
          { modelType: 'STREETWEAR' },
          { category: { slug: 'grifes-luxo' } },
          { category: { slug: 'streetwear' } },
        ],
      },
      take: 4,
      include: {
        images: { orderBy: { order: 'asc' } },
        sizes: { orderBy: { size: 'asc' } },
        category: true,
      },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  return {
    allProducts: rawAll.map(formatProduct),
    featuredProducts: rawFeatured.map(formatProduct),
    bestSellers: rawBest.map(formatProduct),
    newReleases: rawNew.map(formatProduct),
    promoProducts: rawPromo.map(formatProduct),
    luxuryProducts: rawLux.map(formatProduct),
    categories,
  };
}

export default async function HomePage() {
  const { allProducts, featuredProducts, bestSellers, newReleases, promoProducts, luxuryProducts, categories } = await getHomeData();

  return (
    <div className="space-y-16 pb-20">
      {/* 1. HERO BANNER */}
      <section className="relative bg-[#111111] text-white overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
          <Image
            src="https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1800&auto=format&fit=crop"
            alt="Mantos Oficiais Chote Store"
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#111111] via-[#111111]/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold tracking-wider uppercase text-neutral-200">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              Grifes de Luxo • Streetwear • Mantos Oficiais
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08] text-white">
              GRIFES EXCLUSIVAS & A PAIXÃO PELO ESPORTE.
            </h1>

            <p className="text-sm sm:text-base text-neutral-300 font-light leading-relaxed max-w-xl">
              Uma curadoria de alto padrão que une as marcas mais consagradas do mundo (Lacoste, Hugo Boss, Ralph Lauren, Tommy Hilfiger) aos mantos mais cobiçados do futebol. Conforto, tecidos nobres e estoque sincronizado em tempo real.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/produtos"
                className="px-8 py-3.5 bg-white text-[#111111] font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-neutral-200 transition-all shadow-xl hover:shadow-2xl flex items-center gap-2 group"
              >
                Explorar Coleção
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/produtos?category=grifes-luxo"
                className="px-8 py-3.5 bg-transparent border border-white/40 text-white font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-white/10 transition-all"
              >
                Ver Grifes de Luxo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* LUXURY BRANDS MARQUEE */}
      <div className="border-y border-neutral-200/80 bg-neutral-50/70 py-4 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-6 overflow-x-auto text-[11px] font-black uppercase tracking-[0.25em] text-neutral-400 select-none">
          <span className="hover:text-black transition-colors shrink-0">LACOSTE</span>
          <span className="text-neutral-300">•</span>
          <span className="hover:text-black transition-colors shrink-0">HUGO BOSS</span>
          <span className="text-neutral-300">•</span>
          <span className="hover:text-black transition-colors shrink-0">RALPH LAUREN</span>
          <span className="text-neutral-300">•</span>
          <span className="hover:text-black transition-colors shrink-0">TOMMY HILFIGER</span>
          <span className="text-neutral-300">•</span>
          <span className="hover:text-black transition-colors shrink-0">BALENCIAGA</span>
          <span className="text-neutral-300">•</span>
          <span className="hover:text-black transition-colors shrink-0">ARMANI EXCHANGE</span>
          <span className="text-neutral-300">•</span>
          <span className="hover:text-black transition-colors shrink-0">NIKE SPORTSWEAR</span>
          <span className="text-neutral-300">•</span>
          <span className="hover:text-black transition-colors shrink-0">ADIDAS ORIGINALS</span>
        </div>
      </div>

      {/* 2. CATEGORIES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8 border-b border-neutral-100 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Navegue por</span>
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Categorias em Destaque</h2>
          </div>
          <Link
            href="/produtos"
            className="text-xs font-bold uppercase tracking-wider text-neutral-900 hover:text-neutral-500 transition-colors flex items-center gap-1"
          >
            Ver Todas <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            {
              title: 'Grifes de Luxo',
              desc: 'Lacoste, Boss, Lauren',
              slug: 'grifes-luxo',
              image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=800',
            },
            {
              title: 'Streetwear',
              desc: 'Estilo Urbano & Grifes',
              slug: 'streetwear',
              image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800',
            },
            {
              title: 'Internacionais',
              desc: 'Gigantes Europeus',
              slug: 'times-internacionais',
              image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=800',
            },
            {
              title: 'Brasileiros',
              desc: 'Clubes Nacionais',
              slug: 'times-nacionais',
              image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=800',
            },
            {
              title: 'Camisas Polo',
              desc: 'Piquê Nobre & Viagem',
              slug: 'camisetas-polo',
              image: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?q=80&w=800',
            },
            {
              title: 'Retrô Clássicas',
              desc: 'Glórias Históricas',
              slug: 'camisas-retro',
              image: 'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?q=80&w=800',
            },
          ].map((cat) => (
            <Link
              key={cat.slug}
              href={`/produtos?category=${cat.slug}`}
              className="group relative h-48 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900 shadow-sm hover:shadow-md transition-all"
            >
              <Image
                src={cat.image}
                alt={cat.title}
                fill
                className="object-cover opacity-60 group-hover:scale-105 group-hover:opacity-75 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3 className="text-sm font-bold uppercase tracking-wider">{cat.title}</h3>
                <p className="text-[11px] text-neutral-300 font-light mt-0.5">{cat.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 2.5 PRODUTOS COM SINCRONIZAÇÃO AO VIVO EM TEMPO REAL */}
      <HomeLiveProducts
        initialAllProducts={allProducts}
        initialNewReleases={newReleases}
        initialBestSellers={bestSellers}
        initialPromo={promoProducts}
        initialLuxury={luxuryProducts}
      />

      {/* 4. MID-PAGE PROMOTIONAL BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl bg-[#111111] text-white overflow-hidden p-8 sm:p-14 border border-neutral-800">
          <div className="relative z-10 max-w-xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
              Colecionismo & História
            </span>
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              CAMISAS RETRÔ QUE MARCARAM ÉPOCA
            </h3>
            <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
              Mantos que imortalizaram esquadrões épicos. Santos de 1962, Japão de 1998, Brasil de 1970 e muito mais. Confeccionadas em algodão premium com bordados fiéis ao original.
            </p>
            <div className="pt-2">
              <Link
                href="/produtos?category=camisas-retro"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Conhecer Linha Retrô <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TRUST & QUALITY PROMISE */}
      <section className="bg-neutral-50 border-y border-neutral-200/70 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">O Padrão Chote Kits</span>
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight mt-1">
              Por que somos a loja preferida dos amantes de futebol?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border border-neutral-200/80 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                Qualidade & Tecnologia
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Todas as nossas peças são confeccionadas com os mesmos materiais técnicos utilizados nas melhores ligas europeias: respirabilidade extrema, escudos termoaplicados de alta precisão e etiquetas originais.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-neutral-200/80 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                Estoque Real & Sem Surpresas
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Nosso sistema possui controle de estoque automatizado em tempo real. Se o tamanho está disponível no site, ele está fisicamente reservado e pronto para envio imediato.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-neutral-200/80 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                Experiência de Compra Premium
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Embalagem personalizada de luxo, acompanhamento de pedido passo a passo por e-mail e WhatsApp, e suporte dedicado para você torcer com estilo.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

