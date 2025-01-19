import React, { useState, useEffect } from 'react'
import { View, Text, Switch, StyleSheet, Alert } from 'react-native'
import { doc, updateDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'

const SwitchComponent = ({ projectId, field, label, value, onShowModal }) => {
  const [switchValue, setSwitchValue] = useState(value)

  const handleToggle = async newValue => {
    setSwitchValue(newValue)
    try {
      // Update Firestore field
      const projectRef = doc(firestore, 'projects', projectId)
      await updateDoc(projectRef, { [field]: newValue })

      if (onShowModal && newValue) {
        onShowModal() // Show modal when toggled on and `onShowModal` is provided
      }
    } catch (error) {
      console.error(`Failed to update ${field}:`, error)
      Alert.alert('Error', 'Failed to update the project. Please try again.')
    }
  }

  useEffect(() => {
    setSwitchValue(value) // Update local state if the `value` prop changes
  }, [value])

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={switchValue}
        onValueChange={handleToggle}
        trackColor={{ false: '#ccc', true: '#2ecc71' }}
        thumbColor={switchValue ? '#2C3E50' : '#f4f3f4'}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f7f7f7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  label: {
    fontSize: 16,
    color: '#2C3E50',
  },
})

export default SwitchComponent
