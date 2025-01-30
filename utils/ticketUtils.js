import { Alert } from 'react-native'
import { router } from 'expo-router'
import {
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
  increment,
} from 'firebase/firestore'
import { auth, firestore } from '@/firebaseConfig'

// Create Ticket Function
export const createTicket = async (
  ticketData,
  resetForm,
  setIsSubmitting,
  user,
  newNote
) => {
  try {
    const docRef = await addDoc(collection(firestore, 'tickets'), {
      createdAt: new Date(),
    })

    const docId = docRef.id
    const lastSix = docId.slice(-6)
    const ticketNumber = `CR-${lastSix}`
    await updateDoc(docRef, { projectId: docId, ticketNumber, ...ticketData })

    if (newNote.trim()) {
      await addDoc(collection(firestore, 'ticketNotes'), {
        projectId: docRef.id,
        userId: auth.currentUser.uid,
        userName: user?.displayName || auth.currentUser.email,
        message: newNote,
        timestamp: serverTimestamp(),
      })
      await updateDoc(docRef, { messageCount: increment(1) })
    }

    Alert.alert('Success', 'Ticket created successfully.')
    router.push('/(tabs)')
    resetForm()
  } catch (error) {
    console.error('Error creating ticket:', error)
    Alert.alert('Error', 'Failed to create the ticket. Please try again.')
  } finally {
    setIsSubmitting(false)
  }
}

// Handle Create Ticket Function (with validation)
export const handleCreateTicket = async (
  newTicket,
  selectedDate,
  startTime,
  endTime,
  resetForm,
  setIsSubmitting,
  isSubmitting,
  newNote,
  user
) => {
  if (isSubmitting) return // Use isSubmitting here to prevent multiple submissions
  setIsSubmitting(true) // Set loading state

  try {
    // Validation
    if (
      !newTicket.street ||
      !newTicket.city ||
      !newTicket.state ||
      !newTicket.zip ||
      !newTicket.customer
    ) {
      Alert.alert('Validation Error', 'Please fill out all required fields.')
      setIsSubmitting(false)
      return
    }

    const formattedNumber = newTicket.customerNumber
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')

    const composedAddress = `${newTicket.street}${
      newTicket.apt ? ' Apt ' + newTicket.apt : ''
    }, ${newTicket.city}, ${newTicket.state} ${newTicket.zip}`

    const ticketData = {
      ...newTicket,
      contactNumber: formattedNumber,
      address: composedAddress,
      startDate: selectedDate,
      startTime: startTime,
      endTime: endTime,
      createdAt: new Date(),
    }

    // Call createTicket function
    await createTicket(ticketData, resetForm, setIsSubmitting, user, newNote)
  } catch (error) {
    console.error('Error creating the ticket:', error)
    Alert.alert('Error', 'Failed to create the ticket. Please try again.')
  } finally {
    router.push('/(tabs)')
    setIsSubmitting(false) // Always set to false after completion
  }
}
