"use client";

type Props = {
  current: number;
  limit: number;
};

export default function CharacterCounter({ current, limit }: Props) {
  const pct = limit > 0 ? current / limit : 0;

  const colorClass =
    current > limit
      ? "text-destructive font-semibold"
      : pct >= 0.9
      ? "text-amber-600"
      : "text-muted-foreground";

  return (
    <span className={`text-xs tabular-nums ${colorClass}`}>
      {current}/{limit}
    </span>
  );
}
