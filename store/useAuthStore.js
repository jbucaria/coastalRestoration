import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    set => ({
      quickBooksCompanyId: null,
      quickBooksClientId: null,
      accessToken: null,
      refreshToken: null,

      // ✅ Set credentials after login
      setCredentials: ({
        quickBooksCompanyId,
        quickBooksClientId,
        accessToken,
        refreshToken,
      }) =>
        set({
          quickBooksCompanyId,
          quickBooksClientId,
          accessToken,
          refreshToken,
        }),

      // ✅ Clear credentials on logout
      clearCredentials: () =>
        set({
          quickBooksCompanyId: null,
          quickBooksClientId: null,
          accessToken: null,
          refreshToken: null,
        }),
    }),
    {
      name: 'auth-storage',
      storage: {
        getItem: async key => {
          try {
            const value = await AsyncStorage.getItem(key)
            return value ? JSON.parse(value) : null // ✅ Parse JSON before returning
          } catch (error) {
            console.error(`Error getting ${key} from storage:`, error)
            return null
          }
        },
        setItem: async (key, value) => {
          try {
            await AsyncStorage.setItem(key, JSON.stringify(value)) // ✅ Stringify object before storing
          } catch (error) {
            console.error(`Error setting ${key} in storage:`, error)
          }
        },
        removeItem: async key => {
          try {
            await AsyncStorage.removeItem(key)
          } catch (error) {
            console.error(`Error removing ${key} from storage:`, error)
          }
        },
      },
    }
  )
)

export default useAuthStore
