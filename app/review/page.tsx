import { weeklyReviewItems } from "@/lib/mock-data";
import { Badge, Panel } from "@/components/ui/primitives";

const toneByCategory = {
  wins: "success",
  misses: "warning",
  next: "default",
} as const;

export default function WeeklyReviewPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Weekly Review</h2>
      <Panel>
        <p className="text-sm text-slate-300">
          End-of-week operating review (mock-backed). Use this page to capture wins, misses, and next-week commitments.
        </p>
      </Panel>
      <div className="grid gap-4 md:grid-cols-3">
        {weeklyReviewItems.map((item) => (
          <Panel key={item.id}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold capitalize">{item.category}</h3>
              <Badge tone={toneByCategory[item.category]}>{item.category}</Badge>
            </div>
            <p className="text-sm font-medium text-slate-200">{item.title}</p>
            <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
          </Panel>
        ))}
      </div>
    </div>
  );
}
