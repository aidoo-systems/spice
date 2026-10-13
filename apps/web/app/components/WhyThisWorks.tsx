export default function WhyThisWorks({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null;

  return (
    <ul className="space-y-2">
      {reasons.map((r, i) => (
        <li key={i} className="flex gap-2 text-sm text-stone-600 dark:text-muted">
          <span className="text-spice-500 dark:text-spice-400 mt-0.5">&#x2022;</span>
          <span>{r}</span>
        </li>
      ))}
    </ul>
  );
}
