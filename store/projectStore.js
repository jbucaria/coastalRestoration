// stores/projectStore.js
import { create } from 'zustand'

const useProjectStore = create(set => ({
  projects: [],
  setProjects: newProjects => set({ projects: newProjects }),
  updateProject: (projectId, update) =>
    set(state => ({
      projects: state.projects.map(project =>
        project.id === projectId ? { ...project, ...update } : project
      ),
    })),
}))

export { useProjectStore }
