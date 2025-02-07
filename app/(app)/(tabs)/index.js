import React, { useState, useRef, useEffect } from 'react'
import {
  Animated,
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  StyleSheet,
} from 'react-native'
import {
  collection,
  setDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import * as AuthSession from 'expo-auth-session'
import { router } from 'expo-router'
import useAuthStore from '@/store/useAuthStore'
import { TicketCard } from '@/components/TicketCard'
import { FilterModal } from '@/components/FilterModal'
import { IconSymbol } from '@/components/ui/IconSymbol'
import DateTimePicker from '@react-native-community/datetimepicker'
import { EquipmentModal } from '@/components/EquipmentModal'
import useProjectStore from '@/store/useProjectStore'

const TicketsScreen = () => {
  const { setProjectId } = useProjectStore()
  const [projects, setProjects] = useState([])
  const [filteredProjects, setFilteredProjects] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [isFilterModalVisible, setFilterModalVisible] = useState(false)
  const [showEquipmentModal, setShowEquipmentModal] = useState(false)
  const [currentTicket, setCurrentTicket] = useState(null)
  const today = new Date()

  // Animated value for scroll
  const scrollY = useRef(new Animated.Value(0)).current

  // Interpolate opacity for the floating button (and potentially tab bar)
  const floatingOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  // Example: check if two dates are on the same day
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
    setCurrentTicket(null)
  }

  // Filter state
  const [filters, setFilters] = useState({
    sortField: 'siteComplete',
    sortDirection: 'asc',
    inspectorName: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let baseQuery = collection(firestore, 'tickets')
    let constructedQuery = baseQuery

    if (searchQuery) {
      constructedQuery = query(
        constructedQuery,
        where('address', '>=', searchQuery),
        where('address', '<=', searchQuery + '\uf8ff')
      )
    } else if (selectedDate) {
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

  useEffect(() => {
    let sortedProjects = [...projects]
    sortedProjects.sort((a, b) => {
      const timeA = a.startTime ? a.startTime.toDate() : new Date(0)
      const timeB = b.startTime ? b.startTime.toDate() : new Date(0)
      return timeB - timeA
    })
    setFilteredProjects(sortedProjects)
  }, [projects])

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
      setSearchQuery('')
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with Search and Filter */}
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by address..."
          value={searchQuery}
          onChangeText={text => {
            setSearchQuery(text)
            setSelectedDate(null)
          }}
        />
        <TouchableOpacity onPress={openFilterModal} style={styles.filterButton}>
          <Text style={styles.filterButtonText}>Sort</Text>
        </TouchableOpacity>
      </View>

      {/* Date Indicator */}
      {!searchQuery && (
        <View style={styles.dateIndicator}>
          <View style={styles.leftContainer}>
            <Text style={styles.dateText}>Showing tickets for:</Text>
            <View style={styles.datePickerContainer}>
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
          <TouchableOpacity
            onPress={() => setSelectedDate(new Date())}
            style={styles.todayButton}
          >
            <Text style={styles.todayButtonText}>
              {isSameDay(selectedDate, today) ? 'Today' : 'Go To Today'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Animated ScrollView for Tickets */}
      <Animated.ScrollView
        contentContainerStyle={styles.scrollViewContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {filteredProjects.map((ticket, index) => (
          <View key={ticket.id} style={styles.ticketContainer}>
            <TicketCard
              ticket={ticket}
              onPress={() => {
                setProjectId(ticket.id)
                router.push('/TicketDetailsScreen')
              }}
              openEquipmentModal={() => openEquipmentModal(ticket)}
              backgroundColor={index % 2 === 0 ? '#eaeaea' : '#fff'}
            />
          </View>
        ))}
      </Animated.ScrollView>

      {/* Floating Button */}
      <Animated.View
        style={[styles.floatingButtonContainer, { opacity: floatingOpacity }]}
      >
        <TouchableOpacity
          onPress={() => router.push('/CreateTicketScreen')}
          style={styles.floatingButton}
        >
          <IconSymbol name="plus" size={30} color="white" />
          <Text style={styles.floatingButtonText}>Create Ticket</Text>
        </TouchableOpacity>
      </Animated.View>

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

      {/* NOTE: The Tab Bar is defined in your TabLayout.
          To hide or blur the tab bar on scroll, you'll need to create a custom tab bar component that listens to the scrollY value or shared context.
          One approach is to wrap your tab bar in an Animated.View and adjust its opacity or add a blur effect as scrollY changes. */}
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
    alignItems: 'center',
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
    height: 80,
  },
  leftContainer: {
    flex: 3,
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  dateText: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 8,
    fontWeight: '600',
  },
  datePickerContainer: {
    marginBottom: 8,
  },
  datePicker: {
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  todayButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
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
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 140,
    right: 24,
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  // Customers / Items management styles (if applicable)
  suggestionsWrapper: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  suggestionsContainer: {
    maxHeight: 150,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  detailCard: {
    backgroundColor: '#F3F5F7',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 4,
  },
})
