import * as FileSystem from 'expo-file-system'

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, updateDoc } from 'firebase/firestore'
import { storage, firestore } from '@/firebaseConfig'
import { Alert } from 'react-native'
import { router } from 'expo-router'

// Helper function to mark a report as complete in Firestore
async function onReportComplete(projectId, field, value) {
  try {
    const projectDocRef = doc(firestore, 'tickets', projectId)
    await updateDoc(projectDocRef, { [field]: value })
    console.log(`Ticket field ${field} updated to ${value}`)
  } catch (error) {
    console.error('Error updating ticket:', error)
    Alert.alert('Error', 'Failed to update the ticket. Please try again.')
  }
}

export const handleGenerateReport = async (formData, setIsSaving) => {
  try {
    const { projectId } = formData
    if (!projectId) {
      Alert.alert('Error', 'No project ID provided.')
      setIsSaving(false)
      return
    }

    // 1. Upload Photos to Firebase Storage using the fetch/Blob method
    const photoUrls = await Promise.all(
      formData.photos.map(async (photo, index) => {
        // Use fetch() to get the file from the local URI
        const response = await fetch(photo.uri)
        // Convert the response to a Blob
        const blob = await response.blob()

        // Create a reference for this file in Firebase Storage
        const storageRef = ref(
          storage,
          `tickets/${projectId}/photos/${Date.now()}_${photo.fileName || index}`
        )
        // Upload the file as a blob
        await uploadBytes(storageRef, blob)
        // Get the public download URL
        const downloadURL = await getDownloadURL(storageRef)
        return { uri: downloadURL, label: photo.label }
      })
    )

    // 2. Update formData with the processed photo URLs, a lowercase version of the address, and a timestamp
    formData.photos = photoUrls
    formData.lowercaseAddress = formData.address.toLowerCase()
    formData.timestamp = new Date()

    // 3. Update the project document in Firestore with the updated inspection report data.
    const projectRef = doc(firestore, 'tickets', projectId)
    await updateDoc(projectRef, formData)
    console.log('Ticket (with inspection report info) updated successfully.')

    // 4. Mark the inspection as complete.
    await onReportComplete(projectId, 'inspectionComplete', true)

    // 5. Provide user feedback and navigate after the user taps OK.
    Alert.alert(
      'File Saved',
      'The report has been saved.',
      [
        {
          text: 'OK',
          onPress: () => {
            router.back()
          },
        },
      ],
      { cancelable: false }
    )
  } catch (err) {
    console.error('Error generating PDF or saving to Firestore:', err)
    Alert.alert(
      'Error',
      'An error occurred while generating or saving the report'
    )
    setIsSaving(false)
  }
}
