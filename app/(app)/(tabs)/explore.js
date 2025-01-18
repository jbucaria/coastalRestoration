import React, { useState, useEffect } from 'react'
import { router } from 'expo-router'
import {
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  Image,
  Modal,
  View,
  TextInput,
  ScrollView,
  Text,
} from 'react-native'
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'

import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { useThemeColor } from '@/hooks/useThemeColor'
import { IconSymbol } from '@/components/ui/IconSymbol'

import ReportModal from '@/components/ReportModal'

const ReportsPage = () => {
  // State for reports and filtering
  const [reports, setReports] = useState([])
  const textColor = useThemeColor({}, 'text')
  const [modalVisible, setModalVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  // Filter options and state
  const filterOptions = ['All', 'Remediation', 'Equipment', 'Complete']
  const [activeFilter, setActiveFilter] = useState('All')
  const [filters, setFilters] = useState({
    remediationRequired: false,
    equipmentOnSite: false,
    siteComplete: false,
  })

  // Update filters when activeFilter changes.
  useEffect(() => {
    if (activeFilter === 'Remediation') {
      setFilters({
        remediationRequired: true,
        equipmentOnSite: false,
        siteComplete: false,
      })
    } else if (activeFilter === 'Equipment') {
      setFilters({
        remediationRequired: false,
        equipmentOnSite: true,
        siteComplete: false,
      })
    } else if (activeFilter === 'Complete') {
      setFilters({
        remediationRequired: false,
        equipmentOnSite: false,
        siteComplete: true,
      })
    } else {
      // "All": no extra filters
      setFilters({
        remediationRequired: false,
        equipmentOnSite: false,
        siteComplete: false,
      })
    }
  }, [activeFilter])

  // Listen for Firestore updates with filters.
  useEffect(() => {
    const projectsRef = collection(firestore, 'projects')
    let q = query(
      projectsRef,
      where('inspectionComplete', '==', true),
      orderBy('createdAt', 'desc')
    )

    Object.entries(filters).forEach(([field, value]) => {
      if (value) {
        q = query(q, where(field, '==', true))
      }
    })

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        setReports(projectsData)
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
  }, [filters])

  // Filter reports by search query.
  const filteredReports = reports.filter(report =>
    report.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleReportPress = report => {
    setSelectedReport(report)
    setModalVisible(true)
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleReportPress(item)}
      style={styles.reportContainer}
    >
      <ThemedView style={styles.cardShadow}>
        <ThemedView style={styles.card}>
          {item.photos && item.photos.length ? (
            <Image
              source={{ uri: item.photos[0].uri }}
              style={styles.reportImage}
              resizeMode="cover"
            />
          ) : (
            <IconSymbol name="house" size={100} color="green" />
          )}
          <ThemedView style={styles.reportInfo}>
            <ThemedText type="subtitle">{item.address}</ThemedText>
            <ThemedText style={styles.dateText}>{item.date}</ThemedText>
            <ThemedText style={styles.dateText}>{item.projectId}</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.container}>
        {/* Search Bar */}
        <TextInput
          style={styles.searchBar}
          onChangeText={setSearchQuery}
          value={searchQuery}
          placeholder="Search by address..."
          placeholderTextColor={textColor}
        />
        {/* FILTER BUTTONS */}
        <View style={{ height: 40, marginBottom: 20 }}>
          <ScrollView
            horizontal={true}
            contentContainerStyle={styles.filterButtonRow}
            style={{ marginBottom: 0 }}
          >
            {filterOptions.map(option => (
              <TouchableOpacity
                key={option}
                onPress={() => setActiveFilter(option)}
                style={[
                  styles.filterButton,
                  activeFilter === option && styles.activeFilterButton,
                ]}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    activeFilter === option && styles.activeFilterButtonText,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* List of Reports */}
        <View style={styles.listContainer}>
          <FlatList
            data={filteredReports}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListHeaderComponent={() => <View style={{ height: 0 }} />}
          />
        </View>

        <ReportModal
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
          selectedReport={selectedReport}
          isDeleting={isDeleting}
          setIsDeleting={setIsDeleting}
          setIsDownloading={setIsDownloading}
          setDownloadProgress={setDownloadProgress}
        />
      </ThemedView>
    </SafeAreaView>
  )
}

export default ReportsPage

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
  searchBar: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  filterButtonRow: {
    padding: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  filterButton: {
    height: 40, // Fixed height for all buttons
    paddingVertical: 10, // Adjust padding to fit within fixed height
    paddingHorizontal: 20,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
    justifyContent: 'center', // Center the text vertically
  },
  activeFilterButton: {
    backgroundColor: '#3498db', // Blue for active state, you can change this
    borderColor: '#3498db',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // More elevation for active state
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500', // A bit lighter weight for non-active text
    color: '#555',
  },
  activeFilterButtonText: {
    color: '#ffffff', // White text on active button for contrast
    fontWeight: '700', // Bold for emphasis when active
  },
  list: {
    paddingBottom: 20,
  },
  listContainer: {
    flex: 1, // Takes up all available space
    backgroundColor: '#f0f0f0', // Match or contrast with your theme
  },
  reportContainer: {
    marginBottom: 20,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
  },
  reportImage: {
    width: 100,
    height: 100,
  },
  reportInfo: {
    padding: 15,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  optionContainer: {
    padding: 20,
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  iconOption: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    marginTop: 8,
    color: '#2C3E50',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressModalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  downloadingText: {
    fontSize: 18,
    marginBottom: 10,
    color: '#2C3E50',
  },
  downloadingSubtext: {
    fontSize: 16,
    marginBottom: 20,
    color: '#2C3E50',
  },
  progressBarContainer: {
    width: '100%',
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2C3E50',
  },
})
