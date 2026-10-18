import Link from "next/link";
import type { StyleDTO } from "@/server/domain/types";
import { Reveal } from "@/components/ui/reveal";
import { SmartImage } from "@/components/ui/smart-image";

export function StyleTiles({ styles }: { styles: (StyleDTO & { count: number })[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-6">
      {styles.map((s, i) => (
        <Reveal as="li" key={s.slug} delay={(i % 6) * 0.06}>
          <Link href={`/phong-cach/${s.slug}`} className="group relative block aspect-[3/4] overflow-hidden bg-sand">
            <SmartImage src={s.heroImage} alt={`Phong cách ${s.name}`} sizes="(min-width:1280px) 16vw, (min-width:768px) 33vw, 50vw" className="transition-transform duration-700 ease-[var(--ease-lux)] group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 p-4 text-ivory">
              <span className="font-display block text-2xl leading-tight">{s.name}</span>
              <span className="mt-1.5 block text-[10px] uppercase tracking-[0.22em] text-ivory/80">{s.count} sản phẩm</span>
            </span>
          </Link>
        </Reveal>
      ))}
    </ul>
  );
}
