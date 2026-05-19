import { TaskSavedSuccessModal } from "@/components/tasks/task-saved-success-modal";
import { TodayDashboard } from "@/components/today-dashboard";
import { getTodayTasks } from "@/lib/tasks/queries";

export default async function TodayPage() {
  const todayData = await getTodayTasks();

  return (
    <>
      <TaskSavedSuccessModal description="Your changes are now in today's task list." />
      <TodayDashboard {...todayData} />
    </>
  );
}
