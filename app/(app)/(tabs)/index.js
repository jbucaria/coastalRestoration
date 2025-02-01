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
import DateTimePicker from '@react-native-community/datetimepicker'
import { EquipmentModal } from '@/components/EquipmentModal'

const TicketsScreen = () => {
  const [projects, setProjects] = useState([])
  const [filteredProjects, setFilteredProjects] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [showEquipmentModal, setShowEquipmentModal] = useState(false)
  const [currentTicket, setCurrentTicket] = useState(null)
  const today = new Date()

  // Normalize both dates by removing the time part
  const isSameDay = (date1, date2) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  const openEquipmentModal = ticket => {
    setCurrentTicket(ticket)
    setShowEquipmentModal(true)
  }

  const closeEquipmentModal = () => {
    setShowEquipmentModal(false)
    setCurrentTicket(null) // Clear the current ticket when closing the modal
  }

  // Filter state
  const [filters, setFilters] = useState({
    sortField: 'siteComplete',
    sortDirection: 'asc',
    inspectorName: '',
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

    sortedProjects.sort((a, b) => {
      // Convert Firestore Timestamps to JavaScript Date objects for comparison
      const timeA = a.startTime ? a.startTime.toDate() : new Date(0)
      const timeB = b.startTime ? b.startTime.toDate() : new Date(0)

      // Compare timestamps
      return timeB - timeA // Sort in ascending order by time
    })

    setFilteredProjects(sortedProjects)
  }, [projects])

  // Handle opening and applying filters
  const openFilterModal = () => setFilterModalVisible(true)
  const closeFilterModal = () => setFilterModalVisible(false)

  const applyFilters = newFilters => {
    console.log('New filters applied:', newFilters)
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
          <Text style={styles.filterButtonText}>Sort</Text>
        </TouchableOpacity>
      </View>

      {/* Display current filter date */}
      {!searchQuery && (
        <View style={styles.dateIndicator}>
          <View style={styles.leftContainer}>
            <View style={styles.labelContainer}>
              <Text style={styles.dateText}>Showing tickets for: </Text>
            </View>

            <View style={[styles.datePickerContainer, { flex: 2 }]}>
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display="compact"
                onChange={(event, date) => {
                  if (date) {
                    setSelectedDate(date)
                  } else {
                    setSelectedDate(null)
                  }
                }}
                style={styles.datePicker}
              />
            </View>
          </View>

          <View style={styles.actionContainer}>
            <TouchableOpacity
              onPress={() => setSelectedDate(new Date())}
              style={styles.filterButton}
            >
              <Text style={styles.filterButtonText}>
                {isSameDay(selectedDate, today) ? 'Today' : 'Go To Today'}
              </Text>
            </TouchableOpacity>
          </View>
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
          filteredProjects.map((ticket, index) => (
            <View key={ticket.id} style={[styles.ticketContainer]}>
              <TicketCard
                ticket={ticket}
                onPress={() =>
                  router.push({
                    pathname: '/TicketDetailsScreen',
                    params: { projectId: ticket.id },
                  })
                }
                openEquipmentModal={() => openEquipmentModal(ticket)}
                // Pass the background color to TicketCard
                backgroundColor={index % 2 === 0 ? '#eaeaea' : '#fff'}
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
      {/* <Animated.View style={[styles.iconContainer, { opacity }]}>
        <AnimatedIconLegend />
      </Animated.View> */}

      {/* Filter Modal */}
      <FilterModal
        visible={isFilterModalVisible}
        onClose={closeFilterModal}
        onApplyFilters={applyFilters}
        initialFilters={filters}
      />
      <EquipmentModal
        visible={showEquipmentModal}
        onClose={closeEquipmentModal}
        projectId={currentTicket?.id}
        initialQuantities={currentTicket?.equipment}
        equipmentOnSite={currentTicket?.equipmentTotal > 0}
      />
    </SafeAreaView>
  )
}

export default TicketsScreen

const styles = StyleSheet.create({
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
  dateIndicator: {
    flexDirection: 'row',
    alignItems: 'center', // Align items to the top
    justifyContent: 'space-between',
    marginVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    height: 80, // Set a fixed height to fit all elements properly
  },
  leftContainer: {
    flex: 3,
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  labelContainer: {
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#2c3e50',
    marginRight: 10,
    fontWeight: '600',
  },
  datePickerContainer: {
    marginBottom: 8, // Add space below the DatePicker
  },
  datePicker: {
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  actionContainer: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    flexDirection: 'column', // Stack the button vertically
    justifyContent: 'space-between', // Ensure that "Go to Today" is at the bottom
  },
  todayButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  todayButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  ticketContainer: {
    padding: 2,
    height: 200,
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
    marginTop: 20,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 140,
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
  iconContainer: {
    position: 'absolute',
    bottom: 90,
    right: 24,
  },
})
