import { TimeBlockingPanel } from "@/components/time-blocks/time-blocking-panel";
import { getTimeBlockDayData } from "@/lib/time-blocks/queries";

export default async function PlannerPage() {
  const timeBlockData = await getTimeBlockDayData();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
          Plan
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground md:text-5xl">
          Shape today before the work starts.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Schedule useful structure for {timeBlockData.date} without connecting
          an external calendar.
        </p>
      </div>

      <TimeBlockingPanel
        blocks={timeBlockData.blocks}
        date={timeBlockData.date}
        description="Place planned tasks into realistic blocks and leave flexible work unscheduled."
        showUnblockedTasks
        taskOptions={timeBlockData.taskOptions}
        timezone={timeBlockData.timezone}
        title="Daily schedule"
        unblockedTasks={timeBlockData.unblockedTasks}
      />
    </div>
  );
}
