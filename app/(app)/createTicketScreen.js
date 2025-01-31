import React, { useState, useCallback, useEffect } from 'react'
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

import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'

import { IconSymbol } from '@/components/ui/IconSymbol'
import { FloatingBackButton } from '@/components/FloatingBackButton'
import { handleCreateTicket } from '@/utils/ticketUtils'
import { useUserStore } from '@/store/useUserStore'

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
  const { user } = useUserStore()

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
  const [newNote, setNewNote] = useState('')
  const [inputHeight, setInputHeight] = useState(40)
  const [manualAddress, setManualAddress] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState('')

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

  const handleBackToSearch = () => {
    setManualAddress(false)
    setSelectedAddress('')
  }

  const handleAddAddressManually = () => {
    setManualAddress(true)
    setSelectedAddress('')
  }

  const resetForm = () => {
    setNewTicket(initialTicketStatus)
  }

  const handleTogglePicker = () => {
    setJobTypeModalVisible(!jobTypeModalVisible)
  }
  const handleToggleVacancyPicker = () => {
    setVacancyModalVisible(!vacancyModalVisible)
  }

  const handleRemovePhoto = index => {
    setNewTicket(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index), // Remove photo by index
    }))
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

  const handleCreate = () => {
    handleCreateTicket(
      newTicket,
      selectedDate,
      startTime,
      endTime,
      resetForm,
      setIsSubmitting,
      isSubmitting,
      newNote,
      user
    )
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
      setSelectedAddress(data.description)
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
      const selectedPhotos = result.assets.map(asset => asset.uri)
      setNewTicket(prev => ({
        ...prev,
        photos: [...prev.photos, ...selectedPhotos], // Store photo URIs locally
      }))
      Alert.alert('Success', 'Photos added successfully.')
    } else {
      Alert.alert('No Selection', 'You did not select any image.')
    }
  }, [])

  const setTimeToDate = (baseDate, timeDate) => {
    const newDate = new Date(baseDate)
    newDate.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0)
    return newDate
  }

  console.log('select', selectedAddress)

  return (
    <SafeAreaView style={styles.container}>
      <FloatingBackButton color="#007bff" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
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
            {!manualAddress && (
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
                  textInput: styles.inputFieldGoogle,
                  listView: {
                    backgroundColor: 'white',
                    maxHeight: 200,
                    elevation: 5,
                    zIndex: 5,
                  },
                }}
              />
            )}

            {/* Display selected address */}
            {!manualAddress && selectedAddress && (
              <View style={styles.addressContainer}>
                <Text style={styles.selectedAddress}>
                  {newTicket.street && `${newTicket.street},`}
                </Text>
                <Text style={styles.selectedAddress}>
                  {newTicket.city && `${newTicket.city}, `}
                  {newTicket.state && `${newTicket.state} `}
                  {newTicket.zip && `${newTicket.zip}`}
                </Text>
              </View>
            )}

            {/* Button to switch to manual input */}
            {!manualAddress && (
              <TouchableOpacity
                onPress={handleAddAddressManually}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Add Address Manually</Text>
              </TouchableOpacity>
            )}

            {/* Address Input Fields - Shown when manual input is selected */}
            {manualAddress && (
              <>
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
                  onChangeText={text =>
                    setNewTicket({ ...newTicket, apt: text })
                  }
                  keyboardType="default"
                />
                <TextInput
                  style={styles.inputField}
                  placeholder="City"
                  value={newTicket.city}
                  onChangeText={text =>
                    setNewTicket({ ...newTicket, city: text })
                  }
                  keyboardType="default"
                />
                <TextInput
                  style={styles.inputField}
                  placeholder="State"
                  value={newTicket.state}
                  onChangeText={text =>
                    setNewTicket({ ...newTicket, state: text })
                  }
                  keyboardType="default"
                />
                <TextInput
                  style={styles.inputField}
                  placeholder="ZIP"
                  value={newTicket.zip}
                  onChangeText={text =>
                    setNewTicket({ ...newTicket, zip: text })
                  }
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  onPress={handleBackToSearch}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Back to Search</Text>
                </TouchableOpacity>
              </>
            )}
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
              multiline
              onContentSizeChange={(contentWidth, contentHeight) => {
                setInputHeight(contentHeight)
              }}
            />
            <View style={styles.container}>
              <TextInput
                style={styles.inputField}
                placeholder="Add a note for this ticket..."
                value={newNote}
                onChangeText={setNewNote}
                multiline
                numberOfLines={4}
              />

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
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photosContainer}
              >
                {newTicket.photos.map((uri, index) => (
                  <View key={index} style={styles.photoWrapper}>
                    <Image source={{ uri }} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => handleRemovePhoto(index)}
                    >
                      <Text style={styles.removePhotoText}>X</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
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
                onPress={handleCreate}
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
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    elevation: 3,
    marginVertical: 5,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  addressContainer: {
    marginBottom: 15,
  },
  selectedAddress: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
    textAlign: 'center', // Center the address
  },
  addPhotoButton: {
    backgroundColor: '#2ecc71',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  addPhotoButtonText: {
    color: 'white',
    fontSize: 18,
  },
  autocompleteContainer: {
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  button: {
    padding: 12,
    backgroundColor: '#2980b9',
    borderRadius: 5,
    marginBottom: 20,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  createButton: {
    backgroundColor: '#2c3e50',
    marginRight: 5,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  dateTimeSelect: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    padding: 12,
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
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  floatingContainer: {
    position: 'absolute',
    top: 0,
    left: -10,
    zIndex: 10,
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 5,
    textAlignVertical: 'top',
    marginBottom: 15,
    backgroundColor: 'white',
  },
  inputFieldGoogle: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 5,
    textAlignVertical: 'top',
    backgroundColor: 'white',
  },
  label: {
    fontSize: 16,
    color: '#34495e',
    marginRight: 10,
  },
  photosContainer: {
    marginVertical: 10,
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  photo: {
    width: 100,
    height: 100,
    marginBottom: 10,
    borderRadius: 5,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    borderRadius: 15,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: 'red',
    fontSize: 14,
    fontWeight: 'bold',
  },
  picker: {
    width: '100%',
  },
  pickerContainer: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  scrollView: {
    padding: 20,
  },
  selectorButton: {
    padding: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginVertical: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
})
