"use client";

import { createContext, useCallback, useContext, useMemo, useRef } from "react";

type OpenCreateTaskModalHandler = () => void;

type TaskLauncherContextValue = {
  openCreateTaskModal: () => void;
  registerOpenCreateTaskModal: (
    handler: OpenCreateTaskModalHandler,
  ) => () => void;
};

const TaskLauncherContext = createContext<TaskLauncherContextValue | null>(
  null,
);

export function TaskLauncherProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const openCreateTaskModalRef = useRef<OpenCreateTaskModalHandler | null>(
    null,
  );

  const openCreateTaskModal = useCallback(() => {
    openCreateTaskModalRef.current?.();
  }, []);

  const registerOpenCreateTaskModal = useCallback(
    (handler: OpenCreateTaskModalHandler) => {
      openCreateTaskModalRef.current = handler;

      return () => {
        if (openCreateTaskModalRef.current === handler) {
          openCreateTaskModalRef.current = null;
        }
      };
    },
    [],
  );

  const value = useMemo(
    () => ({
      openCreateTaskModal,
      registerOpenCreateTaskModal,
    }),
    [openCreateTaskModal, registerOpenCreateTaskModal],
  );

  return (
    <TaskLauncherContext.Provider value={value}>
      {children}
    </TaskLauncherContext.Provider>
  );
}

export function useTaskLauncher() {
  const context = useContext(TaskLauncherContext);

  if (!context) {
    throw new Error(
      "useTaskLauncher must be used within TaskLauncherProvider.",
    );
  }

  return context;
}
