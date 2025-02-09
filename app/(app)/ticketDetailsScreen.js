import React, { useState, useEffect, useRef } from 'react'
import {
  SafeAreaView,
  Animated,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native'
import { useRouter } from 'expo-router'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { getTravelTime } from '@/utils/getTravelTime'
import { EquipmentModal } from '@/components/EquipmentModal'
import { PhotoModal } from '@/components/PhotoModal'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { deleteTicket } from '@/utils/deleteTicket'
import useProjectStore from '@/store/useProjectStore'
import { ETAButton } from '@/components/EtaButton'

const TicketDetailsScreen = () => {
  const router = useRouter()
  const { projectId } = useProjectStore()
  const [ticket, setTicket] = useState(null)
  const [eta, setEta] = useState(null)
  const [isEquipmentModalVisible, setIsEquipmentModalVisible] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [optionsModalVisible, setOptionsModalVisible] = useState(false)

  // Animated header value
  const scrollY = useRef(new Animated.Value(0)).current
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -100], // Adjust based on header height
    extrapolate: 'clamp',
  })

  // Subscribe to ticket data
  useEffect(() => {
    if (!projectId) return

    const ticketRef = doc(firestore, 'tickets', projectId)
    const unsubscribe = onSnapshot(
      ticketRef,
      docSnap => {
        if (docSnap.exists()) {
          setTicket({ id: docSnap.id, ...docSnap.data() })
        } else {
          router.back()
        }
      },
      error => {
        console.error('Error fetching ticket data:', error)
        Alert.alert('Error', 'Unable to fetch ticket data.')
      }
    )
    return () => unsubscribe()
  }, [projectId])

  // Get travel time from address
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
        <ActivityIndicator size="large" color="#1DA1F2" />
        <Text style={styles.loadingText}>Loading ticket details...</Text>
      </SafeAreaView>
    )
  }

  // ----- Ticket Option Functions -----
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
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const handleInspection = () => {
    if (!ticket) {
      Alert.alert('Error', 'No ticket selected for inspection.')
      return
    }
    const route = ticket.inspectionComplete
      ? '/ViewReport'
      : '/InspectionScreen'
    router.push({ pathname: route, params: { projectId: ticket.projectId } })
  }

  const handleRemediation = () => {
    if (!ticket) {
      Alert.alert('Error', 'No ticket selected for remediation.')
      return
    }
    const route = ticket.remediationComplete
      ? '/ViewRemediationScreen'
      : '/RemediationScreen'
    router.push({ pathname: route, params: { projectId: ticket.projectId } })
  }

  const openNotes = () => {
    router.push({
      pathname: '/TicketNotesScreen',
      params: { projectId: ticket.id },
    })
  }

  const handlePhotoPress = uri => setSelectedPhoto(uri)
  const closePhoto = () => setSelectedPhoto(null)

  const handleSiteComplete = async () => {
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
              const projectRef = doc(firestore, 'tickets', ticket.id)
              await updateDoc(projectRef, { siteComplete: newStatus })
              Alert.alert('Success', `Site marked as ${actionText}.`)
              router.push('/(tabs)')
            } catch (error) {
              console.error(`Error marking site as ${actionText}:`, error)
              Alert.alert('Error', `Failed to mark the site as ${actionText}.`)
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => router.push('/(tabs)'),
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Animated Header */}
      <Animated.View
        style={[
          styles.topBar,
          { transform: [{ translateY: headerTranslateY }] },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <IconSymbol name="arrow.backward" color="black" size={24} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Ticket Details</Text>
        <TouchableOpacity
          onPress={() => setOptionsModalVisible(true)}
          style={styles.headerButton}
        >
          <IconSymbol name="ellipsis" color="black" size={24} />
        </TouchableOpacity>
      </Animated.View>

      {/* Options Modal (Popover-style) */}
      <Modal
        visible={optionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOptionsModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.optionsModal}>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setOptionsModalVisible(false)
                  handleDeleteTicket()
                }}
              >
                <Text style={styles.optionText}>Delete Ticket</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setOptionsModalVisible(false)
                  handleSiteComplete()
                }}
              >
                <Text style={styles.optionText}>
                  {ticket.siteComplete ? 'Mark Incomplete' : 'Mark Complete'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setOptionsModalVisible(false)
                  handleInspection()
                }}
              >
                <Text style={styles.optionText}>
                  {ticket.inspectionComplete ? 'View Inspection' : 'Inspection'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setOptionsModalVisible(false)
                  handleRemediation()
                }}
              >
                <Text style={styles.optionText}>
                  {ticket.remediationComplete
                    ? 'View Remediation'
                    : 'Remediation'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setOptionsModalVisible(false)
                  openNotes()
                }}
              >
                <Text style={styles.optionText}>
                  {ticket.messageCount ? 'View Notes' : 'Add Note'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionItem, styles.optionCancel]}
                onPress={() => setOptionsModalVisible(false)}
              >
                <Text style={[styles.optionText, styles.optionCancelText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Main Animated ScrollView */}
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Address Card */}
        <View style={styles.card}>
          <Text style={styles.addressText}>
            {ticket.street}, {ticket.city}, {ticket.state} {ticket.zip}
          </Text>
          <ETAButton
            eta={eta}
            onPress={() => openGoogleMapsWithETA(ticket.address)}
            status={eta === 'N/A' ? 'delayed' : 'normal'}
          />
        </View>

        {/* Contact Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Info</Text>
          <View style={styles.contactSection}>
            <Text style={styles.contactLabel}>Builder</Text>
            <Text style={styles.contactValue}>{ticket.customer || 'N/A'}</Text>
            <Text style={styles.contactValue}>
              {ticket.customerName || 'N/A'}
            </Text>
            <Text style={styles.contactValue}>
              {ticket.customerEmail || 'N/A'}
            </Text>
            <Text
              style={[styles.contactValue, styles.link]}
              onPress={() => handleCall(ticket.customerNumber)}
            >
              {ticket.customerNumber || 'N/A'}
            </Text>
          </View>
          <View style={styles.contactSection}>
            <Text style={styles.contactLabel}>Homeowner</Text>
            <Text style={styles.contactValue}>
              {ticket.homeOwnerName || 'N/A'}
            </Text>
            <Text
              style={[styles.contactValue, styles.link]}
              onPress={() => handleCall(ticket.homeOwnerNumber)}
            >
              {ticket.homeOwnerNumber || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Inspector & Reason Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inspector & Reason</Text>
          <View style={styles.inspectorSection}>
            <Text style={styles.inspectorLabel}>Inspector:</Text>
            <Text style={styles.inspectorValue}>
              {ticket.inspectorName || 'N/A'}
            </Text>
          </View>
          <View style={styles.inspectorSection}>
            <Text style={styles.inspectorLabel}>Reason for Visit:</Text>
            <Text style={styles.inspectorValue}>{ticket.reason || 'N/A'}</Text>
          </View>
        </View>

        {/* Equipment Modal */}
        <EquipmentModal
          visible={isEquipmentModalVisible}
          onClose={() => setIsEquipmentModalVisible(false)}
          projectId={ticket.id}
        />

        {/* Photos Card */}
        {ticket.ticketPhotos && ticket.ticketPhotos.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ticket.ticketPhotos.map((photoUri, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handlePhotoPress(photoUri)}
                >
                  <Image source={{ uri: photoUri }} style={styles.photo} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Equipment Total:</Text>
            <Text style={styles.infoValue}>{ticket.equipmentTotal || 0}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Measurements Required:</Text>
            <Text style={styles.infoValue}>
              {ticket.remediationRequired ? 'True' : 'False'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Inspection Needed:</Text>
            <Text style={styles.infoValue}>
              {ticket.inspectionComplete ? 'Complete' : 'Required'}
            </Text>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Photo Modal */}
      <PhotoModal
        visible={selectedPhoto !== null}
        photo={selectedPhoto}
        onClose={closePhoto}
      />
    </SafeAreaView>
  )
}

export default TicketDetailsScreen

// ------------------- STYLES -------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // ---------- Animated Header ----------
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    marginRight: 10,
  },
  headerButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: 'black',
    textAlign: 'center',
  },
  // ---------- Scrollable Content ----------
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  // ---------- Card Styles ----------
  card: {
    backgroundColor: '#F5F8FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#14171A',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#14171A',
    textAlign: 'center',
    marginBottom: 8,
  },
  etaContainer: {
    alignSelf: 'center',
    backgroundColor: '#17BF63',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  etaLabel: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  etaValue: {
    color: '#FFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  // ---------- Info Row & Labels ----------
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14171A',
  },
  infoValue: {
    fontSize: 14,
    color: '#14171A',
  },
  link: {
    color: '#1DA1F2',
    textDecorationLine: 'underline',
  },
  // ---------- Contact Info ----------
  contactSection: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14171A',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    color: '#14171A',
    marginBottom: 2,
  },
  // ---------- Inspector & Reason ----------
  inspectorSection: {
    marginBottom: 8,
  },
  inspectorLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14171A',
    marginBottom: 4,
  },
  inspectorValue: {
    fontSize: 14,
    color: '#14171A',
  },
  // ---------- Photos ----------
  photo: {
    width: 70,
    height: 70,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    marginRight: 8,
    marginBottom: 8,
  },
  // ---------- Options Modal Styles ----------
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)', // Slight darkening of background
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60, // Positioned below header
    paddingRight: 16,
  },
  optionsModal: {
    width: 240, // Increased width for more space
    backgroundColor: '#FFFFFF', // Same as screen background
    borderRadius: 8,
    paddingVertical: 8,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 5,
  },
  optionItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1, // Bottom border for each option
    borderBottomColor: '#E1E8ED',
  },
  optionText: {
    fontSize: 14,
    color: '#14171A',
  },
  optionCancel: {
    borderBottomWidth: 0, // No border for cancel button if desired
  },
  optionCancelText: {
    fontWeight: '700',
    color: '#E0245E',
  },
  // ---------- Floating "Add Room" Button ----------
  floatingAddRoomButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    backgroundColor: '#1DA1F2',
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 12,
    elevation: 5,
  },
  floatingAddRoomButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  // ---------- Modal (Add Room & Items) Styles ----------
  addRoomModalContainer: {
    width: '80%',
    backgroundColor: '#FFF',
    borderRadius: 6,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    color: '#14171A',
  },
  itemSearchInput: {
    backgroundColor: '#F5F8FA',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    color: '#14171A',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modalConfirmButton: {
    backgroundColor: '#17BF63',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalConfirmButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  modalCloseButton: {
    backgroundColor: '#ECECEC',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalCloseButtonText: {
    color: '#14171A',
    fontWeight: '600',
    fontSize: 14,
  },
  // ---------- Room Type Options (Add Room Modal) ----------
  roomOptionsRow: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  roomTypeOption: {
    backgroundColor: '#F5F8FA',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  roomTypeOptionSelected: {
    backgroundColor: '#1DA1F2',
    borderColor: '#1DA1F2',
  },
  roomTypeOptionText: {
    fontSize: 14,
    color: '#14171A',
  },
  modalSubtitle: {
    fontWeight: '600',
    marginVertical: 8,
    color: '#14171A',
    textAlign: 'center',
  },
})
