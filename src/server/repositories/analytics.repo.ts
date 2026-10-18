import { sql } from "drizzle-orm";
import type { Db } from "../db/client";

/** Ngay theo gio Viet Nam (thong ke "hom nay" khop voi nguoi van hanh) */
const VN_DAY = sql`(now() at time zone 'Asia/Ho_Chi_Minh')::date`;

export interface TopViewedRow { id: number; slug: string; name: string; image: string | null; views: number; fromSearch: number; clicks: number; ctr: number }
export interface SearchStatRow { query: string; n: number; avgResults: number }
export interface AnalyticsSummary { views: number; clicks: number; searches: number; emptySearches: number; ctr: number }

export interface AnalyticsRepository {
  recordView(v: { productId: number; userId: string | null; fromSearch: boolean; mobile: boolean }): Promise<void>;
  summary(days: number): Promise<AnalyticsSummary>;
  viewSeries(days: number): Promise<{ day: string; views: number; clicks: number }[]>;
  topViewed(days: number, limit: number): Promise<TopViewedRow[]>;
  topSearches(days: number, limit: number, onlyEmpty?: boolean): Promise<SearchStatRow[]>;
  popularQueries(days: number, limit: number): Promise<string[]>;
  userSearches(userId: string, limit: number): Promise<string[]>;
  clearUserSearches(userId: string): Promise<void>;
  userViewed(userId: string, limit: number): Promise<number[]>;
  clearUserViewed(userId: string): Promise<void>;
}

const rows = <T>(r: unknown) => Array.from(r as Iterable<T>);
const clampDays = (d: number) => Math.min(Math.max(Math.trunc(d) || 7, 1), 365);

export class DrizzleAnalyticsRepository implements AnalyticsRepository {
  constructor(private db: Db) {}

  async recordView(v: { productId: number; userId: string | null; fromSearch: boolean; mobile: boolean }) {
    // UPSERT 1 dong/ngay -> moi luot xem chi la 1 UPDATE theo khoa chinh, khong phinh bang
    await this.db.execute(sql`
      insert into product_views_daily (product_id, day, views, from_search, mobile)
      values (${v.productId}, ${VN_DAY}, 1, ${v.fromSearch ? 1 : 0}, ${v.mobile ? 1 : 0})
      on conflict (product_id, day) do update set
        views = product_views_daily.views + 1,
        from_search = product_views_daily.from_search + excluded.from_search,
        mobile = product_views_daily.mobile + excluded.mobile`);
    if (v.userId) {
      await this.db.execute(sql`
        insert into user_product_views (user_id, product_id) values (${v.userId}, ${v.productId})
        on conflict (user_id, product_id) do update set views = user_product_views.views + 1, viewed_at = now()`);
    }
  }

  async summary(days: number): Promise<AnalyticsSummary> {
    const d = clampDays(days);
    const r = rows<{ views: number; clicks: number; searches: number; empty: number }>(await this.db.execute(sql`
      select
        (select coalesce(sum(views), 0)::int from product_views_daily where day > ${VN_DAY} - ${d}::int) as views,
        (select count(*)::int from clicks where created_at > now() - make_interval(days => ${d})) as clicks,
        (select count(*)::int from search_logs where created_at > now() - make_interval(days => ${d})) as searches,
        (select count(*)::int from search_logs where result_count = 0 and created_at > now() - make_interval(days => ${d})) as empty`))[0];
    const views = r?.views ?? 0, clicks = r?.clicks ?? 0;
    return { views, clicks, searches: r?.searches ?? 0, emptySearches: r?.empty ?? 0, ctr: views ? Math.round((clicks / views) * 1000) / 10 : 0 };
  }

  async viewSeries(days: number) {
    const d = clampDays(days);
    return rows<{ day: string; views: number; clicks: number }>(await this.db.execute(sql`
      select to_char(g::date, 'YYYY-MM-DD') as day, coalesce(v.n, 0)::int as views, coalesce(c.n, 0)::int as clicks
      from generate_series(${VN_DAY} - (${d}::int - 1), ${VN_DAY}, interval '1 day') g
      left join (select day, sum(views) as n from product_views_daily where day > ${VN_DAY} - ${d}::int group by day) v on v.day = g::date
      left join (select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day, count(*) as n from clicks
                 where created_at > now() - make_interval(days => ${d}) group by 1) c on c.day = g::date
      order by g`));
  }

  async topViewed(days: number, limit: number) {
    const d = clampDays(days);
    return rows<TopViewedRow>(await this.db.execute(sql`
      with v as (
        select product_id, sum(views)::int as views, sum(from_search)::int as from_search
        from product_views_daily where day > ${VN_DAY} - ${d}::int group by product_id
      ), c as (
        select product_id, count(*)::int as clicks from clicks
        where created_at > now() - make_interval(days => ${d}) group by product_id
      )
      select p.id, p.slug, p.name, p.images->>0 as image, v.views, v.from_search as "fromSearch", coalesce(c.clicks, 0) as clicks,
             round(coalesce(c.clicks, 0)::numeric * 100 / nullif(v.views, 0), 1)::float as ctr
      from v join products p on p.id = v.product_id left join c on c.product_id = v.product_id
      order by v.views desc, clicks desc limit ${Math.min(limit, 100)}`));
  }

  async topSearches(days: number, limit: number, onlyEmpty = false) {
    const d = clampDays(days);
    return rows<SearchStatRow>(await this.db.execute(sql`
      select lower(trim(query)) as query, count(*)::int as n, round(avg(result_count))::int as "avgResults"
      from search_logs
      where created_at > now() - make_interval(days => ${d}) ${onlyEmpty ? sql`and result_count = 0` : sql``}
      group by 1 order by n desc limit ${Math.min(limit, 100)}`));
  }

  async popularQueries(days: number, limit: number) {
    const d = clampDays(days);
    const r = rows<{ query: string }>(await this.db.execute(sql`
      select lower(trim(query)) as query from search_logs
      where result_count > 0 and created_at > now() - make_interval(days => ${d}) and length(trim(query)) between 2 and 60
      group by 1 having count(*) >= 2 order by count(*) desc limit ${Math.min(limit, 20)}`));
    return r.map((x) => x.query);
  }

  async userSearches(userId: string, limit: number) {
    const r = rows<{ query: string }>(await this.db.execute(sql`
      select query from (
        select distinct on (lower(trim(query))) trim(query) as query, created_at from search_logs
        where user_id = ${userId} and created_at > now() - interval '180 days'
        order by lower(trim(query)), created_at desc
      ) t order by created_at desc limit ${Math.min(limit, 30)}`));
    return r.map((x) => x.query);
  }

  /** Xoa lich su ca nhan nhung giu so lieu tong (an danh hoa: bo user_id) */
  async clearUserSearches(userId: string) {
    await this.db.execute(sql`update search_logs set user_id = null where user_id = ${userId}`);
  }

  async userViewed(userId: string, limit: number) {
    const r = rows<{ id: number }>(await this.db.execute(sql`
      select product_id as id from user_product_views where user_id = ${userId} order by viewed_at desc limit ${Math.min(limit, 50)}`));
    return r.map((x) => x.id);
  }

  async clearUserViewed(userId: string) {
    await this.db.execute(sql`delete from user_product_views where user_id = ${userId}`);
  }
}
