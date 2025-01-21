import React, { useState, useEffect, useCallback } from 'react'
import { router, Link } from 'expo-router'
import {
  View,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore'
import { getStorage, ref, deleteObject } from 'firebase/storage'
import { firestore } from '@/firebaseConfig'
import { TicketCard } from '@/components/TicketCard'

import { ProjectDetailsModal } from '@/components/ProjectDetailsModal'
import { PhotoModal } from '@/components/PhotoModal'
import { IconSymbol } from '@/components/ui/IconSymbol'

const Index = () => {
  const [modalVisible, setModalVisible] = useState(false)
  const [modalOptionsVisible, setModalOptionsVisible] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [projects, setProjects] = useState([])
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filteredProjects, setFilteredProjects] = useState([])
  const storage = getStorage()

  // Helper function to convert a Firebase download URL into a Storage path.
  const getFirebasePathFromUrl = downloadURL => {
    try {
      const pathSegment = downloadURL.split('/o/')[1]
      const noQuery = pathSegment.split('?')[0]
      return decodeURIComponent(noQuery)
    } catch (error) {
      console.error('Error parsing Storage path from URL:', downloadURL, error)
      return null
    }
  }

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firestore, 'tickets'),
      snapshot => {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Assuming 'date' is stored as a Firebase Timestamp
          date: doc.data().date ? new Date(doc.data().date) : null,
        }))
        setProjects(projectsData)
        filterProjectsByDate(projectsData)
      },
      error => {
        console.error('Error fetching tickets:', error)
        Alert.alert('Error', 'Could not fetch tickets. Please try again later.')
      }
    )

    return () => unsubscribe()
  }, [])

  const filterProjectsByDate = projectsList => {
    if (!selectedDate) return setFilteredProjects(projectsList)

    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const filtered = projectsList.filter(project => {
      if (!project.startDate) return false
      const projectDate = project.startDate.toDate()
      return projectDate >= startOfDay && projectDate <= endOfDay
    })

    setFilteredProjects(filtered)
  }

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (date) {
      setSelectedDate(date)
      filterProjectsByDate(projects)
    }
  }

  const handleProjectPress = project => {
    router.push({
      pathname: '/TicketDetailsScreen',
      params: { projectId: project.id },
    })
  }

  const updateProject = useCallback(async (projectId, field, value) => {
    try {
      await updateDoc(doc(firestore, 'projects', projectId), { [field]: value })
      console.log('Project updated successfully')
    } catch (error) {
      console.error('Error updating project:', error)
      Alert.alert('Error', 'Failed to update the project. Please try again.')
    }
  }, [])

  const handleDeleteProject = async () => {
    if (!selectedProject) return

    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this project and all its photos?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            try {
              if (selectedProject.photos && selectedProject.photos.length > 0) {
                const deletePromises = selectedProject.photos.map(
                  async photoURL => {
                    try {
                      const path = getFirebasePathFromUrl(photoURL)
                      if (path) {
                        const fileRef = ref(storage, path)
                        await deleteObject(fileRef)
                        console.log('Photo deleted:', photoURL)
                      }
                    } catch (err) {
                      console.error('Error deleting photo from Storage:', err)
                    }
                  }
                )
                await Promise.all(deletePromises)
              }
              await deleteDoc(doc(firestore, 'projects', selectedProject.id))
              Alert.alert(
                'Success',
                'Project and its photos have been deleted.'
              )
              setModalOptionsVisible(false)
              setSelectedProject(null)
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to delete the project: ' + error.message
              )
              console.error('Deletion error:', error)
            }
          },
        },
      ],
      { cancelable: false }
    )
  }

  return (
    <ImageBackground
      source={require('../../../assets/images/logo.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.datePickerContainer}>
          <Text style={styles.dateLabel}>Select Date</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
          >
            <Text style={styles.dateButtonText}>
              {selectedDate ? selectedDate.toDateString() : 'Select Date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          {filteredProjects.map(project => (
            <TicketCard
              key={project.id}
              project={project}
              onPress={() => handleProjectPress(project)}
            />
          ))}
        </ScrollView>

        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity
            onPress={() => router.push('/createTicketScreen')}
            style={styles.floatingButton}
          >
            <IconSymbol name="plus" size={30} color="white" />
          </TouchableOpacity>
        </View>

        <ProjectDetailsModal
          visible={modalOptionsVisible}
          project={selectedProject}
          onClose={() => setModalOptionsVisible(false)}
          onUpdateProject={updateProject}
          onDeleteProject={handleDeleteProject}
          setSelectedPhoto={setSelectedPhoto}
          setModalOptionsVisible={setModalOptionsVisible}
          setSelectedProject={setSelectedProject}
          setProject={setSelectedProject}
        />

        <PhotoModal
          visible={selectedPhoto !== null}
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          setModalOptionsVisible={setModalOptionsVisible}
        />
      </SafeAreaView>
    </ImageBackground>
  )
}

export default Index

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Slight overlay for readability
  },
  header: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  datePickerContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateLabel: {
    fontSize: 16,
    marginBottom: 4,
    color: '#555',
  },
  dateButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dateButtonText: {
    color: 'white',
    fontSize: 16,
  },
  scrollViewContent: {
    paddingBottom: 100, // Ensure content doesn't hide behind floating button
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 90,
    right: 24,
  },
  floatingButton: {
    backgroundColor: '#F39C12',
    borderRadius: 30,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
})
