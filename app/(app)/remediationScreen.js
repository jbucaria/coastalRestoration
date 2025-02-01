import React, { useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { v4 as uuidv4 } from 'uuid'
import { storage, firestore } from '@/firebaseConfig'
import { doc, updateDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'

const RemediationScreen = ({ route }) => {
  const router = useRouter()
  const { projectId } = useLocalSearchParams()

  // Our main data: an array of rooms
  const [rooms, setRooms] = useState([])

  // Example: a list of common room names you can quickly select
  const ROOM_OPTIONS = [
    'Bedroom',
    'Kitchen',
    'Garage',
    'Living Room',
    'Bathroom',
  ]

  // Add a new room with a default name or custom name
  const handleAddRoom = (roomName = '') => {
    const newRoom = {
      id: uuidv4(),
      name: roomName.trim() || `Room ${rooms.length + 1}`,
      measurements: [],
      photos: [],
    }
    setRooms([...rooms, newRoom])
  }

  // Delete an entire room
  const handleDeleteRoom = roomId => {
    setRooms(rooms.filter(room => room.id !== roomId))
  }

  // Add a new measurement line to a room
  const handleAddMeasurement = roomId => {
    const newMeasurement = {
      id: uuidv4(),
      description: '',
      quantity: '',
    }
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? { ...room, measurements: [...room.measurements, newMeasurement] }
          : room
      )
    )
  }

  // Update a measurement line
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

  // Delete a measurement line
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

  const handleAddPhoto = async (roomId, projectId) => {
    try {
      // 1. Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Camera roll permission is required to select photos.'
        )
        return
      }

      // 2. Let user select photos from the image library
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ['images'],
        quality: 0.5,
        copyToCacheDirectory: true, // Helps prevent fetch(...) iOS errors
      })

      // 3. If the user didn't cancel, proceed with upload
      if (!result.canceled && result.assets) {
        // 4. Upload each selected image to Firebase Storage
        const uploadPromises = result.assets.map(async (asset, index) => {
          // Convert local URI to a blob
          const response = await fetch(asset.uri)
          const blob = await response.blob()

          // Create a unique Storage path
          const fileName = asset.fileName || `${uuidv4()}.jpg`
          const storageRef = ref(
            storage,
            `remediationPhotos/${projectId}/${fileName}`
          )

          // Upload the blob
          await uploadBytes(storageRef, blob)

          // Retrieve the download URL
          const downloadURL = await getDownloadURL(storageRef)
          return downloadURL
        })

        // 5. Wait until all uploads complete
        const downloadURLs = await Promise.all(uploadPromises)

        // 6. Update your local `rooms` state with these new URLs
        setRooms(prevRooms =>
          prevRooms.map(room => {
            if (room.id === roomId) {
              return { ...room, photos: [...room.photos, ...downloadURLs] }
            }
            return room
          })
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

  // Delete a photo from a room
  const handleDeletePhoto = (roomId, photoUri) => {
    setRooms(prev =>
      prev.map(room => {
        if (room.id !== roomId) return room
        return { ...room, photos: room.photos.filter(uri => uri !== photoUri) }
      })
    )
  }

  const handleSaveRemediationData = async () => {
    try {
      // Example: create an object to store in Firestore:
      const remediationData = {
        rooms: rooms,
        updatedAt: new Date(),
      }

      // Update the doc in the 'tickets' (or 'projects') collection
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Remediation Measurements</Text>

        {/* Quick Buttons to Add Common Rooms */}
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

        {/* Or a button to just add a generic "Room #"? */}
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

            {/* Measurements */}
            {room.measurements.map(measurement => (
              <View key={measurement.id} style={styles.measurementRow}>
                <TextInput
                  style={[styles.measurementInput, { flex: 1 }]}
                  placeholder="Description (e.g. Carpet)"
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
                  placeholder="Qty (e.g. 30 sq ft)"
                  value={measurement.quantity}
                  onChangeText={val =>
                    handleMeasurementChange(
                      room.id,
                      measurement.id,
                      'quantity',
                      val
                    )
                  }
                />
                <TouchableOpacity
                  onPress={() =>
                    handleDeleteMeasurement(room.id, measurement.id)
                  }
                  style={styles.deleteMeasurementButton}
                >
                  <Text style={styles.deleteMeasurementButtonText}>X</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Measurement Button */}
            <TouchableOpacity
              onPress={() => handleAddMeasurement(room.id)}
              style={styles.addMeasurementButton}
            >
              <Text style={styles.addMeasurementButtonText}>
                + Add Measurement
              </Text>
            </TouchableOpacity>

            {/* Photos */}
            {room.photos.length > 0 && (
              <ScrollView horizontal style={styles.photoRow}>
                {room.photos.map(uri => (
                  <View key={uri} style={styles.photoItem}>
                    <Image source={{ uri }} style={styles.photoImage} />
                    <TouchableOpacity
                      onPress={() => handleDeletePhoto(room.id, uri)}
                      style={styles.deletePhotoButton}
                    >
                      <Text style={styles.deletePhotoButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => handleAddPhoto(room.id)}
              style={styles.addPhotoButton}
            >
              <Text style={styles.addPhotoButtonText}>+ Add Photo</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Save Button */}
        {rooms.length > 0 && (
          <TouchableOpacity
            onPress={handleSaveRemediationData}
            style={styles.saveButton}
          >
            <Text style={styles.saveButtonText}>Save Remediation Report</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
    // optional shadows
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
})
