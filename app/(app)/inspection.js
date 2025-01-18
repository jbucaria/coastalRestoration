import React, { useState, useEffect } from 'react'
import { Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { onSnapshot, collection } from 'firebase/firestore'

import InspectionForm from '@/components/InspectionForm'
import { firestore } from '@/firebaseConfig'

export default function App() {
  const params = useLocalSearchParams()
  const { projectId } = params

  const [customer, setCustomer] = useState('')
  const [address, setAddress] = useState('')
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [reason, setReason] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerNumber, setCustomerNumber] = useState('')
  const [inspectorName, setInspectorName] = useState('')
  const [hours, setHours] = useState('')
  const [inspectionResults, setInspectionResults] = useState('')
  const [recommendedActions, setRecommendedActions] = useState('')
  const [photos, setPhotos] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [project, setProject] = useState({})
  const [homeOwnerName, setHomeOwnerName] = useState('')
  const [homeOwnerNumber, setHomeOwnerNumber] = useState('')

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firestore, 'projects'),
      snapshot => {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date ? new Date(doc.data().date) : null, // Convert timestamp if necessary
        }))

        // Find the specific project by projectId
        const selectedProject = projectsData.find(p => p.id === projectId)

        if (selectedProject) {
          setProject(selectedProject) // Update project with selected data
        } else {
          Alert.alert('Error', 'Project not found.')
        }
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
  }, [projectId]) // Ensure this runs when projectId changes

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false)
    if (selectedDate) {
      setDate(selectedDate)
    }
  }

  return (
    <InspectionForm
      project={project}
      setProject={setProject}
      projectId={projectId}
    />
  )
}
