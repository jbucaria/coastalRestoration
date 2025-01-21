import React from 'react'
import { View, Text } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

const remediationScreen = () => {
  const params = useLocalSearchParams()
  const projectId = params.projectId
  return (
    <View className="flex-1 justify-center items-center">
      <Text>Project Id: {projectId}</Text>
    </View>
  )
}

export default remediationScreen
