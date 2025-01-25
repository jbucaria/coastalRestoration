import React, { useState } from 'react'
import { TouchableOpacity, StyleSheet, Text, Keyboard } from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol'

const ChevronKeyboardToggle = () => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  const handleToggleKeyboard = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss()
    } else {
      Keyboard.show()
    }
    setIsKeyboardVisible(!isKeyboardVisible)
  }

  return (
    <TouchableOpacity
      style={styles.chevronContainer}
      onPress={handleToggleKeyboard}
    >
      <IconSymbol
        name={isKeyboardVisible ? 'chevron-down' : 'chevron-up'}
        size={30}
        color="#2980b9"
      />
      <Text style={styles.chevronLabel}>
        {isKeyboardVisible ? 'Dismiss Keyboard' : 'Show Keyboard'}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chevronContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  chevronLabel: {
    marginLeft: 10,
    fontSize: 16,
    color: '#2980b9',
    fontWeight: '500',
  },
})

export { ChevronKeyboardToggle }
