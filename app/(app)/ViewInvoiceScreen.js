import React, { useEffect, useState } from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useLocalSearchParams, router } from 'expo-router'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import * as AuthSession from 'expo-auth-session'
import { sendInvoiceToQuickBooks } from '@/utils/sendInvoice'
import useAuthStore from '@/store/useAuthStore'
import { se } from 'date-fns/locale'

// Define your QuickBooks app's redirect URI
const redirectUri = 'https://coastalrestorationservice.com/oauth/callback'

const discovery = {
  authorizationEndpoint: 'https://appcenter.intuit.com/connect/oauth2',
}

const ViewInvoiceScreen = () => {
  const { projectId } = useLocalSearchParams()
  const { clientId, accessToken } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date())
  const [lineItems, setLineItems] = useState([])
  const [isSending, setIsSending] = useState(false)

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: ['com.intuit.quickbooks.accounting'],
      redirectUri, // Use the HTTPS redirect URI for QuickBooks
      responseType: 'code',
      state: projectId, // Pass projectId as state
    },
    discovery
  )

  useEffect(() => {
    if (response?.type === 'success') {
      console.log('OAuth process completed successfully.')
    }
  }, [response])

  const handleSendInvoice = async () => {
    setIsSending(true)
    if (!accessToken) {
      Alert.alert('Error', 'Missing QuickBooks authentication token.')
      return
    }

    const invoiceData = {
      customerEmail: customerEmail,
      customerId: '3', // Replace with actual QuickBooks Customer ID
      customerName: customerName,
      invoiceDate: invoiceDate.toISOString().split('T')[0], // Format YYYY-MM-DD
      lineItems: lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        amount: item.amount,
      })),
    }
    console.log('invoiceData', invoiceData)
    const result = await sendInvoiceToQuickBooks(
      invoiceData,
      accessToken,
      clientId
    )

    if (result) {
      console.log('Invoice successfully sent:', result)
      setIsSending(false)
      router.back()
    }
  }
  // Fetch invoice data from Firestore
  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        const docRef = doc(firestore, 'tickets', projectId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setCustomerName(data.customerName || 'Unknown')
          setCustomerEmail(data.customerEmail || 'No Email Provided')
          setInvoiceDate(
            data.invoiceDate ? new Date(data.invoiceDate) : new Date()
          )

          // Format line items
          if (data.remediationData?.rooms) {
            const formattedLineItems = data.remediationData.rooms.flatMap(
              room =>
                room.measurements?.map(measurement => ({
                  description: measurement.description,
                  quantity: measurement.quantity || 0,
                  amount: measurement.amount || 0,
                })) || []
            )
            setLineItems(formattedLineItems)
          }
        } else {
          Alert.alert('Error', 'No invoice data found.')
        }
      } catch (error) {
        console.error('Error fetching invoice data:', error)
        Alert.alert('Error', 'Failed to load data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchInvoiceData()
  }, [projectId])

  // Handle amount update
  const handleUpdateAmount = (id, value) => {
    setLineItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, amount: Number(value) || 0 } : item
      )
    )
  }

  // Compute total cost
  const totalCost = lineItems.reduce(
    (total, item) => total + item.quantity * item.amount,
    0
  )

  // Save updates to Firestore
  const handleSaveChanges = async () => {
    try {
      const docRef = doc(firestore, 'tickets', projectId)
      await updateDoc(docRef, {
        remediationData: { rooms: [{ measurements: lineItems }] },
      })
      Alert.alert('Success', 'Invoice updated successfully!')
    } catch (error) {
      console.error('Error updating invoice:', error)
      Alert.alert('Error', 'Failed to update invoice.')
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Invoice</Text>

        {/* Customer Info */}
        <View style={styles.infoCard}>
          <Text style={styles.label}>Customer Name</Text>
          <Text style={styles.textValue}>{customerName}</Text>

          <Text style={styles.label}>Customer Email</Text>
          <Text style={styles.textValue}>{customerEmail}</Text>

          <Text style={styles.label}>Invoice Date</Text>
          <Text style={styles.textValue}>{invoiceDate.toDateString()}</Text>
        </View>

        {/* Line Items */}
        <Text style={styles.sectionTitle}>Services & Costs</Text>
        {lineItems.map(item => (
          <View key={item.id} style={styles.lineItem}>
            <Text style={styles.label}>Item Description</Text>
            <Text style={styles.textValue}>{item.description}</Text>

            <Text style={styles.label}>Quantity</Text>
            <Text style={styles.textValue}>{item.quantity}</Text>

            <Text style={styles.label}>Item Amount</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              // Convert numeric amount to string for display:
              value={String(item.amount)}
              onChangeText={text => handleUpdateAmount(item.id, text)}
            />
          </View>
        ))}

        {/* Total */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total: ${totalCost.toFixed(2)}</Text>
        </View>

        {/* Save & Send Buttons */}
        <TouchableOpacity onPress={handleSaveChanges} style={styles.saveButton}>
          <Text style={styles.buttonText}>Save Changes</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSendInvoice} style={styles.sendButton}>
          {isSending ? (
            <ActivityIndicator size="large" color="#27AE60" />
          ) : (
            <Text style={styles.buttonText}>Save Invoice To QB</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            promptAsync()
          }}
          style={styles.sendButton}
        >
          <Text style={styles.buttonText}>Get Auth Token</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

export default ViewInvoiceScreen

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
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#2C3E50',
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 10,
  },
  textValue: {
    fontSize: 16,
    color: '#34495E',
    backgroundColor: '#ECECEC',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 10,
  },
  lineItem: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  input: {
    backgroundColor: '#ECECEC',
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    color: '#2C3E50',
    marginTop: 4,
  },
  totalContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  totalText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: '#27AE60',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendButton: {
    marginTop: 10,
    backgroundColor: '#2980B9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
})
