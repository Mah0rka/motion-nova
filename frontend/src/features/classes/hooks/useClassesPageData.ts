import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  completeSchedule,
  getMyClasses,
  getScheduleAttendees,
  getSchedules,
  queryKeys
} from "../../../shared/api";
import { useBranchStore } from "../../branches/model/store";

type UseClassesPageDataOptions = {
  isManagement: boolean;
  selectedClassId: string | null;
};

export function useClassesPageData({
  isManagement,
  selectedClassId
}: UseClassesPageDataOptions) {
  const queryClient = useQueryClient();
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);

  const classesQuery = useQuery({
    queryKey: isManagement ? queryKeys.classes.all(selectedBranchId) : queryKeys.classes.mine(selectedBranchId),
    queryFn: () => (isManagement ? getSchedules() : getMyClasses())
  });

  const attendeesQuery = useQuery({
    queryKey: queryKeys.classes.attendees(selectedClassId),
    queryFn: () => getScheduleAttendees(selectedClassId as string),
    enabled: Boolean(selectedClassId)
  });

  const completeMutation = useMutation({
    mutationFn: ({ classId, comment }: { classId: string; comment: string }) =>
      completeSchedule(classId, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.mine(selectedBranchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all(selectedBranchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all(selectedBranchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.myClasses(selectedBranchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.schedules(selectedBranchId) });
    }
  });

  return {
    classesQuery,
    attendeesQuery,
    completeMutation
  };
}
