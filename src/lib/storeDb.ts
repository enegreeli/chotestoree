import fs from 'fs';
import path from 'path';
import os from 'os';

export interface StoreDbData {
  users: any[];
  categories: any[];
  products: any[];
  productImages: any[];
  productSizeStocks: any[];
  stockMovements: any[];
  orders: any[];
  orderItems: any[];
  orderStatusHistories: any[];
  financialTransactions: any[];
  coupons: any[];
  storeSettings: any[];
  wishlists: any[];
  addresses: any[];
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

class StoreDatabase {
  private readonly sourceDbPath: string;
  private dbPath: string;
  private data: StoreDbData;

  constructor() {
    this.sourceDbPath = path.join(process.cwd(), 'data', 'store_db.json');
    const isServerless = Boolean(
      process.env.VERCEL ||
      process.env.NOW_REGION ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY
    );

    if (isServerless) {
      this.dbPath = path.join(os.tmpdir(), 'store_db.json');
    } else {
      this.dbPath = this.sourceDbPath;
    }

    this.data = this.load();
  }

  private getInitialData(): StoreDbData {
    return {
      users: [],
      categories: [],
      products: [],
      productImages: [],
      productSizeStocks: [],
      stockMovements: [],
      orders: [],
      orderItems: [],
      orderStatusHistories: [],
      financialTransactions: [],
      coupons: [],
      storeSettings: [],
      wishlists: [],
      addresses: [],
    };
  }

  public load(): StoreDbData {
    try {
      // 1. If writable dbPath exists, load from it
      if (fs.existsSync(this.dbPath)) {
        const content = fs.readFileSync(this.dbPath, 'utf-8');
        return { ...this.getInitialData(), ...JSON.parse(content) };
      }

      // 2. If running in serverless (e.g. Vercel) and /tmp doesn't have the file yet, seed from sourceDbPath
      if (fs.existsSync(this.sourceDbPath)) {
        const content = fs.readFileSync(this.sourceDbPath, 'utf-8');
        const parsed = JSON.parse(content);

        if (this.dbPath !== this.sourceDbPath) {
          try {
            fs.writeFileSync(this.dbPath, content, 'utf-8');
          } catch (e) {
            console.warn('Could not seed local database file:', e);
          }
        }
        return { ...this.getInitialData(), ...parsed };
      }
    } catch (err) {
      console.error('StoreDatabase load error, initializing fresh:', err);
    }
    return this.getInitialData();
  }

  public save(): void {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const serialized = JSON.stringify(this.data, null, 2);
      const tmpPath = `${this.dbPath}.tmp`;
      fs.writeFileSync(tmpPath, serialized, 'utf-8');
      fs.renameSync(tmpPath, this.dbPath);

      // Keep sourceDbPath synchronized if different and writable
      if (this.dbPath !== this.sourceDbPath) {
        try {
          const sourceDir = path.dirname(this.sourceDbPath);
          if (fs.existsSync(sourceDir)) {
            fs.writeFileSync(this.sourceDbPath, serialized, 'utf-8');
          }
        } catch {}
      }
    } catch (err: any) {
      // If error is EROFS (Read-only filesystem on Vercel/lambda), redirect to /tmp
      if (err?.code === 'EROFS' || err?.message?.includes('read-only')) {
        try {
          const fallbackPath = path.join(os.tmpdir(), 'store_db.json');
          this.dbPath = fallbackPath;
          fs.writeFileSync(fallbackPath, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch (fallbackErr) {
          console.error('Fallback save to os.tmpdir failed:', fallbackErr);
        }
      } else {
        console.error('StoreDatabase save error:', err);
      }
    }
  }

  public ensureFreshData(): void {
    if (fs.existsSync(this.dbPath)) {
      try {
        const content = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          this.data = { ...this.getInitialData(), ...parsed };
        }
      } catch (err) {
        console.warn('Could not read local database file:', err);
      }
    }
  }

  public getRawData(): StoreDbData {
    return this.data;
  }

  // --- Matching and Query Engine ---
  private matchesValue(itemVal: any, whereVal: any): boolean {
    if (whereVal === undefined) return true;
    if (whereVal === null) return itemVal === null;

    if (typeof whereVal === 'object' && !Array.isArray(whereVal) && !(whereVal instanceof Date)) {
      if ('contains' in whereVal) {
        const needle = String(whereVal.contains).toLowerCase();
        const haystack = String(itemVal || '').toLowerCase();
        return haystack.includes(needle);
      }
      if ('not' in whereVal) {
        return itemVal !== whereVal.not;
      }
      if ('in' in whereVal && Array.isArray(whereVal.in)) {
        return whereVal.in.includes(itemVal);
      }
      if ('gte' in whereVal && Number(itemVal) < Number(whereVal.gte)) return false;
      if ('gt' in whereVal && Number(itemVal) <= Number(whereVal.gt)) return false;
      if ('lte' in whereVal && Number(itemVal) > Number(whereVal.lte)) return false;
      if ('lt' in whereVal && Number(itemVal) >= Number(whereVal.lt)) return false;
      return true;
    }

    if (whereVal instanceof Date || (typeof whereVal === 'string' && !isNaN(Date.parse(whereVal)) && itemVal instanceof Date)) {
      const tItem = new Date(itemVal).getTime();
      const tWhere = new Date(whereVal).getTime();
      return tItem === tWhere;
    }

    return itemVal === whereVal;
  }

  private matchesWhere(item: any, where?: any, collectionName?: string): boolean {
    if (!where) return true;

    // Handle OR condition
    if (where.OR && Array.isArray(where.OR)) {
      const orMatched = where.OR.some((condition: any) => this.matchesWhere(item, condition, collectionName));
      if (!orMatched) return false;
    }

    for (const key of Object.keys(where)) {
      if (key === 'OR') continue;
      const whereVal = where[key];

      // Special nested category check on product
      if (key === 'category' && typeof whereVal === 'object') {
        const cat = this.data.categories.find((c) => c.id === item.categoryId);
        const targetSlug = whereVal.slug;
        if (targetSlug) {
          if (targetSlug === 'lancamentos' && item.isNewRelease) continue;
          if (targetSlug === 'promocoes' && (item.isPromo || (item.promoPrice && item.promoPrice < item.price))) continue;
          if ((targetSlug === 'camisas-retro' || targetSlug === 'retro') && item.modelType === 'RETRO') continue;
          if (targetSlug === 'grifes-luxo' && item.modelType === 'GRIFE') continue;
          if (targetSlug === 'streetwear' && item.modelType === 'STREETWEAR') continue;
          if (targetSlug === 'jogador' && item.modelType === 'JOGADOR') continue;
          if (targetSlug === 'torcedor' && item.modelType === 'TORCEDOR') continue;
          if (targetSlug === 'camisetas-polo' && item.modelType === 'POLO') continue;
          if (targetSlug === 'camisetas-casuais' && item.modelType === 'CAMISETA') continue;
        }
        if (!cat) return false;
        if (!this.matchesWhere(cat, whereVal, 'categories')) return false;
        continue;
      }

      // Special nested sizes check on product
      if (key === 'sizes' && typeof whereVal === 'object' && whereVal.some) {
        const sizes = this.data.productSizeStocks.filter((s) => s.productId === item.id);
        const hasSome = sizes.some((s) => this.matchesWhere(s, whereVal.some, 'productSizeStocks'));
        if (!hasSome) return false;
        continue;
      }

      // Special nested order check on orderItem
      if (key === 'order' && typeof whereVal === 'object') {
        const ord = this.data.orders.find((o) => o.id === item.orderId);
        if (!ord) return false;
        if (!this.matchesWhere(ord, whereVal, 'orders')) return false;
        continue;
      }

      const itemVal = item[key];
      if (!this.matchesValue(itemVal, whereVal)) {
        return false;
      }
    }

    return true;
  }

  private sortItems(items: any[], orderBy?: any): any[] {
    if (!orderBy) return items;

    return [...items].sort((a, b) => {
      const rules = Array.isArray(orderBy) ? orderBy : [orderBy];
      for (const rule of rules) {
        for (const field of Object.keys(rule)) {
          const dir = rule[field] === 'desc' ? -1 : 1;
          const aVal = a[field];
          const bVal = b[field];

          if (aVal === bVal) continue;
          if (aVal === undefined || aVal === null) return 1 * dir;
          if (bVal === undefined || bVal === null) return -1 * dir;

          if (typeof aVal === 'string' && typeof bVal === 'string') {
            const cmp = aVal.localeCompare(bVal);
            if (cmp !== 0) return cmp * dir;
          } else {
            if (aVal < bVal) return -1 * dir;
            if (aVal > bVal) return 1 * dir;
          }
        }
      }
      return 0;
    });
  }

  private attachRelations(item: any, collection: string, include?: any): any {
    if (!item) return null;
    const clone = { ...item };

    if (!include) return clone;

    if (collection === 'products') {
      if (include.category) {
        const cat = this.data.categories.find((c) => c.id === item.categoryId) || null;
        clone.category = cat;
      }
      if (include.images) {
        let imgs = this.data.productImages.filter((img) => img.productId === item.id);
        if (typeof include.images === 'object') {
          if (include.images.where) imgs = imgs.filter((i) => this.matchesWhere(i, include.images.where));
          if (include.images.orderBy) imgs = this.sortItems(imgs, include.images.orderBy);
          if (include.images.take) imgs = imgs.slice(0, include.images.take);
        }
        clone.images = imgs;
      }
      if (include.sizes) {
        let szs = this.data.productSizeStocks.filter((s) => s.productId === item.id);
        if (typeof include.sizes === 'object') {
          if (include.sizes.where) szs = szs.filter((s) => this.matchesWhere(s, include.sizes.where));
          if (include.sizes.orderBy) szs = this.sortItems(szs, include.sizes.orderBy);
        }
        clone.sizes = szs;
      }
    }

    if (collection === 'categories') {
      if (include.products) {
        clone.products = this.data.products.filter((p) => p.categoryId === item.id);
      }
      if (include._count) {
        const count = this.data.products.filter((p) => {
          if (!p.isActive) return false;
          if (p.categoryId === item.id) return true;
          if (item.slug === 'lancamentos' && p.isNewRelease) return true;
          if (item.slug === 'promocoes' && (p.isPromo || (p.promoPrice && p.promoPrice < p.price))) return true;
          if ((item.slug === 'camisas-retro' || item.slug === 'retro') && p.modelType === 'RETRO') return true;
          if (item.slug === 'grifes-luxo' && p.modelType === 'GRIFE') return true;
          if (item.slug === 'streetwear' && p.modelType === 'STREETWEAR') return true;
          if (item.slug === 'jogador' && p.modelType === 'JOGADOR') return true;
          if (item.slug === 'torcedor' && p.modelType === 'TORCEDOR') return true;
          if (item.slug === 'camisetas-polo' && p.modelType === 'POLO') return true;
          if (item.slug === 'camisetas-casuais' && p.modelType === 'CAMISETA') return true;
          return false;
        }).length;
        clone._count = {
          products: count,
        };
      }
    }

    if (collection === 'orders') {
      if (include.items) {
        clone.items = this.data.orderItems.filter((i) => i.orderId === item.id);
      }
      if (include.statusHistory) {
        let history = this.data.orderStatusHistories.filter((h) => h.orderId === item.id);
        if (include.statusHistory.orderBy) history = this.sortItems(history, include.statusHistory.orderBy);
        clone.statusHistory = history;
      }
      if (include.user) {
        clone.user = this.data.users.find((u) => u.id === item.userId) || null;
      }
    }

    if (collection === 'orderItems') {
      if (include.product) {
        clone.product = this.data.products.find((p) => p.id === item.productId) || null;
      }
      if (include.order) {
        clone.order = this.data.orders.find((o) => o.id === item.orderId) || null;
      }
    }

    if (collection === 'productSizeStocks') {
      if (include.product) {
        const prod = this.data.products.find((p) => p.id === item.productId) || null;
        if (include.product.select && prod) {
          const selected: any = {};
          for (const k of Object.keys(include.product.select)) {
            selected[k] = prod[k];
          }
          clone.product = selected;
        } else {
          clone.product = prod;
        }
      }
    }

    if (collection === 'stockMovements') {
      if (include.product) {
        clone.product = this.data.products.find((p) => p.id === item.productId) || null;
      }
      if (include.sizeStock) {
        clone.sizeStock = this.data.productSizeStocks.find((s) => s.id === item.sizeStockId) || null;
      }
      if (include.createdBy) {
        clone.createdBy = this.data.users.find((u) => u.id === item.createdById) || null;
      }
    }

    return clone;
  }

  // Generic collection delegate generator
  private createDelegate(collectionKey: keyof StoreDbData) {
    return {
      findMany: async (args: any = {}) => {
        await this.ensureFreshData();
        let items = this.data[collectionKey] || [];
        if (args.where) {
          items = items.filter((item) => this.matchesWhere(item, args.where, collectionKey));
        }
        if (args.orderBy) {
          items = this.sortItems(items, args.orderBy);
        }
        if (args.take) {
          items = items.slice(0, args.take);
        }
        return items.map((item) => this.attachRelations(item, collectionKey, args.include));
      },

      findUnique: async (args: any = {}) => {
        await this.ensureFreshData();
        const items = this.data[collectionKey] || [];
        const item = items.find((i) => this.matchesWhere(i, args.where, collectionKey));
        if (!item) return null;
        return this.attachRelations(item, collectionKey, args.include);
      },

      findFirst: async (args: any = {}) => {
        await this.ensureFreshData();
        const items = this.data[collectionKey] || [];
        const item = items.find((i) => this.matchesWhere(i, args.where, collectionKey));
        if (!item) return null;
        return this.attachRelations(item, collectionKey, args.include);
      },

      count: async (args: any = {}) => {
        await this.ensureFreshData();
        let items = this.data[collectionKey] || [];
        if (args.where) {
          items = items.filter((item) => this.matchesWhere(item, args.where, collectionKey));
        }
        return items.length;
      },

      create: async (args: any = {}) => {
        await this.ensureFreshData();
        const data = { ...args.data };
        const id = data.id || generateId();
        const now = new Date().toISOString();

        // Extract nested creates if any
        const nestedImages = data.images?.create;
        const nestedSizes = data.sizes?.create;
        const nestedItems = data.items?.create;
        const nestedStatusHistory = data.statusHistory?.create;

        delete data.images;
        delete data.sizes;
        delete data.items;
        delete data.statusHistory;

        const newItem = {
          id,
          createdAt: now,
          updatedAt: now,
          ...data,
        };

        this.data[collectionKey].push(newItem);

        // Process nested creations
        if (nestedImages && Array.isArray(nestedImages)) {
          for (const img of nestedImages) {
            this.data.productImages.push({
              id: generateId(),
              productId: id,
              createdAt: now,
              ...img,
            });
          }
        }

        if (nestedSizes && Array.isArray(nestedSizes)) {
          for (const s of nestedSizes) {
            this.data.productSizeStocks.push({
              id: generateId(),
              productId: id,
              createdAt: now,
              updatedAt: now,
              ...s,
            });
          }
        }

        if (nestedItems && Array.isArray(nestedItems)) {
          for (const it of nestedItems) {
            this.data.orderItems.push({
              id: generateId(),
              orderId: id,
              createdAt: now,
              ...it,
            });
          }
        }

        if (nestedStatusHistory && Array.isArray(nestedStatusHistory)) {
          for (const h of nestedStatusHistory) {
            this.data.orderStatusHistories.push({
              id: generateId(),
              orderId: id,
              createdAt: now,
              ...h,
            });
          }
        }

        this.save();
        return this.attachRelations(newItem, collectionKey, args.include);
      },

      update: async (args: any = {}) => {
        await this.ensureFreshData();
        const items = this.data[collectionKey] || [];
        const index = items.findIndex((i) => this.matchesWhere(i, args.where, collectionKey));
        if (index === -1) {
          throw new Error(`Record to update not found in ${String(collectionKey)}`);
        }

        const current = items[index];
        const updateData = { ...args.data };

        for (const [key, val] of Object.entries(updateData)) {
          if (val && typeof val === 'object' && 'increment' in (val as any)) {
            current[key] = (Number(current[key]) || 0) + Number((val as any).increment);
          } else if (val && typeof val === 'object' && 'decrement' in (val as any)) {
            current[key] = (Number(current[key]) || 0) - Number((val as any).decrement);
          } else {
            current[key] = val;
          }
        }

        current.updatedAt = new Date().toISOString();
        items[index] = current;
        this.save();
        return this.attachRelations(current, collectionKey, args.include);
      },

      upsert: async (args: any = {}) => {
        await this.ensureFreshData();
        const items = this.data[collectionKey] || [];
        const index = items.findIndex((i) => this.matchesWhere(i, args.where, collectionKey));

        if (index !== -1) {
          const current = { ...items[index], ...args.update, updatedAt: new Date().toISOString() };
          items[index] = current;
          this.save();
          return current;
        } else {
          const newItem = {
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...args.create,
          };
          items.push(newItem);
          this.save();
          return newItem;
        }
      },

      delete: async (args: any = {}) => {
        await this.ensureFreshData();
        const items = this.data[collectionKey] || [];
        const index = items.findIndex((i) => this.matchesWhere(i, args.where, collectionKey));
        if (index === -1) return null;

        const removed = items.splice(index, 1)[0];

        // Automatic cascade cleanup
        if (collectionKey === 'products' && removed?.id) {
          const prodId = removed.id;
          this.data.productImages = this.data.productImages.filter((img) => img.productId !== prodId);
          this.data.productSizeStocks = this.data.productSizeStocks.filter((s) => s.productId !== prodId);
          this.data.stockMovements = this.data.stockMovements.filter((m) => m.productId !== prodId);
          this.data.orderItems = this.data.orderItems.filter((oi) => oi.productId !== prodId);
        }

        if (collectionKey === 'categories' && removed?.id) {
          const catId = removed.id;
          const fallbackCat = this.data.categories[0] || null;
          for (const p of this.data.products) {
            if (p.categoryId === catId) {
              p.categoryId = fallbackCat ? fallbackCat.id : '';
            }
          }
        }

        this.save();
        return removed;
      },

      deleteMany: async (args: any = {}) => {
        await this.ensureFreshData();
        if (!args.where) {
          const count = this.data[collectionKey].length;
          this.data[collectionKey] = [];
          this.save();
          return { count };
        }

        const initialLen = this.data[collectionKey].length;
        const toRemove = this.data[collectionKey].filter((item) =>
          this.matchesWhere(item, args.where, collectionKey)
        );
        this.data[collectionKey] = this.data[collectionKey].filter(
          (item) => !this.matchesWhere(item, args.where, collectionKey)
        );

        if (collectionKey === 'products') {
          for (const rem of toRemove) {
            if (rem.id) {
              this.data.productImages = this.data.productImages.filter((img) => img.productId !== rem.id);
              this.data.productSizeStocks = this.data.productSizeStocks.filter((s) => s.productId !== rem.id);
              this.data.stockMovements = this.data.stockMovements.filter((m) => m.productId !== rem.id);
              this.data.orderItems = this.data.orderItems.filter((oi) => oi.productId !== rem.id);
            }
          }
        }

        const removedCount = initialLen - this.data[collectionKey].length;
        if (removedCount > 0) {
          this.save();
        }
        return { count: removedCount };
      },
    };
  }

  // Quick store management helpers
  public zeroProductStock(productId: string): number {
    let count = 0;
    for (const s of this.data.productSizeStocks) {
      if (s.productId === productId) {
        s.stock = 0;
        s.updatedAt = new Date().toISOString();
        count++;
      }
    }
    this.save();
    return count;
  }

  public zeroAllStock(): number {
    let count = 0;
    for (const s of this.data.productSizeStocks) {
      s.stock = 0;
      s.updatedAt = new Date().toISOString();
      count++;
    }
    this.save();
    return count;
  }

  public wipeAllProducts(): { productsRemoved: number } {
    const productsRemoved = this.data.products.length;
    this.data.products = [];
    this.data.productImages = [];
    this.data.productSizeStocks = [];
    this.data.stockMovements = [];
    this.data.orderItems = [];
    this.save();
    return { productsRemoved };
  }

  public wipeEverything(preserveAdmin: boolean = true): void {
    const adminUser = preserveAdmin
      ? this.data.users.find((u) => u.role === 'ADMIN' || u.email === 'chote@store.com')
      : null;

    const defaultCategories =
      this.data.categories.length > 0
        ? this.data.categories
        : [
            {
              id: 'cat-geral',
              name: 'Geral',
              slug: 'geral',
              description: 'Categoria Geral',
              isActive: true,
              sortOrder: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];

    this.data = {
      users: adminUser ? [adminUser] : [],
      categories: defaultCategories,
      products: [],
      productImages: [],
      productSizeStocks: [],
      stockMovements: [],
      orders: [],
      orderItems: [],
      orderStatusHistories: [],
      financialTransactions: [],
      coupons: this.data.coupons || [],
      storeSettings: this.data.storeSettings || [],
      wishlists: [],
      addresses: [],
    };
    this.save();
  }

  // Model accessors
  public product = this.createDelegate('products');
  public category = this.createDelegate('categories');
  public productImage = this.createDelegate('productImages');
  public productSizeStock = this.createDelegate('productSizeStocks');
  public stockMovement = this.createDelegate('stockMovements');
  public order = this.createDelegate('orders');
  public orderItem = this.createDelegate('orderItems');
  public orderStatusHistory = this.createDelegate('orderStatusHistories');
  public financialTransaction = this.createDelegate('financialTransactions');
  public coupon = this.createDelegate('coupons');
  public storeSetting = this.createDelegate('storeSettings');
  public user = this.createDelegate('users');
  public address = this.createDelegate('addresses');
  public wishlist = this.createDelegate('wishlists');

  public async $transaction<T>(fn: (tx: StoreDatabase) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

// Global singleton instance
const globalForStoreDb = global as unknown as { storeDb: StoreDatabase };
export const storeDb = globalForStoreDb.storeDb || new StoreDatabase();
if (process.env.NODE_ENV !== 'production') globalForStoreDb.storeDb = storeDb;

export default storeDb;
