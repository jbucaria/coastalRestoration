// components/ProjectDetailsModal.js
import React, { useEffect, useState } from 'react'
import { router } from 'expo-router'
import {
  Modal,
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
  Switch,
} from 'react-native'

import { getTravelTime } from '@/utils/getTravelTime'
import { IconSymbol } from '@/components/ui/IconSymbol'

const ProjectDetailsModal = ({
  visible,
  project,
  setProject,
  onClose,
  onUpdateProject, // Function passed from parent to update Firestore
  onDeleteProject,
  setSelectedPhoto,
  setModalOptionsVisible,
}) => {
  const [eta, setEta] = useState(null)
  const [displayText, setDisplayText] = useState('Fetching...')

  useEffect(() => {
    const fetchTravelTime = async () => {
      if (project?.address) {
        try {
          const travelInfo = await getTravelTime(project.address)
          setTimeout(() => {
            setEta(travelInfo.durationText)
          }, 700)
        } catch (error) {
          console.error('Error fetching travel time:', error)
          setEta('N/A')
        }
      } else {
        setEta(null)
      }
    }
    if (visible && project) {
      fetchTravelTime()
    } else {
      setEta(null)
    }
  }, [visible, project])

  if (!project) return null

  const formatAddress = fullAddress => {
    if (!fullAddress) return ''
    const parts = fullAddress.split(',')
    if (parts.length >= 2) {
      return parts[0].trim() + ', ' + parts[1].trim()
    }
    return fullAddress
  }

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
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
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
    onClose()
  }

  const handleSwitchChange = async (field, value) => {
    if (project && setProject) {
      setProject(prev => ({ ...prev, [field]: value }))
      if (onUpdateProject) {
        try {
          await onUpdateProject(project.id, field, value)
          console.log(`Firestore updated: ${field} set to ${value}`)
        } catch (error) {
          console.error('Error updating project in Firestore:', error)
          Alert.alert(
            'Error',
            'Failed to update the project. Please try again.'
          )
          setProject(prev => ({ ...prev, [field]: !value }))
        }
      }
    } else {
      console.error(
        'setProject function is undefined. Make sure it is passed from the parent.'
      )
      Alert.alert('Error', 'Project is undefined. Cannot update.')
    }
  }

  // New function to navigate to the chat room for this project
  const openChatRoom = () => {
    // Assuming you have a chat room screen set up at /chat
    // and it accepts a parameter for the project ID.
    router.push({
      pathname: '/ProjectChatRoom',
      params: { projectId: project.id },
    })
    onClose()
  }

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.modalBackground}>
          <TouchableOpacity onPress={onClose} style={styles.closeIconContainer}>
            <IconSymbol name="xmark" size={24} color="#fff" />
          </TouchableOpacity>
          <SafeAreaView style={styles.fullWidthModal}>
            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContainer}
            >
              <Text style={styles.projectModalTitle}>Project Details</Text>

              <View style={styles.card}>
                <Text
                  style={[styles.addressValue, styles.addressSingleLine]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {formatAddress(project.address) || 'N/A'}
                </Text>
                <View>
                  <TouchableOpacity
                    onPress={() => {
                      openGoogleMapsWithETA(project.address)
                      onClose()
                    }}
                  >
                    <View style={styles.etaContainer}>
                      <Text style={styles.etaLabel}>Estimated Arrival</Text>
                      <Text style={styles.etaValue}>
                        {eta || 'Fetching...'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.contactRow}>
                  <View style={styles.contactColumn}>
                    <Text style={styles.projectFieldLabel}>Customer:</Text>
                    <Text style={styles.projectFieldValue}>
                      {project.customer || 'N/A'}
                    </Text>
                    <Text style={styles.projectFieldLabel}>Name:</Text>
                    <Text style={styles.projectFieldValue}>
                      {project.contactName || 'N/A'}
                    </Text>
                    <Text style={styles.projectFieldLabel}>Number:</Text>
                    <TouchableOpacity
                      onPress={() => handleCall(project.contactNumber)}
                    >
                      <Text
                        style={[styles.projectFieldValue, styles.clickableText]}
                      >
                        {project.contactNumber || 'N/A'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.contactColumn}>
                    <Text style={styles.projectFieldLabel}>Homeowner:</Text>
                    <Text style={styles.projectFieldValue}></Text>
                    <Text style={styles.projectFieldLabel}>Name:</Text>
                    <Text style={styles.projectFieldValue}>
                      {project.homeOwnerName || 'N/A'}
                    </Text>
                    <Text style={styles.projectFieldLabel}>Number:</Text>
                    <TouchableOpacity
                      onPress={() => handleCall(project.homeOwnerNumber)}
                    >
                      <Text
                        style={[styles.projectFieldValue, styles.clickableText]}
                      >
                        {project.homeOwnerNumber || 'N/A'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.projectFieldLabel}>Inspector:</Text>
                <View style={styles.inspectorRowModal}>
                  <Text style={styles.projectFieldValue}>
                    {project.inspectorName || 'N/A'}
                  </Text>
                  {project.remediationRequired && (
                    <Text style={styles.remediationIndicatorModal}> R</Text>
                  )}
                </View>
                <Text style={styles.projectFieldLabel}>Reason for Visit:</Text>
                <Text style={styles.projectFieldValue}>
                  {project.reason || 'N/A'}
                </Text>
              </View>

              {!project.inspectionComplete && (
                <View style={styles.card}>
                  <View style={styles.checkboxContainer}>
                    <Switch
                      value={project.onSite || false}
                      onValueChange={value =>
                        handleSwitchChange('onSite', value)
                      }
                    />
                    <Text style={styles.checkboxLabel}>On Site</Text>
                  </View>
                </View>
              )}

              <View style={styles.card}>
                <Text style={styles.projectFieldLabel}>Photos:</Text>
                {project.photos && project.photos.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.projectPhotos}
                  >
                    {project.photos.map((uri, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          setSelectedPhoto(uri)
                          setModalOptionsVisible(false)
                        }}
                      >
                        <Image source={{ uri }} style={styles.projectPhoto} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.noPhotosText}>No photos available</Text>
                )}
              </View>

              {/* Actions */}
              <View style={styles.projectActionsContainer}>
                <TouchableOpacity
                  onPress={handleInspection}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>
                    {project.inspectionComplete
                      ? 'View Report'
                      : 'Start Inspection'}
                  </Text>
                </TouchableOpacity>

                {!project.inspectionComplete && (
                  <TouchableOpacity
                    onPress={onDeleteProject}
                    style={[styles.actionButton, styles.deleteButton]}
                  >
                    <Text style={styles.actionButtonText}>Delete Project</Text>
                  </TouchableOpacity>
                )}

                {/* New Chat Room Button */}
                <TouchableOpacity
                  onPress={openChatRoom}
                  style={[styles.actionButton, { backgroundColor: '#2980B9' }]}
                >
                  <Text style={styles.actionButtonText}>Chat</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  addressValue: {
    fontSize: 24,
    color: '#2C3E50',
    marginBottom: 8,
  },
  addressSingleLine: {
    textAlign: 'center',
    marginHorizontal: 10,
  },
  closeIconContainer: {
    position: 'absolute',
    top: 16,
    right: 11,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  clickableText: {
    color: 'blue',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullWidthModal: {
    flex: 1,
    width: '100%',
  },
  modalContent: {
    flexGrow: 1,
    backgroundColor: 'white',
  },
  modalContainer: {
    paddingBottom: 40,
  },
  projectModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginVertical: 15,
    textAlign: 'center',
    color: '#2C3E50',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  card: {
    backgroundColor: '#f7f7f7',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2C3E50',
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactColumn: {
    flex: 1,
    marginHorizontal: 8,
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
  fieldData: {
    fontWeight: '400',
  },
  etaContainer: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#2ecc71',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  etaValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  inspectorRowModal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  remediationIndicatorModal: {
    color: 'red',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2C3E50',
  },
  projectPhotos: {
    marginTop: 12,
    marginBottom: 4,
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
  projectActionsContainer: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#2C3E50',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  closeButton: {
    backgroundColor: '#7f8c8d',
  },
})

export default ProjectDetailsModal
