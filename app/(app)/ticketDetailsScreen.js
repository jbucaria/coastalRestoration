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
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { getTravelTime } from '@/utils/getTravelTime'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { SwitchComponent } from '@/components/SwitchComponent'
import { EquipmentModal } from '@/components/EquipmentModal'
import { PhotoModal } from '@/components/PhotoModal'

// If you want to handle photo viewing in a modal, import PhotoModal from somewhere...
// import PhotoModal from '@/components/PhotoModal' // if needed

const ticketDetailsScreen = () => {
  const router = useRouter()
  const { projectId } = useLocalSearchParams()

  const [project, setProject] = useState(null)
  const [eta, setEta] = useState(null)
  const [isEquipmentModalVisible, setIsEquipmentModalVisible] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  // If you want a local approach to "homeowner" or "photos", you might store them in `project`.

  useEffect(() => {
    if (!projectId) return

    const fetchProject = async () => {
      try {
        console.log('Fetching project with ID:', projectId)
        const docRef = doc(firestore, 'projects', projectId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setProject({ id: docSnap.id, ...docSnap.data() })
        } else {
          Alert.alert('Not Found', 'Project does not exist.')
          router.back()
        }
      } catch (error) {
        console.error('Error fetching project data:', error)
        Alert.alert('Error', 'Unable to fetch project data.')
      }
    }

    fetchProject()
  }, [projectId])

  useEffect(() => {
    if (project?.address) {
      getTravelTime(project.address)
        .then(info => setEta(info.durationText))
        .catch(error => {
          console.error('Error fetching travel time:', error)
          setEta('N/A')
        })
    } else {
      setEta(null)
    }
  }, [project])

  if (!project) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading project details...</Text>
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
    if (!project) {
      Alert.alert('Error', 'No project selected for inspection or viewing.')
      return
    }
    const route = project.inspectionComplete ? '/viewReport' : '/inspection'
    router.push({
      pathname: route,
      params: { projectId: project.id },
    })
  }

  // Example open Chat
  const openChatRoom = () => {
    router.push({
      pathname: '/ProjectChatRoom',
      params: { projectId: project.id },
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
    // e.g. setProject(prev => ({ ...prev, remediationRequired: value }))
    if (value) {
      Alert.alert(
        'Input Measurements',
        'Would you like to input measurements now?',
        [
          {
            text: 'Yes',
            onPress: () => {
              router.push({
                pathname: '/remediation',
                params: { projectId: project.id },
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <Text style={styles.projectModalTitle}>
          Ticket# {project.projectId}
        </Text>

        {/* Address + ETA */}
        <View style={styles.card}>
          <Text style={styles.addressValue}>
            {formatAddress(project.address) || 'N/A'}
          </Text>
          <TouchableOpacity
            onPress={() => openGoogleMapsWithETA(project.address)}
            style={styles.etaContainer}
          >
            <Text style={styles.etaLabel}>Estimated Arrival</Text>
            <Text style={styles.etaValue}>{eta || 'Fetching...'}</Text>
          </TouchableOpacity>
        </View>

        {/* Customer Info */}
        <View style={styles.card}>
          <Text style={styles.subTitle}>Customer Info</Text>
          <Text style={styles.projectFieldLabel}>Customer:</Text>
          <Text style={styles.projectFieldValue}>
            {project.customer || 'N/A'}
          </Text>

          <Text style={styles.projectFieldLabel}>Contact Name:</Text>
          <Text style={styles.projectFieldValue}>
            {project.contactName || 'N/A'}
          </Text>

          <Text style={styles.projectFieldLabel}>Contact Number:</Text>
          <TouchableOpacity onPress={() => handleCall(project.contactNumber)}>
            <Text style={[styles.projectFieldValue, styles.clickable]}>
              {project.contactNumber || 'N/A'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Homeowner Info */}
        <View style={styles.card}>
          <Text style={styles.subTitle}>Homeowner Info</Text>
          <Text style={styles.projectFieldLabel}>Name:</Text>
          <Text style={styles.projectFieldValue}>
            {project.homeOwnerName || 'N/A'}
          </Text>

          <Text style={styles.projectFieldLabel}>Number:</Text>
          <TouchableOpacity onPress={() => handleCall(project.homeOwnerNumber)}>
            <Text style={[styles.projectFieldValue, styles.clickable]}>
              {project.homeOwnerNumber || 'N/A'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inspector & Reason */}
        <View style={styles.card}>
          <Text style={styles.projectFieldLabel}>Inspector:</Text>
          <Text style={styles.projectFieldValue}>
            {project.inspectorName || 'N/A'}
          </Text>
          <Text style={styles.projectFieldLabel}>Reason for Visit:</Text>
          <Text style={styles.projectFieldValue}>
            {project.reason || 'N/A'}
          </Text>
        </View>

        {/* Switches (On Site, Remediation, Equipment, Site Complete) */}
        <View style={styles.card}>
          <SwitchComponent
            projectId={project.id}
            field="onSite"
            label="On Site"
            value={project?.onSite || false}
          />

          <SwitchComponent
            projectId={project.id}
            field="remediationRequired"
            label=" Remeditation Required"
            value={project?.remediationRequired || false}
          />

          <SwitchComponent
            projectId={project.id}
            field="equipmentOnSite"
            label={project.equipmentOnSite ? 'Edit Equipment' : 'Add Equipment'}
            value={project?.equipmentOnSite || false}
            onShowModal={() => setIsEquipmentModalVisible(true)}
          />

          <SwitchComponent
            projectId={project.id}
            field="siteComplete"
            label="Site Complete"
            value={project?.siteComplete || false}
          />
        </View>

        {/* Equipment Modal */}
        <EquipmentModal
          visible={isEquipmentModalVisible}
          onClose={() => setIsEquipmentModalVisible(false)}
          projectId={project.id}
          // other props like initialQuantities if you have them
        />

        {/* Photos */}
        <View style={styles.card}>
          <Text style={styles.subTitle}>Photos</Text>
          {project.photos && project.photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {project.photos.map((uri, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handlePhotoPress(uri)}
                >
                  <Image source={{ uri }} style={styles.projectPhoto} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noPhotosText}>No photos available</Text>
          )}
        </View>

        {/* Actions: Start/View Inspection, Chat, etc. */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleInspection}
          >
            <Text style={styles.actionButtonText}>
              {project.inspectionComplete ? 'View Report' : 'Start Inspection'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#2980B9' }]}
            onPress={openChatRoom}
          >
            <Text style={styles.actionButtonText}>Chat</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PhotoModal
        visible={selectedPhoto !== null}
        photo={selectedPhoto}
        onClose={closePhoto}
      />
    </SafeAreaView>
  )
}

export default ticketDetailsScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 60,
  },
  projectModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginVertical: 15,
    textAlign: 'center',
    color: '#2C3E50',
  },
  card: {
    backgroundColor: '#f7f7f7',
    marginBottom: 12,
    borderRadius: 8,
    padding: 16,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2C3E50',
  },
  addressValue: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2C3E50',
    textAlign: 'center',
  },
  etaContainer: {
    backgroundColor: '#2ecc71',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  etaLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  etaValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  projectFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 4,
  },
  projectFieldValue: {
    fontSize: 14,
    color: '#2C3E50',
    marginVertical: 4,
  },
  clickable: {
    color: 'blue',
    textDecorationLine: 'underline',
  },
  remediationButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#95a5a6',
  },
  projectPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  noPhotosText: {
    fontStyle: 'italic',
    color: '#888',
    marginVertical: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  actionButton: {
    backgroundColor: '#2C3E50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
