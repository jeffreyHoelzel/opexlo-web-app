import { TaskSavedSuccessModal } from "@/components/tasks/task-saved-success-modal";
import { TodayDashboard } from "@/components/today-dashboard";
import { getTimeBlockDayData } from "@/lib/time-blocks/queries";

export default async function TodayPage() {
  const todayData = await getTimeBlockDayData();

  return (
    <>
      <TaskSavedSuccessModal description="Your changes are now in today's task list." />
      <TodayDashboard
        tasks={todayData.tasks}
        timeBlockData={todayData}
        todayDate={todayData.date}
        timezone={todayData.timezone}
      />
    </>
  );
}
