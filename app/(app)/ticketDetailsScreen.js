// ticketDetailsScreen.js
import React, { useState, useEffect } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  Alert,
  Platform,
  Linking,
} from 'react-native'
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { getTravelTime } from '@/utils/getTravelTime'
import { SwitchComponent } from '@/components/SwitchComponent'
import { EquipmentModal } from '@/components/EquipmentModal'
import { PhotoModal } from '@/components/PhotoModal'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { FloatingBackButton } from '@/components/FloatingBackButton'
import { deleteTicket } from '@/utils/deleteTicket'

// If you want to handle photo viewing in a modal, import PhotoModal from somewhere...
// import PhotoModal from '@/components/PhotoModal' // if needed

const TicketDetailsScreen = () => {
  const router = useRouter()
  const { projectId } = useLocalSearchParams()

  const [ticket, setTicket] = useState(null)
  const [eta, setEta] = useState(null)
  const [isEquipmentModalVisible, setIsEquipmentModalVisible] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  useEffect(() => {
    if (!projectId) return

    const ticketRef = doc(firestore, 'tickets', projectId)
    const unsubscribe = onSnapshot(
      ticketRef,
      docSnap => {
        if (docSnap.exists()) {
          setTicket({ id: docSnap.id, ...docSnap.data() })
        } else {
          // Alert.alert('Not Found', 'Ticket does not exist.')
          router.back()
        }
      },
      error => {
        console.error('Error fetching ticket data:', error)
        Alert.alert('Error', 'Unable to fetch ticket data.')
      }
    )

    // Clean up the subscription on unmount
    return () => unsubscribe()
  }, [projectId])

  useEffect(() => {
    if (ticket?.address) {
      getTravelTime(ticket.address)
        .then(info => setEta(info.durationText))
        .catch(error => {
          console.error('Error fetching travel time:', error)
          setEta('N/A')
        })
    } else {
      setEta(null)
    }
  }, [ticket])

  if (!ticket) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading ticket details...</Text>
      </SafeAreaView>
    )
  }

  // Use Linking to open addresses in maps
  const openGoogleMapsWithETA = async address => {
    try {
      const url = Platform.select({
        ios: `comgooglemaps://?q=${encodeURIComponent(address)}`,
        android: `geo:0,0?q=${encodeURIComponent(address)}`,
      })
      if (Platform.OS === 'ios') {
        const supported = await Linking.canOpenURL('comgooglemaps://')
        if (supported) {
          await Linking.openURL(url)
        } else {
          await Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              address
            )}`
          )
        }
      } else {
        await Linking.openURL(url)
      }
    } catch (error) {
      console.error('Error opening maps with ETA:', error)
      Alert.alert('Error', 'Failed to open navigation.')
    }
  }

  const handleDeleteTicket = () => {
    deleteTicket(projectId, () => {
      router.push('/(tabs)')
    })
  }

  const handleCall = phoneNumber => {
    Alert.alert('Contact Options', 'Would you like to call or text?', [
      {
        text: 'Call',
        onPress: () => {
          const phoneUrl =
            Platform.OS === 'android'
              ? `tel:${phoneNumber}`
              : `telprompt:${phoneNumber}`
          Linking.canOpenURL(phoneUrl)
            .then(supported => {
              if (!supported) {
                Alert.alert('Phone number is not available')
              } else {
                return Linking.openURL(phoneUrl)
              }
            })
            .catch(err => console.error('An error occurred', err))
        },
      },
      {
        text: 'Text',
        onPress: () => {
          const smsUrl = `sms:${phoneNumber}`
          Linking.canOpenURL(smsUrl)
            .then(supported => {
              if (!supported) {
                Alert.alert('SMS is not available')
              } else {
                return Linking.openURL(smsUrl)
              }
            })
            .catch(err => console.error('An error occurred', err))
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ])
  }

  // Example placeholder for start inspection
  const handleInspection = () => {
    if (!ticket) {
      Alert.alert('Error', 'No ticket selected for inspection or viewing.')
      return
    }
    const route = ticket.inspectionComplete
      ? '/ViewReport'
      : '/InspectionScreen'
    router.push({
      pathname: route,
      params: { projectId: ticket.projectId },
    })
  }

  const handleRemediation = () => {
    if (!ticket) {
      Alert.alert('Error', 'No ticket selected for inspection or viewing.')
      return
    }
    const route = ticket.remediationComplete
      ? '/ViewRemediationScreen'
      : '/RemediationScreen'
    router.push({
      pathname: route,
      params: { projectId: ticket.projectId },
    })
  }

  // Example open Chat
  const openNotes = () => {
    router.push({
      pathname: '/TicketNotesScreen',
      params: { projectId: ticket.id },
    })
  }
  const openMeasurements = () => {
    router.push({
      pathname: '/ViewRemediationScreen',
      params: { projectId: ticket.id },
    })
  }

  // Example function to handle photos
  const handlePhotoPress = uri => {
    // If you want to show the photo in a modal or screen:
    setSelectedPhoto(uri)
  }

  // Example function to close photo
  const closePhoto = () => {
    setSelectedPhoto(null)
  }

  // If you want to do a "Remediation Toggle" logic, you can replicate from your old code
  const handleRemediationToggle = value => {
    // e.g. setTicket(prev => ({ ...prev, remediationRequired: value }))
    if (value) {
      Alert.alert(
        'Input Measurements',
        'Would you like to input measurements now?',
        [
          {
            text: 'Yes',
            onPress: () => {
              router.push({
                pathname: '/RemediationScreen',
                params: { projectId: ticket.id },
              })
            },
          },
          {
            text: 'No',
            onPress: () => {
              console.log('User chose to input measurements later.')
            },
            style: 'cancel',
          },
        ],
        { cancelable: true }
      )
    }
  }

  const handleSiteComplete = () => {
    const newStatus = !ticket.siteComplete
    const actionText = newStatus ? 'complete' : 'incomplete'
    Alert.alert(
      'Confirm',
      `Are you sure you want to mark this site as ${actionText}?`,
      [
        {
          text: 'Yes',
          onPress: async () => {
            try {
              // Update Firestore to toggle the site complete status
              const projectRef = doc(firestore, 'tickets', ticket.id)
              await updateDoc(projectRef, { siteComplete: newStatus })

              console.log(`Site marked as ${actionText}!`)
              Alert.alert(
                'Success',
                `The site has been marked as ${actionText}.`
              )
              router.push('/(tabs)') // Assuming '/(tabs)' is the home route
            } catch (error) {
              console.error(`Error marking site as ${actionText}:`, error)
              Alert.alert(
                'Error',
                `Failed to mark the site as ${actionText}. Please try again.`
              )
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => router.push('/(tabs)'), // Also go home on cancel if needed
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER SECTION */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <Text style={styles.ticketTitle}>{ticket.street}</Text>
          <Text style={styles.ticketTitle}>
            {ticket.city}, {ticket.state} {ticket.zip}
          </Text>
          <TouchableOpacity
            onPress={() => openGoogleMapsWithETA(ticket.address)}
            style={styles.etaContainer}
          >
            <Text style={styles.etaLabel}>Estimated Arrival:</Text>
            <Text style={styles.etaValue}>{eta}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* CUSTOMER INFO */}
        <View style={styles.sectionContainer}>
          <View style={styles.sideBySideContainer}>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Builder:</Text>
              <Text style={styles.value}>{ticket.customer || 'N/A'}</Text>
              <Text style={styles.value}>{ticket.customerName || 'N/A'}</Text>
              <Text
                onPress={() => handleCall(ticket.contactNumber)}
                style={[styles.value, styles.link]}
              >
                {ticket.contactNumber || 'N/A'}
              </Text>
            </View>

            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Homeowner:</Text>
              <Text style={styles.value}>{ticket.homeOwnerName || 'N/A'}</Text>
              <Text
                onPress={() => handleCall(ticket.homeOwnerNumber)}
                style={[styles.value, styles.link]}
              >
                {ticket.homeOwnerNumber || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* INSPECTOR & REASON */}
        <View style={styles.sectionContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Inspector:</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.value}>{ticket.inspectorName || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Reason for Visit:</Text>
          </View>
          <View style={styles.reasonRow}>
            <Text style={styles.value}>{ticket.reason || 'N/A'}</Text>
          </View>
        </View>

        {/* EQUIPMENT MODAL */}
        <EquipmentModal
          visible={isEquipmentModalVisible}
          onClose={() => setIsEquipmentModalVisible(false)}
          projectId={ticket.id}
        />

        {/* PHOTOS */}
        {ticket.ticketPhotos && ticket.ticketPhotos.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Photos</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ticket.ticketPhotos.map((photoUri, index) => {
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handlePhotoPress(photoUri)}
                  >
                    <Image
                      source={{ uri: photoUri }}
                      style={styles.projectPhoto}
                      onError={e =>
                        console.log('Image loading error:', e.nativeEvent.error)
                      }
                    />
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* STATUS SECTION */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Status:</Text>

          <View style={styles.sectionContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Equipment Total</Text>
              <Text style={styles.value}>{ticket.equipmentTotal || '0'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Measurements Req.</Text>
              <Text style={styles.value}>
                {ticket.remediationRequired ? 'True' : 'False'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Inspection Report Req.</Text>
              <Text style={styles.value}>
                {!ticket.inspectionComplete ? 'True' : 'False'}
              </Text>
            </View>
          </View>
        </View>

        {/* Move all buttons to the bottom */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={openNotes} style={styles.button}>
            <IconSymbol name="note.text" size={24} color="#007BFF" />
            <Text style={styles.buttonText}>
              {ticket.messageCount ? 'View Notes' : 'Add Note'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleInspection} style={styles.button}>
            <Text style={styles.buttonText}>
              {ticket.inspectionComplete
                ? 'View Inspection Report'
                : 'Perform Inspection'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRemediation} style={styles.button}>
            <Text style={styles.buttonText}>
              {ticket.remediationComplete
                ? 'View Remediation'
                : 'Complete Remediation.'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()} // Assuming you're using React Navigation
          >
            <Text style={styles.actionButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeleteTicket}
            style={styles.dangerButton}
          >
            <Text style={styles.dangerButtonText}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSiteComplete}
            style={[
              styles.siteCompleteButton,
              ticket.siteComplete ? styles.siteIncompleteButton : null,
            ]}
          >
            <Text style={styles.siteCompleteButtonText}>
              {ticket.siteComplete ? 'Incomplete' : 'Complete'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* FULL PHOTO PREVIEW */}
        <PhotoModal
          visible={selectedPhoto !== null}
          photo={selectedPhoto}
          onClose={closePhoto}
        />

        {/* FULL PHOTO PREVIEW */}
        <PhotoModal
          visible={selectedPhoto !== null}
          photo={selectedPhoto}
          onClose={closePhoto}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: '#2C3E50',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actionButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionsContainer: {
    marginTop: 12,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#007BFF',
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  buttonContainer: {
    flexDirection: 'column', // Changed to column for stacked buttons
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
    backgroundColor: '#F5F7FA',
  },
  button: {
    backgroundColor: '#E3F2FD',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center content
    width: '100%', // Full width for better touch area on mobile
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#007BFF',
    fontWeight: '600',
  },
  column: {
    flex: 1,
    marginRight: 15,
    gap: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 16,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  dangerButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    marginTop: 20,
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerCard: {
    marginTop: 0,
    backgroundColor: '#F5F7FA',
    padding: 10,
    marginBottom: 5,
  },
  etaContainer: {
    backgroundColor: '#2ECC71',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignSelf: 'center',
    margin: 12,
  },
  etaLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  etaValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  floatingBackButton: {
    position: 'absolute',
    top: 40,
    left: 0,
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 40,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 7,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    color: '#2C3E50',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: '#007BFF',
    textDecorationLine: 'underline',
  },
  notesLink: {
    justifyContent: 'center',
    marginBottom: 12,
    width: '70%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  notesLinkContainer: {
    marginTop: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesLinkText: {
    marginLeft: 12,
    fontSize: 18,
    color: '#007BFF',
    fontWeight: '600',
  },
  projectPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    marginVertical: 4,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 12,
  },
  sideBySideContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  siteCompleteButton: {
    backgroundColor: '#2ECC71',
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  siteIncompleteButton: {
    backgroundColor: '#3498db',
  },
  siteCompleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ticketTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  value: {
    color: '#34495E',
    fontSize: 14,
  },
})

export default TicketDetailsScreen
