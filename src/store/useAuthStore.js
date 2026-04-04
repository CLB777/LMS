import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  role: null, // 'Estudiante', 'Docente', 'Admin'
  profile: null,
  session: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setProfile: (profile) => set({ profile }),
  setSession: (session) => set({ session }),
  setIsLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, role: null, profile: null, session: null })
}));

export default useAuthStore;
