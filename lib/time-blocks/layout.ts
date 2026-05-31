export type OverlapLaneLayout = {
  lane: number;
  laneCount: number;
};

type OverlapLaneInput = {
  endMinutes: number;
  id: string;
  startMinutes: number;
};

type ActiveLaneItem = {
  endMinutes: number;
  lane: number;
};

function getFirstAvailableLane(activeItems: ActiveLaneItem[]) {
  const usedLanes = new Set(activeItems.map((item) => item.lane));
  let lane = 0;

  while (usedLanes.has(lane)) {
    lane += 1;
  }

  return lane;
}

export function computeOverlapLaneLayout<T extends OverlapLaneInput>(
  items: T[],
) {
  const byId = new Map<string, OverlapLaneLayout>();

  if (items.length === 0) {
    return byId;
  }

  const sorted = [...items].sort((left, right) => {
    if (left.startMinutes !== right.startMinutes) {
      return left.startMinutes - right.startMinutes;
    }

    if (left.endMinutes !== right.endMinutes) {
      return left.endMinutes - right.endMinutes;
    }

    return left.id.localeCompare(right.id);
  });

  let activeItems: ActiveLaneItem[] = [];
  let clusterIds: string[] = [];
  let clusterLaneCount = 1;

  function finalizeCluster() {
    if (clusterIds.length === 0) {
      return;
    }

    for (const id of clusterIds) {
      const existing = byId.get(id);

      if (!existing) {
        continue;
      }

      byId.set(id, {
        lane: existing.lane,
        laneCount: Math.max(1, clusterLaneCount),
      });
    }

    clusterIds = [];
    clusterLaneCount = 1;
  }

  for (const item of sorted) {
    const boundedStart = Math.max(0, item.startMinutes);
    const boundedEnd = Math.max(boundedStart + 1, item.endMinutes);

    activeItems = activeItems.filter(
      (activeItem) => activeItem.endMinutes > boundedStart,
    );

    if (activeItems.length === 0) {
      finalizeCluster();
    }

    const lane = getFirstAvailableLane(activeItems);

    activeItems.push({
      endMinutes: boundedEnd,
      lane,
    });

    clusterIds.push(item.id);
    clusterLaneCount = Math.max(clusterLaneCount, lane + 1);

    byId.set(item.id, {
      lane,
      laneCount: 1,
    });
  }

  finalizeCluster();

  return byId;
}
