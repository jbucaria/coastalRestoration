import { addDoc, updateDoc, collection } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { Alert } from 'react-native'

// Create Ticket Function
export const createTicket = async (ticketData, resetForm, setIsSubmitting) => {
  try {
    const docRef = await addDoc(collection(firestore, 'tickets'), {
      ...ticketData,
      createdAt: new Date(),
      typeOfJob: ticketData.typeOfJob, // Ensure this is part of ticketData
    })

    const docId = docRef.id
    const lastSix = docId.slice(-6)
    const ticketNumber = `CR-${lastSix}`
    await updateDoc(docRef, { projectId: docId, ticketNumber })

    Alert.alert('Success', 'Ticket created successfully.')
    // Reset the form after a successful save
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
  setIsSubmitting
) => {
  if (setIsSubmitting) return
  setIsSubmitting(true)

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
    await createTicket(ticketData, resetForm, setIsSubmitting)
  } catch (error) {
    console.error('Error creating the ticket:', error)
    Alert.alert('Error', 'Failed to create the ticket. Please try again.')
  } finally {
    setIsSubmitting(false)
  }
}
