import { TodayDashboard } from "@/components/today-dashboard";
import { getTodayTasks } from "@/lib/tasks/queries";

export default async function TodayPage() {
  const todayData = await getTodayTasks();

  return <TodayDashboard {...todayData} />;
}
