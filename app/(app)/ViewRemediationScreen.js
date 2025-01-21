import React, { useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native'
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'

const ViewRemediationScreen = () => {
  const { projectId } = useLocalSearchParams()
  const router = useRouter()

  // Local state to hold the fetched remediation data
  const [remediationData, setRemediationData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch data from Firestore once the component mounts
  useEffect(() => {
    const fetchRemediationData = async () => {
      try {
        const docRef = doc(firestore, 'tickets', projectId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          // Assuming that remediation data was stored under the key "remediationData"
          setRemediationData(docSnap.data().remediationData)
        } else {
          Alert.alert('Error', 'No remediation data found.')
        }
      } catch (error) {
        console.error('Error fetching remediation data:', error)
        Alert.alert('Error', 'Failed to load data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchRemediationData()
  }, [projectId])

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </SafeAreaView>
    )
  }

  if (!remediationData) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>No remediation data available.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Remediation Report</Text>

        {remediationData.rooms &&
          remediationData.rooms.map(room => (
            <View key={room.id} style={styles.roomContainer}>
              <View style={styles.roomHeader}>
                <Text style={styles.roomTitle}>{room.name}</Text>
              </View>

              {/* Measurements */}
              {room.measurements && room.measurements.length > 0 && (
                <View style={styles.measurementsContainer}>
                  {room.measurements.map(measurement => (
                    <View key={measurement.id} style={styles.measurementRow}>
                      <Text style={styles.measurementText}>
                        {measurement.description}: {measurement.quantity}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Photos */}
              {room.photos && room.photos.length > 0 && (
                <ScrollView horizontal style={styles.photoRow}>
                  {room.photos.map(uri => (
                    <View key={uri} style={styles.photoItem}>
                      <Image source={{ uri }} style={styles.photoImage} />
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          ))}

        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#2C3E50',
  },
  roomContainer: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    // Optional shadow settings
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  roomHeader: {
    marginBottom: 8,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
  measurementsContainer: {
    marginBottom: 8,
  },
  measurementRow: {
    marginVertical: 4,
  },
  measurementText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  photoRow: {
    marginTop: 10,
  },
  photoItem: {
    marginRight: 8,
  },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
    color: 'red',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#2C3E50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
})

export default ViewRemediationScreen
