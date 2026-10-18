import { eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { aiFeatureModels, aiSettings } from "../db/schema";
import type { AiConfigRow } from "../domain/ai";

export interface AiConfigRepository {
  get(): Promise<AiConfigRow>;
  /** apiKeyEnc: undefined = giu nguyen, null = xoa key trong DB */
  save(v: { apiKeyEnc?: string | null; defaultModel: string | null; updatedBy: string | null; features: { feature: string; model: string; enabled: boolean }[] }): Promise<void>;
}

export class DrizzleAiConfigRepository implements AiConfigRepository {
  constructor(private db: Db) {}
  async get(): Promise<AiConfigRow> {
    const [s] = await this.db.select().from(aiSettings).where(eq(aiSettings.id, 1)).limit(1);
    const f = await this.db.select().from(aiFeatureModels);
    return {
      apiKeyEnc: s?.apiKeyEnc ?? null,
      defaultModel: s?.defaultModel ?? null,
      features: Object.fromEntries(f.map((x) => [x.feature, { model: x.model, enabled: x.enabled }])),
    };
  }
  async save(v: Parameters<AiConfigRepository["save"]>[0]) {
    await this.db.transaction(async (tx) => {
      const set: Record<string, unknown> = { defaultModel: v.defaultModel, updatedAt: new Date(), updatedBy: v.updatedBy };
      if (v.apiKeyEnc !== undefined) set.apiKeyEnc = v.apiKeyEnc;
      await tx.insert(aiSettings).values({ id: 1, defaultModel: v.defaultModel, apiKeyEnc: v.apiKeyEnc ?? null, updatedBy: v.updatedBy })
        .onConflictDoUpdate({ target: aiSettings.id, set });
      for (const x of v.features) {
        await tx.insert(aiFeatureModels).values(x)
          .onConflictDoUpdate({ target: aiFeatureModels.feature, set: { model: x.model, enabled: x.enabled, updatedAt: sql`now()` } });
      }
    });
  }
}
