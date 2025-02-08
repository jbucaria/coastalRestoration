import React, { useState, useEffect } from 'react'
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
import { router } from 'expo-router'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import * as AuthSession from 'expo-auth-session'
import { sendInvoiceToQuickBooks } from '@/utils/sendInvoice'
import useAuthStore from '@/store/useAuthStore'
import useProjectStore from '@/store/useProjectStore'

// Define your QuickBooks app's redirect URI
const redirectUri = 'https://coastalrestorationservice.com/oauth/callback'

const discovery = {
  authorizationEndpoint: 'https://appcenter.intuit.com/connect/oauth2',
}

const ViewInvoiceScreen = () => {
  const { projectId } = useProjectStore()
  const { clientId, accessToken } = useAuthStore()

  // Basic invoice states
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date())

  // The line items loaded from Firestore
  // (quantity, unitPrice, description, itemId, etc.)
  const [lineItems, setLineItems] = useState([])

  // **NEW**: Local overrides state { [itemId]: number }
  // If the user enters a custom amount, we store it here.
  const [overrides, setOverrides] = useState({})

  const [isSending, setIsSending] = useState(false)

  // OAuth for QuickBooks
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

  // -------------- Send Invoice to QuickBooks --------------
  const handleSendInvoice = async () => {
    setIsSending(true)
    if (!accessToken) {
      Alert.alert('Error', 'Missing QuickBooks authentication token.')
      setIsSending(false)
      return
    }

    // Build final line items with override or computed total
    const finalLineItems = lineItems.map(item => {
      const computed =
        (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
      const override = overrides[item.id]
      const finalAmount = override !== undefined ? override : computed

      return {
        description: item.description,
        quantity: item.quantity,
        // Use "finalAmount" to send to QB
        amount: finalAmount,
        itemId: item.itemId,
        unitPrice: item.unitPrice,
      }
    })

    const invoiceData = {
      customerEmail: customerEmail,
      customerId: '3', // Replace with actual QuickBooks Customer ID
      customerName: customerName,
      invoiceDate: invoiceDate.toISOString().split('T')[0], // Format YYYY-MM-DD
      lineItems: finalLineItems,
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

  // -------------- Fetch Invoice Data from Firestore --------------
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

          // Format line items: example from data.remediationData?.rooms
          // Flatten the measurements across all rooms
          if (data.remediationData?.rooms) {
            const flattenedItems = []
            data.remediationData.rooms.forEach(room => {
              room.measurements?.forEach(measurement => {
                // We assume "itemId", "quantity", "unitPrice", "description"
                // might be on the measurement.
                flattenedItems.push({
                  id: measurement.id || `${room.id}-${Math.random()}`,
                  description: measurement.description || 'No desc',
                  quantity: measurement.quantity || 0,
                  unitPrice: measurement.unitPrice || 0,
                  itemId: measurement.itemId || '',
                })
              })
            })
            setLineItems(flattenedItems)
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

  // -------------- Save to Firestore (Optional) --------------
  const handleSaveChanges = async () => {
    // If you want to save user-changed amounts to Firestore (though you said you do NOT want to),
    // you could do so here.
    // Right now, we'll just show a message or do minimal logic.
    Alert.alert('Note', 'Currently not saving total overrides to Firestore.')
  }

  // -------------- Compute Overall Total --------------
  const totalCost = lineItems.reduce((sum, item) => {
    const computed =
      (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
    const override = overrides[item.id]
    const finalAmount = override !== undefined ? override : computed
    return sum + finalAmount
  }, 0)

  // -------------- Handle user override changes --------------
  const handleOverrideChange = (lineItemId, newValue) => {
    setOverrides(prev => ({
      ...prev,
      [lineItemId]: parseFloat(newValue) || 0,
    }))
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </SafeAreaView>
    )
  }

  // -------------- Return UI --------------
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
        {lineItems.map(item => {
          const computedTotal =
            (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
          // If user overrode it, use that:
          const override = overrides[item.id]
          const finalAmount = override !== undefined ? override : computedTotal

          return (
            <View key={item.id} style={styles.lineItem}>
              <Text style={styles.label}>Item Description</Text>
              <Text style={styles.textValue}>{item.description}</Text>

              <Text style={styles.label}>Quantity</Text>
              <Text style={styles.textValue}>{String(item.quantity)}</Text>

              <Text style={styles.label}>Item Amount</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                // Display finalAmount (computed or override)
                value={String(finalAmount.toFixed(2))}
                onChangeText={text => handleOverrideChange(item.id, text)}
              />
            </View>
          )
        })}

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
          onPress={() => promptAsync()}
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
