import { focusThree } from "@/lib/mock-data";
import { Badge, Panel } from "@/components/ui/primitives";

export function FocusThreeWidget() {
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Focus 3</h3>
        <span className="text-xs text-slate-400">Daily priority lock</span>
      </div>
      <div className="space-y-2">
        {focusThree.map((item, index) => (
          <div key={item.id} className="rounded-lg bg-slate-800 p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{index + 1}. {item.title}</p>
              <Badge tone={item.status === "at-risk" ? "warning" : "success"}>{item.status}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-400">{item.owner} · {item.estimateHours}h block</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
