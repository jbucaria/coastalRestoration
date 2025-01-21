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
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { getTravelTime } from '@/utils/getTravelTime'
import { SwitchComponent } from '@/components/SwitchComponent'
import { EquipmentModal } from '@/components/EquipmentModal'
import { PhotoModal } from '@/components/PhotoModal'

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

    const fetchTicket = async () => {
      try {
        console.log('Fetching ticket with ID:', projectId)
        const docRef = doc(firestore, 'tickets', projectId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setTicket({ id: docSnap.id, ...docSnap.data() })
        } else {
          Alert.alert('Not Found', 'Ticket does not exist.')
          router.back()
        }
      } catch (error) {
        console.error('Error fetching ticket data:', error)
        Alert.alert('Error', 'Unable to fetch ticket data.')
      }
    }

    fetchTicket()
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

  // Example open Chat
  const openNotes = () => {
    router.push({
      pathname: '/TicketNotesScreen',
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
    Alert.alert(
      'Confirm',
      'Are you sure you want to mark this site as complete?',
      [
        {
          text: 'Yes',
          onPress: async () => {
            try {
              // Update Firestore to mark the site as complete
              const projectRef = doc(firestore, 'tickets', ticket.id)
              await updateDoc(projectRef, { siteComplete: true })

              console.log('Site marked as complete!')
              Alert.alert('Success', 'The site has been marked as complete.')
              router.push('/(tabs)')
            } catch (error) {
              console.error('Error marking site as complete:', error)
              Alert.alert(
                'Error',
                'Failed to mark the site as complete. Please try again.'
              )
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
          <Text style={styles.sectionTitle}>Customer Info</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Customer</Text>
            <Text style={styles.value}>{ticket.customer || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Contact Name</Text>
            <Text style={styles.value}>{ticket.contactName || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Contact Number</Text>
            <Text
              onPress={() => handleCall(ticket.contactNumber)}
              style={[styles.value, styles.link]}
            >
              {ticket.contactNumber || 'N/A'}
            </Text>
          </View>
        </View>

        {/* -- HOMEOWNER INFO -- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Homeowner Info</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{ticket.homeOwnerName || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Number</Text>
            <Text
              onPress={() => handleCall(ticket.homeOwnerNumber)}
              style={[styles.value, styles.link]}
            >
              {ticket.homeOwnerNumber || 'N/A'}
            </Text>
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

        {/* -- SWITCHES (WITHOUT siteComplete) -- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Status</Text>

          <SwitchComponent
            projectId={ticket.id}
            field="onSite"
            label="On Site"
            value={ticket?.onSite || false}
          />

          <SwitchComponent
            projectId={ticket.id}
            field="remediationRequired"
            label="Remediation Required"
            value={ticket?.remediationRequired || false}
            onToggle={handleRemediationToggle}
          />

          <SwitchComponent
            projectId={ticket.id}
            field="equipmentOnSite"
            label={ticket.equipmentOnSite ? 'Edit Equipment' : 'Add Equipment'}
            value={ticket?.equipmentOnSite || false}
            onShowModal={() => setIsEquipmentModalVisible(true)}
          />
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
              {ticket.photos.map((uri, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handlePhotoPress(uri)}
                >
                  <Image source={{ uri }} style={styles.projectPhoto} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.placeholderText}>No photos available</Text>
          )}
        </View>

        {/* -- ACTION BUTTONS -- */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleInspection}
          >
            <Text style={styles.actionButtonText}>
              {ticket.inspectionComplete ? 'View Report' : 'Start Inspection'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#00A8E8' }]}
            onPress={openNotes}
          >
            <Text style={styles.actionButtonText}>Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#7F8C8D' }]}
            onPress={() => router.back()}
          >
            <Text style={styles.actionButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* -- SITE COMPLETE BUTTON at the bottom -- */}
      <TouchableOpacity
        style={styles.siteCompleteButton}
        onPress={handleSiteComplete}
      >
        <Text style={styles.siteCompleteButtonText}>Mark Site Complete</Text>
      </TouchableOpacity>

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
  container: {
    flex: 1,
    backgroundColor: '#F3F5F7',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // leave room for the bottom button
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

  /* Header Card (Ticket & Address) */
  headerCard: {
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
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'center',
  },
  etaLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  etaValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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

  /* Action Buttons (Inspection, Notes, Back) */
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2C3E50',
    borderRadius: 6,
    paddingVertical: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  /* Bottom "Site Complete" Button */
  siteCompleteButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#2ECC71',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  siteCompleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})

export default TicketDetailsScreen
