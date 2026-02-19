import { PipelineBoard } from "@/components/modules/pipeline-board";

export default function PipelinePage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Content Pipeline</h2>
      <PipelineBoard />
    </div>
  );
}
