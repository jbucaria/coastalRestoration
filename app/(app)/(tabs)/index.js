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
} from 'react-native'
import { collection, onSnapshot } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { TicketCard } from '@/components/TicketCard'
import { FilterModal } from '@/components/FilterModal'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { AnimatedIconLegend } from '@/components/IconLegend'

const TicketsScreen = () => {
  const [projects, setProjects] = useState([])
  const [filteredProjects, setFilteredProjects] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  // Filter state
  const [filters, setFilters] = useState({
    taskType: '',
    showWorkOrders: false,
    priority: '',
    status: '',
    sortField: 'inspectorName',
    sortDirection: 'asc',
  })

  // Modal visibility
  const [isFilterModalVisible, setFilterModalVisible] = useState(false)

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
      filtered = filtered.filter(project => {
        if (!project.address) return false
        return project.address.toLowerCase().includes(searchQuery.toLowerCase())
      })
    }

    // Apply task type filter
    if (filters.taskType) {
      filtered = filtered.filter(
        project => project.taskType === filters.taskType
      )
    }

    // Apply show work orders filter
    if (filters.showWorkOrders) {
      filtered = filtered.filter(project => project.showWorkOrders === true)
    }

    // Apply priority filter
    if (filters.priority) {
      filtered = filtered.filter(
        project => project.priority === filters.priority
      )
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(project => project.status === filters.status)
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
    setFilters(newFilters)
    closeFilterModal()
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
          filteredProjects.map(project => (
            <TicketCard
              key={project.id}
              project={project}
              onPress={() =>
                router.push({
                  pathname: '/TicketDetailsScreen',
                  params: { projectId: project.id },
                })
              }
            />
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
