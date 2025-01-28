import React, { useState, useCallback } from 'react'
import { useRouter } from 'expo-router'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  Alert,
  ScrollView,
  Platform,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import 'react-native-get-random-values'
import DateTimePicker from '@react-native-community/datetimepicker'

import * as ImagePicker from 'expo-image-picker'

import { collection, addDoc, updateDoc } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { firestore } from '@/firebaseConfig'

import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'

import { IconSymbol } from '@/components/ui/IconSymbol'
import { FloatingBackButton } from '@/components/FloatingBackButton'

const initialTicketStatus = {
  street: '',
  apt: '',
  city: '',
  state: '',
  zip: '',
  date: '',
  customer: 'DR Horton',
  customerName: 'John Doe',
  customerNumber: '727-555-1234',
  homeOwnerName: 'Jane Doe',
  homeOwnerNumber: '727-555-5678',
  inspectorName: 'John Bucaria',
  reason: 'leak in garage',
  jobType: 'inspection',
  hours: '',
  typeOfJob: '',
  recommendedActions: '',
  messageCount: 0,
  photos: [],
  onSite: false,
  inspectionComplete: false,
  remediationRequired: false,
  remediationComplete: false,
  equipmentOnSite: false,
  siteComplete: false,
  measurementsRequired: false,
}

const CreateTicketScreen = () => {
  const router = useRouter()

  const [newTicket, setNewTicket] = useState(initialTicketStatus)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [startTime, setStartTime] = useState(new Date(2023, 0, 1, 10, 0))
  const [endTime, setEndTime] = useState(new Date(2023, 0, 1, 12, 0))
  const [showStartTimePicker, setShowStartTimePicker] = useState(false)
  const [showEndTimePicker, setShowEndTimePicker] = useState(false)
  const [jobType, setJobType] = useState('')
  const [jobTypeModalVisible, setJobTypeModalVisible] = useState(false)
  const [vacancyModalVisible, setVacancyModalVisible] = useState(false)
  const [vacancy, setVacancy] = useState('')

  const resetForm = () => {
    setNewTicket(initialTicketStatus)
  }

  const handleTogglePicker = () => {
    setJobTypeModalVisible(!jobTypeModalVisible)
  }
  const handleToggleVacancyPicker = () => {
    setVacancyModalVisible(!vacancyModalVisible)
  }

  const handleJobTypeChange = itemValue => {
    setJobType(itemValue)
    setNewTicket(prevTicket => ({
      ...prevTicket,
      typeOfJob: itemValue,
    }))
  }
  const handleVacancyChange = itemValue => {
    setVacancy(itemValue)
    setNewTicket(prevTicket => ({
      ...prevTicket,
      occupied: itemValue === 'occupied',
    }))
    setVacancyModalVisible(false)
  }

  const handleBack = () => {
    resetForm()
    router.back()
  }

  const parseAddressComponents = addressComponents => {
    const components = {
      street: '',
      city: '',
      state: '',
      zip: '',
    }

    addressComponents.forEach(component => {
      if (component.types.includes('street_number')) {
        components.street = component.long_name + ' '
      }
      if (component.types.includes('route')) {
        components.street += component.long_name
      }
      if (component.types.includes('locality')) {
        components.city = component.long_name
      }
      if (component.types.includes('administrative_area_level_1')) {
        components.state = component.short_name
      }
      if (component.types.includes('postal_code')) {
        components.zip = component.long_name
      }
    })

    return components
  }

  const createTicket = async ticketData => {
    try {
      const docRef = await addDoc(collection(firestore, 'tickets'), {
        ...ticketData,
        createdAt: new Date(),
        typeOfJob: newTicket.typeOfJob,
      })

      const docId = docRef.id
      const lastSix = docId.slice(-6)
      const ticketNumber = `CR-${lastSix}`
      await updateDoc(docRef, { projectId: docId, ticketNumber })

      Alert.alert('Success', 'Ticket created successfully.')
      // Reset the form after a successful save
      resetForm()
    } catch (error) {
      console.error('Error creating ticket:', error)
      Alert.alert('Error', 'Failed to create the ticket. Please try again.')
    }
  }

  const handleCreateTicket = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      if (
        !newTicket.street ||
        !newTicket.city ||
        !newTicket.state ||
        !newTicket.zip ||
        !newTicket.customer
      ) {
        Alert.alert('Validation Error', 'Please fill out all required fields.')
        setIsSubmitting(false)
        return
      }

      const formattedNumber = newTicket.customerNumber
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')

      const composedAddress = `${newTicket.street}${
        newTicket.apt ? ' Apt ' + newTicket.apt : ''
      }, ${newTicket.city}, ${newTicket.state} ${newTicket.zip}`

      const ticketData = {
        ...newTicket,
        contactNumber: formattedNumber,
        address: composedAddress,
        startDate: selectedDate,
        startTime: startTime,
        endTime: endTime,
        createdAt: new Date(),
      }

      await createTicket(ticketData)

      resetForm()
      router.back()
    } catch (error) {
      console.error('Error creating the ticket:', error)
      Alert.alert('Error', 'Failed to create the ticket. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAutocompletePress = (data, details = null) => {
    if (details && details.address_components) {
      const parsed = parseAddressComponents(details.address_components)
      setNewTicket(prev => ({
        ...prev,
        street: parsed.street,
        city: parsed.city,
        state: parsed.state,
        zip: parsed.zip,
      }))
    } else {
      console.log('No details returned:', data)
      setNewTicket(prev => ({
        ...prev,
        street: data.description,
      }))
    }
  }

  const handleAddPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera roll permissions are needed to add photos.'
      )
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    })

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const storage = getStorage()
      const uploadPromises = result.assets.map(async asset => {
        const response = await fetch(asset.uri)
        const blob = await response.blob()
        const fileRef = ref(
          storage,
          `ticketPhotos/${Date.now()}_${asset.fileName}`
        )
        await uploadBytes(fileRef, blob)
        const downloadURL = await getDownloadURL(fileRef)
        return downloadURL
      })

      try {
        const newPhotoURLs = await Promise.all(uploadPromises)
        setNewTicket(prev => ({
          ...prev,
          photos: [...prev.photos, ...newPhotoURLs],
        }))
        Alert.alert('Success', 'Photos added successfully.')
      } catch (error) {
        console.error('Error uploading photos:', error)
        Alert.alert('Error', 'Failed to upload photos. Please try again.')
      }
    } else {
      Alert.alert('No Selection', 'You did not select any image.')
    }
  }, [])

  const setTimeToDate = (baseDate, timeDate) => {
    const newDate = new Date(baseDate)
    newDate.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0)
    return newDate
  }

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (date) {
      setSelectedDate(date)
      setStartTime(setTimeToDate(date, startTime))
      setEndTime(setTimeToDate(date, endTime))
    }
  }

  const handleStartTimeChange = (event, time) => {
    setShowStartTimePicker(Platform.OS === 'ios')
    if (time) {
      setStartTime(setTimeToDate(selectedDate, time))
    }
  }

  const handleEndTimeChange = (event, time) => {
    setShowEndTimePicker(Platform.OS === 'ios')
    if (time) {
      setEndTime(setTimeToDate(selectedDate, time))
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <FloatingBackButton color="#007bff" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={40} // Adjust this value based on your preference
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <Text style={styles.title}>Create New Ticket</Text>
            {/* Back Button */}
            <View style={styles.floatingContainer}>
              <TouchableOpacity
                onPress={handleBack}
                style={styles.floatingBackButton}
              >
                <IconSymbol name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateTimeContainer}>
              <Text style={styles.label}>Date:</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.selectorButton}
              >
                <IconSymbol name="calendar-outline" size={24} color="#2980b9" />
              </TouchableOpacity>

              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            </View>

            <View style={styles.dateTimeContainer}>
              <Text style={styles.label}>Start Time:</Text>

              <DateTimePicker
                value={startTime}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={handleStartTimeChange}
                minuteInterval={15}
              />
            </View>

            <View style={styles.dateTimeContainer}>
              <Text style={styles.label}>End Time:</Text>

              <DateTimePicker
                value={endTime}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={handleEndTimeChange}
                minuteInterval={15}
              />
            </View>
            {/* Address Fields */}
            <Text style={styles.sectionTitle}>Address</Text>

            {/* Google Places Autocomplete */}
            <GooglePlacesAutocomplete
              filterReverseGeocodingByTypes={['locality']}
              debounce={500}
              disableScroll={true}
              placeholder="Search address..."
              onPress={handleAutocompletePress}
              query={{
                key: 'AIzaSyCaaprXbVDmKz6W5rn3s6W4HhF4S1K2-zs', // Replace with your API key
                language: 'en',
                components: 'country:us',
              }}
              fetchDetails={true}
              styles={{
                textInputContainer: styles.autocompleteContainer,
                textInput: styles.inputField,
                listView: {
                  backgroundColor: 'white',
                  maxHeight: 200,
                  elevation: 5,
                  zIndex: 5,
                },
              }}
            />

            <TextInput
              style={styles.inputField}
              placeholder="Street"
              value={newTicket.street}
              onChangeText={text =>
                setNewTicket({ ...newTicket, street: text })
              }
              keyboardType="default"
            />
            <TextInput
              style={styles.inputField}
              placeholder="Apt # (optional)"
              value={newTicket.apt}
              onChangeText={text => setNewTicket({ ...newTicket, apt: text })}
              keyboardType="default"
            />
            <TextInput
              style={styles.inputField}
              placeholder="City"
              value={newTicket.city}
              onChangeText={text => setNewTicket({ ...newTicket, city: text })}
              keyboardType="default"
            />
            <TextInput
              style={styles.inputField}
              placeholder="State"
              value={newTicket.state}
              onChangeText={text => setNewTicket({ ...newTicket, state: text })}
              keyboardType="default"
            />
            <TextInput
              style={styles.inputField}
              placeholder="ZIP"
              value={newTicket.zip}
              onChangeText={text => setNewTicket({ ...newTicket, zip: text })}
              keyboardType="numeric"
            />

            {/* Customer Info */}
            <Text style={styles.sectionTitle}>Builder</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Builder"
              value={newTicket.customer}
              onChangeText={text =>
                setNewTicket({ ...newTicket, customer: text })
              }
              keyboardType="default"
            />
            <TextInput
              style={styles.inputField}
              placeholder="Contact Name"
              value={newTicket.customerName}
              onChangeText={text =>
                setNewTicket({ ...newTicket, customerName: text })
              }
              keyboardType="default"
            />
            <TextInput
              style={styles.inputField}
              placeholder="Contact Number"
              value={newTicket.customerNumber}
              onChangeText={text =>
                setNewTicket({ ...newTicket, customerNumber: text })
              }
              keyboardType="phone-pad"
            />

            {/* Homeowner Info */}
            <Text style={styles.sectionTitle}>Homeowner</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Homeowner Name"
              value={newTicket.homeOwnerName}
              onChangeText={text =>
                setNewTicket({ ...newTicket, homeOwnerName: text })
              }
              keyboardType="default"
            />
            <TextInput
              style={styles.inputField}
              placeholder="Homeowner Number"
              value={newTicket.homeOwnerNumber}
              onChangeText={text =>
                setNewTicket({ ...newTicket, homeOwnerNumber: text })
              }
              keyboardType="phone-pad"
            />

            {/* Ticket Details */}
            <Text style={styles.sectionTitle}>Ticket Details</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Inspector Name"
              value={newTicket.inspectorName}
              onChangeText={text =>
                setNewTicket({ ...newTicket, inspectorName: text })
              }
              keyboardType="default"
            />
            <TextInput
              style={styles.inputField}
              placeholder="Reason for Inspection"
              value={newTicket.reason}
              onChangeText={text =>
                setNewTicket({ ...newTicket, reason: text })
              }
              keyboardType="default"
            />
            <View style={styles.container}>
              {/* Trigger Button */}
              <TouchableOpacity
                onPress={handleTogglePicker}
                style={styles.button}
              >
                <Text style={styles.buttonText}>
                  {jobType ? jobType : 'Select Job Type'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleToggleVacancyPicker}
                style={styles.button}
              >
                <Text style={styles.buttonText}>
                  {vacancy === 'occupied'
                    ? 'Occupied'
                    : vacancy === 'unoccupied'
                      ? 'Unoccupied'
                      : 'Select Occupancy'}
                </Text>
              </TouchableOpacity>

              {/* Picker Modal */}
              <Modal
                visible={jobTypeModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={handleTogglePicker}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={jobType}
                      onValueChange={handleJobTypeChange}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select job type" value="" />
                      <Picker.Item
                        label="Leak Detection"
                        value="leak detection"
                      />
                      <Picker.Item label="Inspection" value="inspection" />
                      <Picker.Item label="Containment" value="containment" />
                      <Picker.Item label="Flood" value="flood" />
                      <Picker.Item label="Mold Job" value="mold job" />
                      <Picker.Item label="Wipe Down" value="wipe down" />
                    </Picker>
                    <View
                      style={{ flexDirection: 'row', justifyContent: 'center' }}
                    >
                      <TouchableOpacity onPress={handleTogglePicker}>
                        <Text style={styles.label}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
              {/* Picker Modal */}
              <Modal
                visible={vacancyModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={handleVacancyChange}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={vacancy}
                      onValueChange={handleVacancyChange}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select occupency" value="" />

                      <Picker.Item label="Occupied" value="occupied" />
                      <Picker.Item label="Unuocupied" value="unoccupied" />
                    </Picker>
                    <View
                      style={{ flexDirection: 'row', justifyContent: 'center' }}
                    >
                      <TouchableOpacity onPress={handleTogglePicker}>
                        <Text style={styles.label}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </View>

            {/* Photos */}
            {newTicket.photos.length > 0 && (
              <View style={styles.photosContainer}>
                {newTicket.photos.map((uri, index) => (
                  <Image key={index} source={{ uri }} style={styles.photo} />
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={handleAddPhoto}
              style={styles.addPhotoButton}
            >
              <Text style={styles.addPhotoButtonText}>Add Photo</Text>
            </TouchableOpacity>

            {/* Buttons: Create, Cancel */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={handleCreateTicket}
                style={[
                  styles.actionButton,
                  styles.createButton,
                  isSubmitting && styles.disabledButton,
                ]}
                disabled={isSubmitting}
              >
                <Text style={styles.actionButtonText}>
                  {isSubmitting ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleBack}
                style={[styles.actionButton, styles.cancelButton]}
                disabled={isSubmitting}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default CreateTicketScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    padding: 10,
    backgroundColor: '#2980b9',
    borderRadius: 5,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  picker: {
    width: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: '#eceff1',
  },
  scrollView: {
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  floatingContainer: {
    position: 'absolute',
    top: 0,
    left: -10,
    zIndex: 10,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#34495e',
    width: 100,
  },
  selectorButton: {
    padding: 5,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#34495e',
    width: 100,
  },
  displaySelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  displayText: {
    fontSize: 16,
    color: '#2c3e50',
    marginRight: 10,
    flex: 1,
  },
  selectorButton: {
    padding: 5,
  },
  autocompleteContainer: {
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginVertical: 10,
  },
  label: {
    fontSize: 16,
    color: '#34495e',
    marginRight: 10,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateTimeSelect: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    padding: 10,
  },
  inputField: {
    backgroundColor: 'white',
    borderColor: '#bdc3c7',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    fontSize: 16,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  photo: {
    width: 60,
    height: 60,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  addPhotoButton: {
    backgroundColor: '#2ecc71',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  addPhotoButtonText: {
    color: 'white',
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#2c3e50',
    marginRight: 5,
  },
  cancelButton: {
    backgroundColor: '#c0392b',
    marginLeft: 5,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
