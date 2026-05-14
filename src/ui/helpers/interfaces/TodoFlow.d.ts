interface ScheduleSlot {
  dateKey: string;
  startTime: string;
  endTime: string;
}

interface TodoFlow {
  id: string;
  note: string;
  status: TodoStatus;
  taskCompleted: number;
  taskTotal: number;
  estimatedTimeTodo: number;
  actualTimeTodo: number;
  taskIds: string[];
  tasks: { [key: string]: Task };
  currentTaskId?: string;
  timeLeft?: number;
  timer?: NodeJS.Timeout | null;
  scheduledDate?: string;
  scheduledDates?: string[];
  scheduleSlots?: ScheduleSlot[];
  lastNotifiedDate?: string;
}
