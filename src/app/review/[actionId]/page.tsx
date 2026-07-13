import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { ActionDetail } from "@/components/review/action-detail";
import { actions } from "@/data/demo-data";

export default async function ReviewActionPage({
  params,
}: {
  params: Promise<{ actionId: string }>;
}) {
  const { actionId } = await params;
  const action = actions.find((a) => a.id === actionId);

  if (!action) {
    notFound();
  }

  return (
    <div>
      <PageHeader title={action.title} description={action.summary} />
      <ActionDetail actionId={action.id} />
    </div>
  );
}
