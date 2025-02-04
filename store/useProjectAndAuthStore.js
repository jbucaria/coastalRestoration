import { create } from 'zustand'

const useProjectAndAuthStore = create(set => ({
  projectId: null,
  accessToken: null,
  setProjectId: id => set({ projectId: id }),
  setAccessToken: token => set({ accessToken: token }),
  clearProjectId: () => set({ projectId: null }),
  clearAccessToken: () => set({ accessToken: null }),
}))
