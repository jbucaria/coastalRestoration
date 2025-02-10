// This file is a fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import React from 'react'
import { StyleSheet } from 'react-native'

// Add your SFSymbol to MaterialIcons mappings here.
const MAPPING = {
  // See MaterialIcons here: https://icons.expo.fyi
  // See SF Symbols in the SF Symbols app on Mac.
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'photo.badge.plus.fill': 'add-a-photo',
  'arrow.2.left': 'arrow-back',
}

/**
 * A cross-platform icon component that uses MaterialIcons on Android & web.
 * Designed for consistent iconography across platforms.
 *
 * @param {Object} props
 * @param {string} props.name - The SF Symbol name (mapped to MaterialIcons).
 * @param {number} [props.size=24] - Icon size.
 * @param {string} props.color - Icon color.
 * @param {Object} [props.style] - Additional styles.
 * @returns {JSX.Element} - The MaterialIcons component.
 */
export function IconSymbol({ name, size = 24, color, style }) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name] || 'help-outline'} // Default fallback
      style={[styles.icon, style]}
    />
  )
}

const styles = StyleSheet.create({
  icon: {
    alignSelf: 'center',
  },
})

export default IconSymbol
