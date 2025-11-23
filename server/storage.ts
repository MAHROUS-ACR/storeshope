import { type User, type InsertUser, users, type Discount, type InsertDiscount, discounts } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

let dbInstance: NeonHttpDatabase | null = null;
let sqlClient: any = null;

async function getDb(): Promise<NeonHttpDatabase> {
  if (!dbInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const { drizzle } = await import("drizzle-orm/neon-http");
    const { neon } = await import("@neondatabase/serverless");
    sqlClient = neon(process.env.DATABASE_URL);
    dbInstance = drizzle(sqlClient);
  }
  return dbInstance;
}

async function getSqlClient() {
  if (!sqlClient) {
    await getDb();
  }
  return sqlClient;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createDiscount(discount: InsertDiscount): Promise<Discount>;
  getDiscountByProductId(productId: string): Promise<Discount | undefined>;
  getAllDiscounts(): Promise<Discount[]>;
  updateDiscount(id: string, discount: Partial<InsertDiscount>): Promise<Discount | undefined>;
  deleteDiscount(id: string): Promise<void>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    try {
      const db = await getDb();
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return result && result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error("Error in getUser:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const db = await getDb();
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return result && result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error("Error in getUserByEmail:", error);
      return undefined;
    }
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    try {
      const db = await getDb();
      const result = await db
        .select()
        .from(users)
        .where(eq(users.firebaseUid, firebaseUid))
        .limit(1);
      return result && result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error("Error in getUserByFirebaseUid:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = await getDb();
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createDiscount(discount: InsertDiscount): Promise<Discount> {
    try {
      const client = await getSqlClient();
      const startDate = discount.startDate instanceof Date ? discount.startDate.toISOString() : discount.startDate;
      const endDate = discount.endDate instanceof Date ? discount.endDate.toISOString() : discount.endDate;
      
      const result = await client(
        `INSERT INTO discounts (product_id, discount_percentage, start_date, end_date) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, product_id, discount_percentage, start_date, end_date, created_at`,
        [discount.productId, discount.discountPercentage, startDate, endDate]
      );
      
      if (!result || !Array.isArray(result) || !result[0]) {
        throw new Error("Failed to create discount - no result returned");
      }
      
      const row = result[0];
      return {
        id: row.id,
        productId: row.product_id,
        discountPercentage: String(row.discount_percentage),
        startDate: new Date(row.start_date),
        endDate: new Date(row.end_date),
        createdAt: new Date(row.created_at),
      };
    } catch (error) {
      console.error("Error creating discount:", error);
      throw error;
    }
  }

  async getDiscountByProductId(productId: string): Promise<Discount | undefined> {
    try {
      const client = await getSqlClient();
      const now = new Date().toISOString();
      const result = await client(
        `SELECT id, product_id, discount_percentage, start_date, end_date, created_at 
         FROM discounts 
         WHERE product_id = $1 AND start_date <= $2 AND end_date >= $2
         LIMIT 1`,
        [productId, now]
      );
      
      if (!result || !Array.isArray(result) || result.length === 0) return undefined;
      
      const row = result[0];
      return {
        id: row.id,
        productId: row.product_id,
        discountPercentage: String(row.discount_percentage),
        startDate: new Date(row.start_date),
        endDate: new Date(row.end_date),
        createdAt: new Date(row.created_at),
      };
    } catch (error) {
      console.error("Error getting discount:", error);
      return undefined;
    }
  }

  async getAllDiscounts(): Promise<Discount[]> {
    try {
      const client = await getSqlClient();
      const result = await client("SELECT * FROM discounts ORDER BY created_at DESC");
      
      if (!result || !Array.isArray(result)) {
        return [];
      }
      
      return result.map((d: any) => ({
        id: d.id,
        productId: d.product_id,
        discountPercentage: String(d.discount_percentage),
        startDate: new Date(d.start_date),
        endDate: new Date(d.end_date),
        createdAt: new Date(d.created_at),
      }));
    } catch (error) {
      console.error("Error getting all discounts:", error);
      return [];
    }
  }

  async updateDiscount(id: string, discount: Partial<InsertDiscount>): Promise<Discount | undefined> {
    try {
      const client = await getSqlClient();
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (discount.discountPercentage !== undefined) {
        updates.push(`discount_percentage = $${paramCount}`);
        values.push(discount.discountPercentage);
        paramCount++;
      }
      if (discount.startDate !== undefined) {
        updates.push(`start_date = $${paramCount}`);
        const startDate = discount.startDate instanceof Date ? discount.startDate.toISOString() : discount.startDate;
        values.push(startDate);
        paramCount++;
      }
      if (discount.endDate !== undefined) {
        updates.push(`end_date = $${paramCount}`);
        const endDate = discount.endDate instanceof Date ? discount.endDate.toISOString() : discount.endDate;
        values.push(endDate);
        paramCount++;
      }
      
      if (updates.length === 0) return undefined;
      
      values.push(id);
      
      const result = await client(
        `UPDATE discounts SET ${updates.join(", ")} WHERE id = $${paramCount} 
         RETURNING id, product_id, discount_percentage, start_date, end_date, created_at`,
        values
      );
      
      if (!result || !Array.isArray(result) || !result[0]) return undefined;
      
      const row = result[0];
      return {
        id: row.id,
        productId: row.product_id,
        discountPercentage: String(row.discount_percentage),
        startDate: new Date(row.start_date),
        endDate: new Date(row.end_date),
        createdAt: new Date(row.created_at),
      };
    } catch (error) {
      console.error("Error updating discount:", error);
      return undefined;
    }
  }

  async deleteDiscount(id: string): Promise<void> {
    try {
      const client = await getSqlClient();
      await client("DELETE FROM discounts WHERE id = $1", [id]);
    } catch (error) {
      console.error("Error deleting discount:", error);
    }
  }
}

export const storage = new DbStorage();
