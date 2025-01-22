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
  ActivityIndicator,
} from 'react-native'
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
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
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)

  // Filter state
  const [filters, setFilters] = useState({
    sortField: 'siteComplete',
    sortDirection: 'asc',
  })

  // Modal visibility
  const [isFilterModalVisible, setFilterModalVisible] = useState(false)

  // Animated values for opacity
  const scrollY = useRef(new Animated.Value(0)).current

  useEffect(() => {
    let baseQuery = collection(firestore, 'tickets')
    let constructedQuery = baseQuery

    if (searchQuery) {
      // Prioritize search query over date filtering
      constructedQuery = query(
        constructedQuery,
        where('address', '>=', searchQuery),
        where('address', '<=', searchQuery + '\uf8ff')
      )
    } else if (selectedDate) {
      // Apply date filter if no search query is present
      const startOfDay = Timestamp.fromDate(
        new Date(selectedDate.setHours(0, 0, 0, 0))
      )
      const endOfDay = Timestamp.fromDate(
        new Date(selectedDate.setHours(23, 59, 59, 999))
      )
      constructedQuery = query(
        constructedQuery,
        where('startDate', '>=', startOfDay),
        where('startDate', '<=', endOfDay)
      )
    }

    const unsubscribe = onSnapshot(
      constructedQuery,
      snapshot => {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        console.log('Fetched projects:', projectsData) // Check if data is received
        setProjects(projectsData)
        setIsLoading(false)
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
  }, [searchQuery, selectedDate])

  // Apply filters and sorting
  useEffect(() => {
    let sortedProjects = [...projects]

    // Apply sorting
    sortedProjects.sort((a, b) => {
      const fieldA = a[filters.sortField]?.toString().toLowerCase() || ''
      const fieldB = b[filters.sortField]?.toString().toLowerCase() || ''
      if (fieldA < fieldB) return filters.sortDirection === 'asc' ? -1 : 1
      if (fieldA > fieldB) return filters.sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredProjects(sortedProjects)
  }, [projects, filters.sortField, filters.sortDirection])

  // Handle opening and applying filters
  const openFilterModal = () => setFilterModalVisible(true)
  const closeFilterModal = () => setFilterModalVisible(false)

  const applyFilters = newFilters => {
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }))
    closeFilterModal()
  }

  const handleDateChange = (event, date) => {
    if (date) {
      setSelectedDate(date)
      setSearchQuery('') // Clear search when selecting a new date
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
          onChangeText={text => {
            setSearchQuery(text)
            setSelectedDate(null) // Clear selected date when typing a search query
          }}
        />
        <TouchableOpacity onPress={openFilterModal} style={styles.filterButton}>
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Display current filter date */}
      {!searchQuery && (
        <View style={styles.dateIndicator}>
          <Text style={styles.dateText}>Showing tickets for: </Text>
          <DateTimePicker
            value={selectedDate || new Date()} // Use new Date() as fallback when selectedDate is null
            mode="date"
            display="compact"
            onChange={(event, date) => {
              if (date) {
                setSelectedDate(date) // Update selectedDate if a valid date is selected
              } else {
                setSelectedDate(null) // Clear selectedDate if needed
              }
            }}
            style={styles.datePicker}
          />
          <TouchableOpacity
            onPress={() => setSelectedDate(new Date())}
            style={styles.todayButton}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Tickets List */}
      <Animated.ScrollView
        contentContainerStyle={styles.scrollViewContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#0000ff"
            style={styles.loadingIndicator}
          />
        ) : filteredProjects.length > 0 ? (
          filteredProjects.map((project, index) => (
            <View
              key={project.id}
              style={[
                styles.ticketContainer,
                { backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#eaeaea' },
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
    marginRight: 5, // Add some space between text and date picker
  },
  datePicker: {
    width: 150,
    marginLeft: 5,
    marginRight: 5, // Add some space before the Today button
  },
  todayButton: {
    padding: 5,
    backgroundColor: '#3498db',
    borderRadius: 5,
  },
  todayButtonText: {
    color: 'white',
    fontSize: 12,
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
