import React from 'react'
import { Animated, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol'

const FloatingButton = ({ onPress, opacity, title }) => {
  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <TouchableOpacity onPress={onPress} style={styles.button}>
        <IconSymbol name="plus" size={24} color="white" />
        <Text style={styles.buttonText}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1DA1F2',
    borderRadius: 24,
    padding: 16,
  },
  buttonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
  },
})

export { FloatingButton }
