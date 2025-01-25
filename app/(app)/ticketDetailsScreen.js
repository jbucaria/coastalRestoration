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

// If you want to handle photo viewing in a modal, import PhotoModal from somewhere...
// import PhotoModal from '@/components/PhotoModal' // if needed

const TicketDetailsScreen = () => {
  const router = useRouter()
  const { projectId } = useLocalSearchParams()

  const [ticket, setTicket] = useState(null)
  const [eta, setEta] = useState(null)
  const [isEquipmentModalVisible, setIsEquipmentModalVisible] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  // If you want a local approach to "homeowner" or "photos", you might store them in `ticket`.

  useEffect(() => {
    if (!projectId) return

    const ticketRef = doc(firestore, 'tickets', projectId)
    const unsubscribe = onSnapshot(
      ticketRef,
      docSnap => {
        if (docSnap.exists()) {
          setTicket({ id: docSnap.id, ...docSnap.data() })
        } else {
          Alert.alert('Not Found', 'Ticket does not exist.')
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

  // Helper function for pretty printing address
  const formatAddress = fullAddress => {
    if (!fullAddress) return ''
    const parts = fullAddress.split(',')
    if (parts.length >= 2) {
      return parts[0].trim() + ', ' + parts[1].trim()
    }
    return fullAddress
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
      <TouchableOpacity
        style={styles.floatingBackButton}
        onPress={() => router.back()}
      >
        <IconSymbol name="arrow.backward.square" size={24} color="white" />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Floating Back Button */}
        {/* -- HEADER SECTION -- */}
        <View style={styles.headerCard}>
          <Text style={styles.ticketTitle}>
            Ticket: {ticket.ticketNumber || 'N/A'}
          </Text>
          <Text style={styles.addressValue}>
            {formatAddress(ticket.address)}
          </Text>

          <TouchableOpacity
            onPress={() => openGoogleMapsWithETA(ticket.address)}
            style={styles.etaContainer}
          >
            <Text style={styles.etaLabel}>Estimated Arrival:</Text>
            <Text style={styles.etaValue}>{eta}</Text>
          </TouchableOpacity>
        </View>

        {/* -- CUSTOMER INFO -- */}
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

        {/* -- INSPECTOR & REASON -- */}
        <View style={styles.sectionContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Inspector</Text>
            <Text style={styles.value}>{ticket.inspectorName || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Reason for Visit</Text>
            <Text style={styles.value}>{ticket.reason || 'N/A'}</Text>
          </View>
        </View>

        {/* -- EQUIPMENT MODAL -- */}
        <EquipmentModal
          visible={isEquipmentModalVisible}
          onClose={() => setIsEquipmentModalVisible(false)}
          projectId={ticket.id}
        />

        {/* -- PHOTOS -- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Photos</Text>
          {ticket.photos && ticket.photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ticket.photos.map((photoUri, index) => {
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
          ) : (
            <Text style={styles.placeholderText}>No photos available</Text>
          )}
        </View>

        {/* -- LINKS & ACTIONS -- */}

        <View style={styles.notesLinkContainer}>
          <TouchableOpacity onPress={openNotes} style={styles.notesLink}>
            <IconSymbol name="note.text" size={24} color="#007BFF" />
            <Text style={styles.notesLinkText}>View Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.notesLink} onPress={handleInspection}>
            <Text style={styles.notesLinkText}>
              {ticket.inspectionComplete ? 'View Report' : 'Start Inspection'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notesLink}
            onPress={handleRemediation}
          >
            {ticket.remediationComplete && (
              <IconSymbol name="pencil.and.ruler" size={24} color="#007BFF" />
            )}
            <Text style={styles.notesLinkText}>
              {ticket.remediationComplete ? 'View Meas.' : 'Input Meas.'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* -- SWITCHES (WITHOUT siteComplete) -- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Status</Text>

          <View style={styles.sectionContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Equipment Total</Text>
              <Text style={styles.value}>{ticket.equipmentTotal || '0'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Measurements Req.</Text>
              <Text style={styles.value}>
                {ticket.remediationRequired ? 'True' : ''}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Inspection Report Req.</Text>
              <Text style={styles.value}>
                {!ticket.inspectionComplete ? 'True' : ''}
              </Text>
            </View>
          </View>
        </View>
        {!ticket.remediationComplete && (
          <SwitchComponent
            projectId={ticket.id}
            field="remediationRequired"
            label="Remediation Required"
            value={ticket?.remediationRequired || false}
            onToggle={handleRemediationToggle}
          />
        )}

        <SwitchComponent
          projectId={ticket.id}
          field="equipmentOnSite"
          label={ticket.equipmentOnSite ? 'Edit Equipment' : 'Add Equipment'}
          value={ticket?.equipmentOnSite || false}
          onShowModal={() => setIsEquipmentModalVisible(true)}
        />
        <View style={styles.notesLinkContainer}>
          <TouchableOpacity
            style={[
              styles.siteCompleteButton,
              ticket.siteComplete ? styles.siteIncompleteButton : null,
            ]}
            onPress={handleSiteComplete}
          >
            <Text style={styles.siteCompleteButtonText}>
              {ticket.siteComplete
                ? 'Mark Site Incomplete'
                : 'Mark Site Complete'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* -- FULL PHOTO PREVIEW -- */}
      <PhotoModal
        visible={selectedPhoto !== null}
        photo={selectedPhoto}
        onClose={closePhoto}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  /* Container & Scroll */
  sideBySideContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  column: {
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F5F7',
  },
  scrollContent: {
    padding: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F5F7',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  notesLinkContainer: {
    marginTop: 20, // Adjust as needed for your layout
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesLink: {
    justifyContent: 'center',
    marginBottom: 10,
    width: '60%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#E3F2FD', // Light blue background for emphasis
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 2,
  },
  notesLinkText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#007BFF', // Theme color to match the icon
    fontWeight: '600',
  },
  floatingBackButton: {
    position: 'absolute',
    top: 40, // Adjust based on your status bar and header height
    left: 10,
    backgroundColor: '#007bff', // Theme color for visibility
    padding: 10,
    borderRadius: 30, // Fully rounded corners for a modern, pill-like shape
    zIndex: 100, // Ensures the button is above all other content
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // For Android shadow
  },
  headerCard: {
    marginTop: 60, // Give space for the floating button
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  ticketTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  addressValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#34495E',
    textAlign: 'center',
  },
  etaContainer: {
    backgroundColor: '#2ECC71',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
    marginBottom: 8,
  },
  etaLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  etaValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  /* Section Containers */
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: '#2C3E50',
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    color: '#34495E',
    fontSize: 14,
  },
  link: {
    color: '#007BFF',
    textDecorationLine: 'underline',
  },

  /* Photos */
  projectPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    marginVertical: 4,
  },
  placeholderText: {
    fontStyle: 'italic',
    color: '#888',
    marginVertical: 8,
    textAlign: 'center',
  },

  /* Action Buttons (including "Mark Site Complete") */

  actionButtonRow: {
    // New style for arranging buttons in rows
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionsContainer: {
    marginTop: 12,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#2C3E50',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginVertical: 8, // Vertical spacing between buttons
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
    textTransform: 'uppercase', // Uppercase for emphasis
  },
  siteCompleteButton: {
    backgroundColor: '#2ECC71', // Green for "Complete"
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
  siteIncompleteButton: {
    backgroundColor: 'red', // Red for "Incomplete"
  },
  siteCompleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
})

export default TicketDetailsScreen
