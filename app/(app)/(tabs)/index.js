import React, { useState, useRef, useEffect } from 'react'
import { router } from 'expo-router'
import {
  View,
  SafeAreaView,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native'
import { collection, onSnapshot } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { TicketCard } from '@/components/TicketCard'
import { FilterModal } from '@/components/FilterModal'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { AnimatedIconLegend } from '@/components/IconLegend'
import DateTimePicker from '@react-native-community/datetimepicker'

const TicketsScreen = () => {
  const [projects, setProjects] = useState([])
  const [filteredProjects, setFilteredProjects] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  // Filter state
  const [filters, setFilters] = useState({
    startDate: new Date(), // Changed to Date object for easier manipulation
    sortField: 'siteComplete',
    sortDirection: 'asc',
    searchQuery: '',
  })

  // Modal visibility
  const [isFilterModalVisible, setFilterModalVisible] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Animated values for opacity
  const scrollY = useRef(new Animated.Value(0)).current

  // Fetch all tickets from Firestore
  useEffect(() => {
    const projectsRef = collection(firestore, 'tickets')

    const unsubscribe = onSnapshot(
      projectsRef,
      snapshot => {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        setProjects(projectsData)
      },
      error => {
        console.error('Error fetching projects:', error)
        Alert.alert(
          'Error',
          'Could not fetch projects. Please try again later.'
        )
      }
    )

    return () => unsubscribe()
  }, [])

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...projects]

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(
        project =>
          project.address &&
          project.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply date filter
    if (filters.startDate) {
      const filterDate = filters.startDate
      filtered = filtered.filter(project => {
        const projectDate = project.startDate
          ? project.startDate.toDate()
          : null
        return (
          projectDate &&
          projectDate.toDateString() === filterDate.toDateString()
        )
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const fieldA = a[filters.sortField]?.toString().toLowerCase() || ''
      const fieldB = b[filters.sortField]?.toString().toLowerCase() || ''
      if (fieldA < fieldB) return filters.sortDirection === 'asc' ? -1 : 1
      if (fieldA > fieldB) return filters.sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredProjects(filtered)
  }, [projects, searchQuery, filters])

  // Handle opening and applying filters
  const openFilterModal = () => setFilterModalVisible(true)
  const closeFilterModal = () => setFilterModalVisible(false)

  const applyFilters = newFilters => {
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }))
    closeFilterModal()
  }

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (selectedDate) {
      setFilters(prev => ({ ...prev, startDate: selectedDate }))
    }
  }

  // Interpolate opacity from scrollY
  const opacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Actions */}
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by address..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={openFilterModal} style={styles.filterButton}>
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Display current filter date */}
      <TouchableOpacity onPress={() => {}} style={styles.dateIndicator}>
        <Text style={styles.dateText}>Showing tickets for: </Text>
        <DateTimePicker
          value={filters.startDate}
          mode="date"
          display="compact"
          onChange={handleDateChange}
          style={styles.datePicker}
        />
      </TouchableOpacity>

      {/* Tickets List */}
      <Animated.ScrollView
        contentContainerStyle={styles.scrollViewContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project, index) => (
            <View
              key={project.id}
              style={[
                styles.ticketContainer,
                { backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#eaeaea' }, // Alternating shades
              ]}
            >
              <TicketCard
                project={project}
                onPress={() =>
                  router.push({
                    pathname: '/TicketDetailsScreen',
                    params: { projectId: project.id },
                  })
                }
              />
            </View>
          ))
        ) : (
          <Text style={styles.noResultsText}>No tickets found.</Text>
        )}
      </Animated.ScrollView>

      {/* Floating Button */}
      <Animated.View style={[styles.floatingButtonContainer, { opacity }]}>
        <TouchableOpacity
          onPress={() => router.push('/CreateTicketScreen')}
          style={styles.floatingButton}
        >
          <IconSymbol name="plus" size={30} color="white" />
          <Text style={styles.floatingButtonText}>Create Ticket</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Icon Legend */}
      <Animated.View style={[styles.iconContainer, { opacity }]}>
        <AnimatedIconLegend />
      </Animated.View>

      {/* Filter Modal */}
      <FilterModal
        visible={isFilterModalVisible}
        onClose={closeFilterModal}
        onApplyFilters={applyFilters}
        initialFilters={filters}
      />
    </SafeAreaView>
  )
}

export default TicketsScreen

const styles = StyleSheet.create({
  // ... other styles
  dateIndicator: {
    alignSelf: 'center',
    marginTop: 5,
    marginBottom: 10,
    flexDirection: 'row', // Align children horizontally
    alignItems: 'center', // Center align items vertically
  },
  dateText: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
  },
  datePicker: {
    width: 150, // Adjust width as needed
    marginLeft: 5, // Space from text
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  ticketContainer: {
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
    marginTop: 20,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  filterButton: {
    marginRight: 8,
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 8,
  },
  filterButtonText: {
    color: 'white',
    fontSize: 14,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
    marginTop: 20,
  },
  iconContainer: {
    position: 'absolute',
    bottom: 90,
    right: 24,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 160,
    right: 24,
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F39C12',
    borderRadius: 30,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  floatingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 10,
  },
})
