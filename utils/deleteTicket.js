import { Alert } from 'react-native'
import {
  deleteDoc,
  doc,
  collection,
  getDocs,
  getDoc,
  query,
  where,
} from 'firebase/firestore'
import { getStorage, ref, deleteObject } from 'firebase/storage'
import { firestore, storage } from '@/firebaseConfig'

const deleteTicket = async (ticketId, onTicketDeleted) => {
  try {
    // Show confirmation modal
    Alert.alert(
      'Delete Ticket',
      'Are you sure you want to delete this ticket and all associated notes, photos, and data?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            await performDelete(ticketId, onTicketDeleted)
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    )
  } catch (error) {
    console.error('Error showing delete confirmation:', error)
    Alert.alert(
      'Error',
      'Failed to show delete confirmation. Please try again.'
    )
  }
}

// Perform the actual deletion
const performDelete = async (ticketId, onTicketDeleted) => {
  try {
    // 1. Delete ticket notes associated with the ticket
    const notesQuery = query(
      collection(firestore, 'ticketNotes'),
      where('projectId', '==', ticketId)
    )
    const notesSnapshot = await getDocs(notesQuery)
    notesSnapshot.forEach(async noteDoc => {
      await deleteDoc(doc(firestore, 'ticketNotes', noteDoc.id))
    })

    // 2. Delete photos from Firebase Storage
    const ticketRef = doc(firestore, 'tickets', ticketId)
    const ticketDoc = await getDoc(ticketRef)
    const photos = ticketDoc.data().photos

    if (photos && photos.length > 0) {
      const deletePromises = photos.map(async photoUrl => {
        const photoRef = ref(storage, photoUrl)
        await deleteObject(photoRef)
      })

      await Promise.all(deletePromises)
    }

    // 3. Finally, delete the ticket document
    await deleteDoc(ticketRef)
    Alert.alert('Success', 'Ticket deleted successfully.')

    // Call onTicketDeleted callback if provided
    if (typeof onTicketDeleted === 'function') {
      onTicketDeleted()
    }
  } catch (error) {
    console.error('Error deleting ticket:', error)
    Alert.alert('Error', 'Failed to delete the ticket. Please try again.')
  }
}

export { deleteTicket }
