interface Task {
  id: string;
  title: string;
  estimatedTime: number;
  actualTime: number;
  description?: string;
  status: TaskStatus;
  isTaskBreak?: boolean;
  subTasks: SubTask[];
  scheduledDate?: string;
  scheduleSlots?: ScheduleSlot[];
  lastNotifiedDate?: string;
}

interface SubTask{
  id: string;
  title: string;
  completed: boolean;
}
