import Link from "next/link";

interface Props {
  body: string;
}

/**
 * Renders a story body with @username mentions linkified.
 * The body is otherwise plain text with whitespace preserved.
 */
export default function StoryBody({ body }: Props) {
  // Split on @username tokens, preserving them
  const parts: Array<{ type: "text" | "mention"; value: string }> = [];
  const regex = /@([a-zA-Z0-9_]{2,30})/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(body)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: "text", value: body.slice(lastIndex, m.index) });
    }
    parts.push({ type: "mention", value: m[1] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < body.length) {
    parts.push({ type: "text", value: body.slice(lastIndex) });
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "mention") {
          return (
            <Link
              key={i}
              href={`/${part.value}`}
              className="text-accent hover:underline"
            >
              @{part.value}
            </Link>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </>
  );
}
