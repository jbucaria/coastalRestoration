import React from 'react'
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol'

/**
 * HeaderComponent
 *
 * Props:
 * - title: string to display in the center.
 * - onBack: callback for the back button.
 * - onOptions: callback for the options (three-dots) button.
 * - translateY: (optional) animated translateY value for the header.
 */
const HeaderComponent = ({ title, onBack, onOptions, translateY }) => {
  return (
    <Animated.View
      style={[styles.topBar, translateY && { transform: [{ translateY }] }]}
    >
      <TouchableOpacity onPress={onBack} style={styles.headerButton}>
        <IconSymbol name="arrow.backward" color="black" size={24} />
      </TouchableOpacity>
      <Text style={styles.topBarTitle}>{title}</Text>
      <TouchableOpacity onPress={onOptions} style={styles.headerButton}>
        <IconSymbol name="ellipsis" color="black" size={24} />
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  headerButton: {
    marginRight: 10,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: 'black',
    textAlign: 'center',
  },
})

export { HeaderComponent }
