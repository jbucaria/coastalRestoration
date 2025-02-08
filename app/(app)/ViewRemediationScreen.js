// ViewRemediationScreen.js
import React, { useEffect, useState } from 'react'
import { useRouter, router } from 'expo-router'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native'
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { exportCSVReport } from '@/utils/createCSVReport'
import useProjectStore from '@/store/useProjectStore'

/**
 * PhotoModal Component
 * Displays an enlarged image in a modal view.
 */
const PhotoModal = ({ visible, photo, onClose }) => {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (visible && photo) {
      setIsLoading(true)
      Image.getSize(
        photo,
        (width, height) => {
          setIsLoading(false)
        },
        error => {
          console.error('Error getting image size:', error)
          setIsLoading(false)
        }
      )
    }
  }, [visible, photo])

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={photoModalStyles.modalBackground}>
        <TouchableOpacity
          style={photoModalStyles.modalTouchable}
          onPress={onClose}
          activeOpacity={1}
        >
          <View style={photoModalStyles.modalContent}>
            {isLoading && (
              <ActivityIndicator
                size="large"
                color="#0000ff"
                style={photoModalStyles.loadingIndicator}
              />
            )}
            {photo ? (
              <Image
                source={{ uri: photo }}
                style={[
                  photoModalStyles.fullPhoto,
                  { width: 300, height: 400 },
                ]}
                resizeMode="contain"
              />
            ) : (
              <Text style={photoModalStyles.photoLoadingText}>
                No Photo Available
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={photoModalStyles.closeButton}
          onPress={onClose}
        >
          <Text style={photoModalStyles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const photoModalStyles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  modalTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
    height: '90%',
  },
  fullPhoto: {
    flex: 1,
  },
  photoLoadingText: {
    color: 'white',
    fontSize: 18,
  },
  loadingIndicator: {
    position: 'absolute',
    zIndex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
})

export default function ViewRemediationScreen() {
  const { projectId } = useProjectStore()
  const router = useRouter()
  const [remediationData, setRemediationData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')

  // State for Photo Modal
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoModalVisible, setPhotoModalVisible] = useState(false)

  // Fetch remediation data when the component mounts.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(firestore, 'tickets', projectId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          // Ensure remediationData is not null and has a rooms array.
          setRemediationData(data.remediationData || { rooms: [] })
          setCustomerName(data.customerName || 'Unknown')
          setCustomerEmail(data.customerEmail || 'No Email Provided')
        } else {
          Alert.alert('Error', 'No remediation data found.')
        }
      } catch (error) {
        console.error('Error fetching remediation data:', error)
        Alert.alert('Error', 'Failed to load data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [projectId])

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </SafeAreaView>
    )
  }

  if (
    !remediationData ||
    !remediationData.rooms ||
    remediationData.rooms.length === 0
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>No remediation data available.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        key={projectId}
      >
        <Text style={styles.title}>Remediation Report</Text>

        {remediationData.rooms.map((room, roomIndex) => {
          if (!room) return null
          return (
            <View key={room.id || roomIndex} style={styles.roomContainer}>
              <Text style={styles.roomTitle}>
                {room.name || 'Unnamed Room'}
              </Text>
              {room.measurements &&
                room.measurements.map((measurement, measIndex) => {
                  if (!measurement) return null
                  return (
                    <View
                      key={measurement.id || measIndex}
                      style={styles.measurementRow}
                    >
                      <Text style={styles.measurementText}>
                        {measurement.description || ''}:{' '}
                        {measurement.quantity || 0}
                      </Text>
                    </View>
                  )
                })}
              {room.photos &&
                Array.isArray(room.photos) &&
                room.photos.length > 0 && (
                  <ScrollView horizontal style={styles.photoRow}>
                    {room.photos.map((photo, index) => {
                      // Check that photo is an object with a downloadURL property.
                      if (!photo || !photo.downloadURL) return null
                      return (
                        <TouchableOpacity
                          key={(photo.storagePath || index) + index}
                          onPress={() => {
                            setSelectedPhoto(photo.downloadURL)
                            setPhotoModalVisible(true)
                          }}
                          style={styles.photoItem}
                        >
                          <Image
                            source={{ uri: photo.downloadURL }}
                            style={styles.photoImage}
                          />
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                )}
            </View>
          )
        })}

        {/* Create CSV Report Button */}
        <TouchableOpacity
          onPress={() => exportCSVReport(remediationData, projectId)}
          style={styles.exportButton}
        >
          <Text style={styles.exportButtonText}>Create CSV Report</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            router.push({
              pathname: '/EditRemediationScreen',
              params: { projectId: projectId },
            })
          }}
          style={styles.exportButton}
        >
          <Text style={styles.exportButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            router.push({
              pathname: '/ViewInvoiceScreen',
            })
          }}
          style={styles.exportButton}
        >
          <Text style={styles.exportButtonText}>Create Invoice</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Photo Modal */}
      {photoModalVisible && (
        <PhotoModal
          visible={photoModalVisible}
          photo={selectedPhoto}
          onClose={() => setPhotoModalVisible(false)}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#2C3E50',
  },
  roomContainer: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  measurementRow: {
    marginVertical: 4,
  },
  measurementText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  photoRow: {
    marginTop: 10,
  },
  photoItem: {
    marginRight: 8,
  },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
  },
  addPhotoButton: {
    marginTop: 8,
    backgroundColor: '#2980B9',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  addPhotoButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  exportButton: {
    marginTop: 20,
    backgroundColor: '#2980B9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    fontSize: 16,
    marginTop: 20,
  },
})
