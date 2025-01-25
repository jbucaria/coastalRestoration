import React from 'react'
import { router } from 'expo-router'
import { TouchableOpacity } from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol'

const FloatingBackButton = ({ color }) => {
  return (
    <TouchableOpacity
      style={{
        position: 'absolute',
        top: 40,
        left: 10,
        backgroundColor: color,
        padding: 10,
        borderRadius: 30,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
      }}
      onPress={() => router.back()}
    >
      <IconSymbol name="arrow.backward.square" size={24} color="white" />
    </TouchableOpacity>
  )
}

export { FloatingBackButton }
