export function Marquee({ words }: { words: string[] }) {
  const list = [...words, ...words];
  return (
    <div className="mt-16 overflow-hidden border-y border-line py-4 md:mt-24" aria-hidden>
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-display text-2xl italic text-ink-soft motion-reduce:animate-none">
        {list.map((w, i) => <span key={i} className="flex items-center gap-10">{w}<span className="text-gold">✦</span></span>)}
      </div>
    </div>
  );
}
