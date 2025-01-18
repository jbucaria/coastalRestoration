// RootLayout.js
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useRouter, useSegments, Slot } from 'expo-router'
import { ThemeProvider, DefaultTheme } from '@react-navigation/native'

import { auth, firestore } from '@/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import useUserStore from '@/store/useUserStore'

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const router = useRouter()
  const segments = useSegments()
  const { setUser, user } = useUserStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(firestore, 'users', firebaseUser.uid)
          const userDocSnap = await getDoc(userDocRef)
          const profileData = userDocSnap.exists() ? userDocSnap.data() : {}
          const userData = { ...firebaseUser, ...profileData }
          setUser(userData)
        } catch (error) {
          console.error('Error fetching user profile:', error)
        }
      } else {
        setUser(null)
      }
      setProfileLoaded(true)
      if (initializing) setInitializing(false)
    })
    return unsubscribe
  }, [initializing, setUser])

  useEffect(() => {
    if (initializing || !profileLoaded) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!auth.currentUser && !inAuthGroup) {
      router.replace('/login')
      return
    }

    if (auth.currentUser) {
      if (!user || !user.onboarded) {
        router.replace('/onboarding')
        return
      }
      if (user.onboarded && inAuthGroup) {
        router.replace('/(tabs)')
      }
    }
  }, [initializing, profileLoaded, segments, router, user])

  if (initializing || !profileLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    )
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Slot />
    </ThemeProvider>
  )
}
