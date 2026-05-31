import { PlannerCalendar } from "@/components/planner/planner-calendar";
import { getPlannerCalendarData } from "@/lib/planner/queries";

type PlannerPageProps = {
  searchParams: Promise<{
    date?: string | string[];
    view?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PlannerPage({ searchParams }: PlannerPageProps) {
  const resolvedSearchParams = await searchParams;
  const plannerData = await getPlannerCalendarData({
    date: firstParam(resolvedSearchParams.date),
    view: firstParam(resolvedSearchParams.view),
  });

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
          Schedule useful structure for {plannerData.date} without connecting an
          external calendar.
        </p>
      </div>

      <PlannerCalendar data={plannerData} />
    </div>
  );
}
