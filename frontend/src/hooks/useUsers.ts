import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services/userService'
import type { InviteUserRequest, UpdateUserRequest } from '@/types/user'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => userService.list(),
  })
}

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: InviteUserRequest) => userService.invite(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      userService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
