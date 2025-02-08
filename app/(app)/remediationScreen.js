import React, { useState, useCallback, useEffect } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  Alert,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import * as ImagePicker from 'expo-image-picker'
import { v4 as uuidv4 } from 'uuid'
import { storage, firestore } from '@/firebaseConfig'
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const RemediationScreen = ({ route }) => {
  const router = useRouter()
  const { projectId } = useLocalSearchParams()

  // Rooms state (each room has measurements and photos)
  const [rooms, setRooms] = useState([])

  // Quick room options
  const ROOM_OPTIONS = [
    'Bedroom',
    'Kitchen',
    'Garage',
    'Living Room',
    'Bathroom',
  ]

  // -------------------- Items Search Modal State --------------------
  const [showItemsModal, setShowItemsModal] = useState(false)
  const [currentRoomId, setCurrentRoomId] = useState(null)
  const [currentMeasurementId, setCurrentMeasurementId] = useState(null)
  const [allItems, setAllItems] = useState([])
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [loadingItemsModal, setLoadingItemsModal] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState(null)

  // -------------------- Room / Measurement Functions --------------------
  // Add a new room.
  const handleAddRoom = (roomName = '') => {
    const newRoom = {
      id: uuidv4(),
      name: roomName.trim() || `Room ${rooms.length + 1}`,
      measurements: [],
      photos: [],
    }
    setRooms([...rooms, newRoom])
  }

  // Delete a room.
  const handleDeleteRoom = roomId => {
    setRooms(rooms.filter(room => room.id !== roomId))
  }

  // Create a new measurement and open the item selection modal.
  const handleCreateMeasurement = roomId => {
    const newMeasurementId = uuidv4()
    const newMeasurement = {
      id: newMeasurementId,
      description: '', // To be set via item selection
      quantity: 0,
      itemId: '',
    }
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? { ...room, measurements: [...room.measurements, newMeasurement] }
          : room
      )
    )
    setCurrentRoomId(roomId)
    setCurrentMeasurementId(newMeasurementId)
    openItemsModal()
  }

  // Open modal for editing an existing measurement's item.
  const handleEditMeasurement = (roomId, measurementId) => {
    setCurrentRoomId(roomId)
    setCurrentMeasurementId(measurementId)
    openItemsModal()
  }

  const openItemsModal = () => {
    setShowItemsModal(true)
    if (allItems.length === 0) {
      setLoadingItemsModal(true)
      fetchItemsFromFirestore().finally(() => setLoadingItemsModal(false))
    }
  }

  // Update measurement field.
  const handleMeasurementChange = (roomId, measurementId, field, value) => {
    setRooms(prev =>
      prev.map(room => {
        if (room.id !== roomId) return room
        const updatedMeasurements = room.measurements.map(m =>
          m.id === measurementId ? { ...m, [field]: value } : m
        )
        return { ...room, measurements: updatedMeasurements }
      })
    )
  }

  // Delete a measurement.
  const handleDeleteMeasurement = (roomId, measurementId) => {
    setRooms(prev =>
      prev.map(room => {
        if (room.id !== roomId) return room
        return {
          ...room,
          measurements: room.measurements.filter(m => m.id !== measurementId),
        }
      })
    )
  }

  // -------------------- Photo Functions --------------------
  const handleAddPhoto = async (roomId, projectId) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera roll permission is required to select photos.'
        )
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ['images'],
        quality: 0.5,
        copyToCacheDirectory: true,
      })
      if (result.canceled) return
      if (result.assets && result.assets.length > 0) {
        const uploadPromises = result.assets.map(async asset => {
          const response = await fetch(asset.uri)
          const blob = await response.blob()
          const fileName = asset.fileName || `${uuidv4()}.jpg`
          const storagePath = `remediationPhotos/${projectId}/${fileName}`
          const storageRef = ref(storage, storagePath)
          await uploadBytes(storageRef, blob)
          const downloadURL = await getDownloadURL(storageRef)
          return { storagePath, downloadURL }
        })
        const photosArray = await Promise.all(uploadPromises)
        setRooms(prevRooms =>
          prevRooms.map(room =>
            room.id === roomId
              ? { ...room, photos: [...room.photos, ...photosArray] }
              : room
          )
        )
      }
    } catch (error) {
      console.error('Error selecting images:', error)
      Alert.alert(
        'Error',
        'Could not select or upload photos. Please try again.'
      )
    }
  }

  const handleDeletePhoto = (roomId, photoUri) => {
    setRooms(prev =>
      prev.map(room => {
        if (room.id !== roomId) return room
        return { ...room, photos: room.photos.filter(uri => uri !== photoUri) }
      })
    )
  }

  // Save remediation data to Firestore.
  const handleSaveRemediationData = async () => {
    try {
      const remediationData = {
        rooms: rooms,
        updatedAt: new Date(),
      }
      await updateDoc(doc(firestore, 'tickets', projectId), {
        remediationData,
        remediationRequired: false,
        remediationComplete: true,
      })
      Alert.alert('Success', 'Remediation data saved successfully.')
      router.back()
    } catch (error) {
      console.error('Error saving remediation data:', error)
      Alert.alert('Error', 'Failed to save data. Please try again.')
    }
  }
  const fetchItemsFromFirestore = async () => {
    try {
      const querySnapshot = await getDocs(collection(firestore, 'items'))
      const itemsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      setAllItems(itemsData)
    } catch (error) {
      console.error('Error fetching items from Firestore:', error)
      Alert.alert('Error', 'Failed to load items from database.')
    }
  }

  // When an item is selected from the modal Picker, update the measurement.
  const handleSelectItem = item => {
    setRooms(prevRooms =>
      prevRooms.map(room => {
        if (room.id !== currentRoomId) return room
        const updatedMeasurements = room.measurements.map(m =>
          m.id === currentMeasurementId
            ? {
                ...m,
                description: item.name,
                itemId: item.id,
                unitPrice: item.unitPrice,
              }
            : m
        )
        return { ...room, measurements: updatedMeasurements }
      })
    )
    // Reset modal state.
    setShowItemsModal(false)
    setItemSearchQuery('')
    setCurrentRoomId(null)
    setCurrentMeasurementId(null)
    setSelectedItem(null)
  }

  // -------------------- Date & Time Functions --------------------
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [startTime, setStartTime] = useState(new Date(2023, 0, 1, 10, 0))
  const [endTime, setEndTime] = useState(new Date(2023, 0, 1, 12, 0))
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showStartTimePicker, setShowStartTimePicker] = useState(false)
  const [showEndTimePicker, setShowEndTimePicker] = useState(false)

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (date) {
      setSelectedDate(date)
      setStartTime(setTimeToDate(date, startTime))
      setEndTime(setTimeToDate(date, endTime))
    }
  }

  const setTimeToDate = (baseDate, timeDate) => {
    const newDate = new Date(baseDate)
    newDate.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0)
    return newDate
  }

  // -------------------- Navigation and Helpers --------------------

  const resetForm = () => {
    setRooms([])
  }

  // -------------------- Render --------------------
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={40}
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <Text style={styles.title}>Remediation Measurements</Text>

            {/* Quick Room Buttons */}
            <View style={styles.quickRoomsRow}>
              {ROOM_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option}
                  style={styles.quickRoomButton}
                  onPress={() => handleAddRoom(option)}
                >
                  <Text style={styles.quickRoomButtonText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Add Generic Room Button */}
            <TouchableOpacity
              onPress={() => handleAddRoom()}
              style={styles.addGenericRoomButton}
            >
              <Text style={styles.addGenericRoomButtonText}>
                + Add Generic Room
              </Text>
            </TouchableOpacity>

            {/* List of Rooms */}
            {rooms.map(room => (
              <View key={room.id} style={styles.roomContainer}>
                <View style={styles.roomHeader}>
                  <Text style={styles.roomTitle}>{room.name}</Text>
                  <TouchableOpacity onPress={() => handleDeleteRoom(room.id)}>
                    <Text style={styles.deleteRoomText}>Delete Room</Text>
                  </TouchableOpacity>
                </View>

                {/* List of Measurements */}
                {room.measurements.map(measurement => (
                  <View key={measurement.id} style={styles.measurementRow}>
                    <TextInput
                      style={[styles.measurementInput, { flex: 1 }]}
                      placeholder="Description (select item)"
                      value={measurement.description}
                      onChangeText={val =>
                        handleMeasurementChange(
                          room.id,
                          measurement.id,
                          'description',
                          val
                        )
                      }
                    />
                    <TextInput
                      style={[
                        styles.measurementInput,
                        { width: 100, marginLeft: 8 },
                      ]}
                      placeholder="Qty (e.g. 30)"
                      value={measurement.quantity.toString()}
                      keyboardType="numeric"
                      onChangeText={val => {
                        const numericValue = parseFloat(val) || 0 // Convert to number, default to 0 if invalid
                        handleMeasurementChange(
                          room.id,
                          measurement.id,
                          'quantity',
                          numericValue
                        )
                      }}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        handleDeleteMeasurement(room.id, measurement.id)
                      }
                      style={styles.deleteMeasurementButton}
                    >
                      <Text style={styles.deleteMeasurementButtonText}>X</Text>
                    </TouchableOpacity>
                    {/* Button to open modal to edit/select item */}
                    <TouchableOpacity
                      onPress={() =>
                        handleEditMeasurement(room.id, measurement.id)
                      }
                      style={styles.selectItemButton}
                    >
                      <Text style={styles.selectItemButtonText}>
                        Select Item
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Button to add a new measurement */}
                <TouchableOpacity
                  onPress={() => handleCreateMeasurement(room.id)}
                  style={styles.addMeasurementButton}
                >
                  <Text style={styles.addMeasurementButtonText}>
                    + Add Measurement
                  </Text>
                </TouchableOpacity>

                {/* Photos */}
                {room.photos.length > 0 && (
                  <ScrollView horizontal style={styles.photoRow}>
                    {room.photos.map(photo => (
                      <View key={photo.storagePath} style={styles.photoItem}>
                        <Image
                          source={{ uri: photo.downloadURL }}
                          style={styles.photoImage}
                        />
                        <TouchableOpacity
                          onPress={() =>
                            handleDeletePhoto(room.id, photo.storagePath)
                          }
                          style={styles.deletePhotoButton}
                        >
                          <Text style={styles.deletePhotoButtonText}>
                            Remove
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}

                <TouchableOpacity
                  onPress={() => handleAddPhoto(room.id, projectId)}
                  style={styles.addPhotoButton}
                >
                  <Text style={styles.addPhotoButtonText}>+ Add Photo</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Save Remediation Report */}
            {rooms.length > 0 && (
              <TouchableOpacity
                onPress={handleSaveRemediationData}
                style={styles.saveButton}
              >
                <Text style={styles.saveButtonText}>
                  Save Remediation Report
                </Text>
              </TouchableOpacity>
            )}

            {/* ---------------- Items Search Modal ---------------- */}
            {showItemsModal && (
              <Modal
                visible={showItemsModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowItemsModal(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.itemsModalContainer}>
                    <Text style={styles.modalTitle}>Select an Item</Text>
                    <TextInput
                      style={styles.itemSearchInput}
                      placeholder="Search items..."
                      value={itemSearchQuery}
                      onChangeText={setItemSearchQuery}
                    />
                    {loadingItemsModal ? (
                      <ActivityIndicator size="small" color="#2980B9" />
                    ) : (
                      <Picker
                        selectedValue={selectedItemId}
                        onValueChange={(itemId, itemIndex) =>
                          setSelectedItemId(itemId)
                        }
                      >
                        {allItems
                          .filter(item =>
                            item.name
                              .toLowerCase()
                              .includes(itemSearchQuery.toLowerCase())
                          )
                          .map(item => (
                            <Picker.Item
                              key={item.id}
                              label={`${item.name} - $${item.unitPrice}`}
                              value={item.id}
                            />
                          ))}
                      </Picker>
                    )}
                    <View style={styles.modalButtonsRow}>
                      <TouchableOpacity
                        onPress={() => {
                          const item = allItems.find(
                            i => i.id === selectedItemId
                          )
                          if (item) {
                            handleSelectItem(item)
                          } else {
                            Alert.alert(
                              'Select an item',
                              'Please select an item from the list.'
                            )
                          }
                        }}
                        style={styles.modalConfirmButton}
                      >
                        <Text style={styles.modalConfirmButtonText}>
                          Confirm
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setShowItemsModal(false)}
                        style={styles.modalCloseButton}
                      >
                        <Text style={styles.modalCloseButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default RemediationScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F7',
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
  quickRoomsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickRoomButton: {
    backgroundColor: '#3498DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 4,
  },
  quickRoomButtonText: {
    color: '#FFF',
    fontSize: 14,
  },
  addGenericRoomButton: {
    backgroundColor: '#95A5A6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 8,
    alignSelf: 'flex-start',
  },
  addGenericRoomButtonText: {
    color: '#FFF',
    fontSize: 14,
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
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
  deleteRoomText: {
    color: 'red',
    fontWeight: '600',
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  measurementInput: {
    backgroundColor: '#f2f2f2',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: '#2C3E50',
    marginRight: 4,
    marginBottom: 4,
  },
  deleteMeasurementButton: {
    backgroundColor: '#e74c3c',
    marginLeft: 8,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteMeasurementButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  addMeasurementButton: {
    marginTop: 8,
    backgroundColor: '#27ae60',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  addMeasurementButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  selectItemButton: {
    backgroundColor: '#2980B9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 4,
    marginTop: 4,
  },
  selectItemButtonText: {
    color: '#FFF',
    fontSize: 12,
  },
  photoRow: {
    marginTop: 10,
  },
  photoItem: {
    marginRight: 8,
    position: 'relative',
  },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deletePhotoButtonText: {
    color: '#FFF',
    fontSize: 10,
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
  saveButton: {
    marginTop: 20,
    backgroundColor: '#2C3E50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // ---------------- Items Search Modal Styles ----------------
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsModalContainer: {
    backgroundColor: 'white',
    width: '80%',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  itemSearchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  modalItemsList: {
    maxHeight: 200,
  },
  modalCloseButton: {
    backgroundColor: '#2980B9',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalConfirmButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalConfirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // ---------------- End Modal Styles ----------------
})
