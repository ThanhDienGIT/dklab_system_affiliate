import Link from "next/link";
import ReactMarkdown from "react-markdown";

/** Markdown an toan: react-markdown khong render HTML tho; link ngoai mo tab moi + nofollow; anh lazy. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-blog">
      <ReactMarkdown
        components={{
          a: ({ href = "", children: c }) =>
            href.startsWith("/") ? <Link href={href}>{c}</Link> : <a href={href} target="_blank" rel="nofollow noopener noreferrer">{c}</a>,
          // eslint-disable-next-line @next/next/no-img-element
          img: ({ src, alt }) => (typeof src === "string" ? <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="my-6 w-full" /> : null),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
