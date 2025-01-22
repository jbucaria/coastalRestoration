import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'

const FilterModal = ({
  visible,
  onClose,
  onApplyFilters,
  initialFilters = {},
}) => {
  const [startDate, setStartDate] = useState(
    initialFilters.startDate ? new Date(initialFilters.startDate) : new Date()
  )
  const [sortField, setSortField] = useState(
    initialFilters.sortField || 'siteComplete'
  )
  const [sortDirection, setSortDirection] = useState(
    initialFilters.sortDirection || 'asc'
  )
  const [searchQuery, setSearchQuery] = useState(
    initialFilters.searchQuery || ''
  )
  const [showDatePicker, setShowDatePicker] = useState(false)

  const resetFilters = () => {
    setStartDate(new Date())
    setSortField('siteComplete')
    setSortDirection('asc')
    setSearchQuery('')
  }

  const applyFilters = () => {
    onApplyFilters({
      startDate: startDate ? startDate.toISOString() : '',
      sortField,
      sortDirection,
      searchQuery,
    })
  }

  const toggleSortField = field => {
    setSortField(field)
  }

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (selectedDate) {
      setStartDate(selectedDate)
    }
  }

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.resetButton}>Reset</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Start Date</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <Text style={styles.optionText}>
                {startDate ? startDate.toDateString() : 'Select Date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sort By</Text>
            {[
              'siteComplete',
              'remediationRequired',
              'equipmentOnSite',
              'inspectorName',
            ].map(field => (
              <View key={field} style={styles.sortOption}>
                <Switch
                  value={sortField === field}
                  onValueChange={() => toggleSortField(field)}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={sortField === field ? '#f5dd4b' : '#f4f3f4'}
                />
                <Text style={styles.sortLabel}>
                  {field
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase())}
                </Text>
              </View>
            ))}
            <TouchableOpacity
              onPress={() =>
                setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
              }
              style={styles.sortDirection}
            >
              <Text>
                Order: {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Address</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Enter address"
              onChangeText={setSearchQuery}
              value={searchQuery}
            />
          </View>

          <TouchableOpacity onPress={applyFilters} style={styles.applyButton}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export { FilterModal }

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cancelButton: {
    color: 'blue',
  },
  resetButton: {
    color: 'red',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sortLabel: {
    marginLeft: 10,
    fontSize: 16,
  },
  sortDirection: {
    marginTop: 10,
  },
  searchInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  applyButton: {
    backgroundColor: '#3498db',
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 20,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
  },
})
