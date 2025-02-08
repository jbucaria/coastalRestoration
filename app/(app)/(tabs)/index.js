import React, { useState, useEffect, useRef } from 'react'
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
  Modal,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { router } from 'expo-router'
import { TicketCard } from '@/components/TicketCard'
import { IconSymbol } from '@/components/ui/IconSymbol'
import useProjectStore from '@/store/useProjectStore'

/**
 * SortModal
 *
 * The user can select one of:
 *  - "remediationRequired"
 *  - "equipmentOnSite"
 *  - null (clear all)
 *
 * We provide visual feedback by highlighting the selected option
 * and showing a checkmark next to it.
 */
const SortModal = ({ visible, onClose, sortOption, setSortOption }) => {
  // Helper function to render a sort button with selection feedback
  const renderOption = (optionValue, label) => {
    const isSelected = sortOption === optionValue
    return (
      <TouchableOpacity
        style={[styles.optionButton, isSelected && styles.selectedOption]}
        onPress={() => setSortOption(optionValue)}
      >
        <Text
          style={[styles.optionText, isSelected && styles.selectedOptionText]}
        >
          {label}
        </Text>
        {isSelected && (
          <IconSymbol
            name="checkmark"
            size={18}
            color="green"
            style={{ marginLeft: 8 }}
          />
        )}
      </TouchableOpacity>
    )
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Filter / Sort Criteria</Text>

          {/* Remediation Required */}
          {renderOption(
            'remediationRequired',
            'Show Only Remediation Required'
          )}

          {/* Equipment On Site */}
          {renderOption('equipmentOnSite', 'Show Only Equipment On Site')}

          {/* Clear Sort/Filter */}
          {renderOption(null, 'Show All (No Filter)')}

          {/* Done Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const TicketsScreen = () => {
  const { setProjectId } = useProjectStore()

  // 1) We fetch ALL tickets in ascending order by startTime
  const [allTickets, setAllTickets] = useState([])

  // 2) Displayed tickets after client-side filtering
  const [displayedTickets, setDisplayedTickets] = useState([])

  // Basic filtering states:
  // - Default selectedDate is "today"
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  // This represents the filter: only show "remediationRequired" tickets, or "equipmentOnSite," or null (all)
  const [sortOption, setSortOption] = useState(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSortModalVisible, setSortModalVisible] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Animated value for floating button
  const scrollY = useRef(new Animated.Value(0)).current
  const floatingOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  /**
   * Firestore subscription: fetch all tickets (sorted by startTime asc)
   */
  useEffect(() => {
    const baseQuery = query(
      collection(firestore, 'tickets'),
      orderBy('startTime', 'asc')
    )

    const unsubscribe = onSnapshot(
      baseQuery,
      snapshot => {
        const tickets = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        setAllTickets(tickets)
        setIsLoading(false)
      },
      error => {
        console.error('Error fetching tickets:', error)
        Alert.alert('Error', 'Could not fetch tickets. Please try again later.')
      }
    )

    return () => unsubscribe()
  }, [])

  /**
   * Client-side filter logic (useEffect)
   *
   * Steps:
   *  1) If there's a searchQuery, filter across *all* tickets by address (ignore date).
   *  2) Else, filter by selectedDate (start-of-day to end-of-day).
   *  3) If a sortOption is chosen, keep only those tickets that have that field = true.
   */
  useEffect(() => {
    // Start with a copy of allTickets
    let filtered = [...allTickets]

    // (1) Search filter
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase()
      filtered = filtered.filter(ticket => {
        const address = ticket.address?.toLowerCase() || ''
        return address.includes(queryLower)
      })
    } else {
      // (2) Date filter (only if there's no searchQuery)
      const startOfDay = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        0,
        0,
        0
      )
      const endOfDay = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        23,
        59,
        59,
        999
      )
      filtered = filtered.filter(ticket => {
        if (!ticket.startTime) return false
        const ticketDate = ticket.startTime.toDate
          ? ticket.startTime.toDate() // Firestore Timestamp -> Date
          : new Date(ticket.startTime)
        return ticketDate >= startOfDay && ticketDate <= endOfDay
      })
    }

    // (3) "Sort" / Filter by boolean field
    //     Instead of grouping, we only show tickets that have the field set to true.
    if (sortOption === 'remediationRequired') {
      filtered = filtered.filter(t => t.remediationRequired === true)
    } else if (sortOption === 'equipmentOnSite') {
      filtered = filtered.filter(t => t.equipmentOnSite === true)
    }

    setDisplayedTickets(filtered)
  }, [allTickets, searchQuery, selectedDate, sortOption])

  /**
   * DateTimePicker handler
   */
  const onDatePickerChange = (event, date) => {
    setShowDatePicker(false)
    if (date) {
      setSelectedDate(date)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <IconSymbol name="magnifyingglass" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by address (all tickets)"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={text => setSearchQuery(text)}
          />
        </View>
      </View>

      {/* Top row: chosen date & button to open the sort modal */}
      <View style={styles.topRowContainer}>
        {/* Date Display */}
        <TouchableOpacity
          style={styles.datePicker}
          onPress={() => setShowDatePicker(true)}
        >
          <IconSymbol name="calendar" size={20} color="#999" />
          <Text style={styles.dateText}>
            {searchQuery
              ? 'Date ignored (search active)'
              : selectedDate.toDateString()}
          </Text>
        </TouchableOpacity>

        {/* Actual Date Picker Modal if user presses date */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate || new Date()}
            mode="date"
            display="default"
            onChange={onDatePickerChange}
          />
        )}

        {/* Sort Modal Button */}
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortModalVisible(true)}
        >
          <IconSymbol name="slider.horizontal.3" size={24} color="#999" />
        </TouchableOpacity>
      </View>

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
          <Text>Loading tickets...</Text>
        ) : displayedTickets.length > 0 ? (
          displayedTickets.map((ticket, index) => (
            <View
              key={ticket.id}
              style={[
                styles.ticketContainer,
                { backgroundColor: index % 2 === 0 ? '#eaeaea' : '#fff' },
              ]}
            >
              <TicketCard
                ticket={ticket}
                onPress={() => {
                  setProjectId(ticket.id)
                  router.push('/TicketDetailsScreen')
                }}
              />
            </View>
          ))
        ) : (
          <Text style={styles.noTicketsText}>
            No tickets match your criteria.
          </Text>
        )}
      </Animated.ScrollView>

      {/* Floating Button to create a new ticket */}
      <Animated.View
        style={[styles.floatingButtonContainer, { opacity: floatingOpacity }]}
      >
        <TouchableOpacity
          onPress={() => router.push('/CreateTicketScreen')}
          style={styles.floatingButton}
        >
          <IconSymbol name="plus" size={30} color="white" />
        </TouchableOpacity>
      </Animated.View>

      {/* Sort Modal */}
      <SortModal
        visible={isSortModalVisible}
        onClose={() => setSortModalVisible(false)}
        sortOption={sortOption}
        setSortOption={setSortOption}
      />
    </SafeAreaView>
  )
}

export default TicketsScreen

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBarContainer: {
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
    width: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: '#F2F3F5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  topRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  datePicker: {
    flexDirection: 'row',
    backgroundColor: '#F2F3F5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  dateText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  sortButton: {
    backgroundColor: '#F2F3F5',
    borderRadius: 25,
    padding: 8,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  ticketContainer: {
    height: 200,
    padding: 2,
    marginBottom: 8,
  },
  noTicketsText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  floatingButtonContainer: {
    position: 'absolute',
    right: 24,
    bottom: 110,
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F39C12',
    borderRadius: 30,
    padding: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    width: '80%',
    borderRadius: 10,
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  optionText: { fontSize: 16 },
  selectedOption: {
    backgroundColor: '#E6F4EA', // light green tint
    borderRadius: 5,
  },
  selectedOptionText: {
    fontWeight: '600',
    color: '#2B7E2C', // darker green
  },
  closeButton: {
    backgroundColor: '#F39C12',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
})
