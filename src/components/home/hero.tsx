import Link from "next/link";
import Image from "next/image";
import type { SiteSettings } from "@/server/domain/settings";

export function Hero({ hero }: { hero: SiteSettings["hero"] }) {
  return (
    <section aria-label="Bộ sưu tập nổi bật">
      <div className="relative aspect-[2056/765] w-full min-h-[190px] overflow-hidden bg-sand">
        {hero.image.startsWith("data:")
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={hero.image} alt={hero.title} className="absolute inset-0 h-full w-full object-cover" />
          : <Image src={hero.image} alt={`${hero.title} - ${hero.subtitle}`} fill priority sizes="100vw" className="object-cover" />}
      </div>
      <div className="container-x py-10 text-center md:py-14">
        <p className="eyebrow animate-fade-up">{hero.eyebrow}</p>
        <h1 className="mt-3 text-4xl md:text-6xl animate-fade-up [animation-delay:.08s]">{hero.title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] text-ink-soft animate-fade-up [animation-delay:.16s]">{hero.subtitle}</p>
        <Link href={hero.ctaHref} className="btn btn-solid mt-7 animate-fade-up [animation-delay:.24s]">{hero.ctaLabel}</Link>
      </div>
    </section>
  );
}
