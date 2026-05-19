export type TaskActionState = {
  message: string;
  status: "idle" | "success" | "error";
  taskId?: string;
};

export const initialTaskActionState: TaskActionState = {
  message: "",
  status: "idle",
};
