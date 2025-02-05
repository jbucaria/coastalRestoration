import React, { useState, useEffect } from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Button,
  TextInput,
  StyleSheet,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { firestore } from '@/firebaseConfig'
import { collection, setDoc, doc, getDocs } from 'firebase/firestore'
import * as AuthSession from 'expo-auth-session'
import useAuthStore from '@/store/useAuthStore'

const redirectUri = 'https://coastalrestorationservice.com/oauth/callback'

const discovery = {
  authorizationEndpoint: 'https://appcenter.intuit.com/connect/oauth2',
}

const QuickBooksActionsScreen = () => {
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { quickBooksCompanyId, clientId, accessToken } = useAuthStore()

  useEffect(() => {
    fetchCustomersFromFirestore()
  }, [])

  const fetchCustomersFromFirestore = async () => {
    try {
      const querySnapshot = await getDocs(collection(firestore, 'customers'))
      const customersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      setCustomers(customersData)
    } catch (error) {
      console.error('Error fetching customers from Firestore:', error)
    }
  }

  const fetchCustomersFromQuickBooks = async () => {
    if (!quickBooksCompanyId || !accessToken) {
      Alert.alert('Error', 'QuickBooks credentials are missing.')
      return
    }

    setLoading(true)
    const url = `https://quickbooks.api.intuit.com/v3/company/${quickBooksCompanyId}/query?query=SELECT * FROM Customer`
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
      })
      const data = await response.json()

      if (!response.ok || !data.QueryResponse.Customer) {
        throw new Error('Failed to retrieve customers from QuickBooks.')
      }

      const customersData = data.QueryResponse.Customer.map(customer => ({
        id: customer.Id,
        displayName: customer.DisplayName,
        email: customer.PrimaryEmailAddr
          ? customer.PrimaryEmailAddr.Address
          : 'No email',
      }))

      await saveCustomersToFirestore(customersData)

      Alert.alert('Success', 'Customers synced successfully.')
      fetchCustomersFromFirestore()
    } catch (error) {
      console.error('Error fetching QuickBooks customers:', error)
      Alert.alert('Error', 'Failed to fetch customers from QuickBooks.')
    } finally {
      setLoading(false)
    }
  }

  const saveCustomersToFirestore = async customersData => {
    try {
      const batch = customersData.map(customer =>
        setDoc(doc(firestore, 'customers', customer.id), customer)
      )
      await Promise.all(batch)
    } catch (error) {
      console.error('Error saving customers to Firestore:', error)
      Alert.alert('Error', 'Failed to save customers to database.')
    }
  }

  // Filter customers based on the search query (search by id, displayName, or email)
  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase()
    return (
      customer.id.toLowerCase().includes(query) ||
      (customer.displayName &&
        customer.displayName.toLowerCase().includes(query)) ||
      (customer.email && customer.email.toLowerCase().includes(query))
    )
  })

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: ['com.intuit.quickbooks.accounting'],
      redirectUri,
      responseType: 'code',
      state: 'quickbooks_auth',
    },
    discovery
  )

  useEffect(() => {
    if (response?.type === 'success') {
      console.log('OAuth process completed successfully.')
    }
  }, [response])

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Customer Management</Text>

        <TouchableOpacity
          onPress={fetchCustomersFromQuickBooks}
          style={styles.syncButton}
        >
          <Text style={styles.syncButtonText}>
            {loading ? 'Syncing Customers...' : 'Sync Customers'}
          </Text>
        </TouchableOpacity>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCustomer}
            onValueChange={itemValue => {
              setSelectedCustomer(itemValue)
            }}
          >
            <Picker.Item label="Select a customer..." value={null} />
            {filteredCustomers.map(customer => (
              <Picker.Item
                key={customer.id}
                label={`${customer.id} - ${customer.displayName}`}
                value={customer.id}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.title}>Token Management</Text>
        <View style={styles.oauthContainer}>
          <TouchableOpacity
            onPress={() => promptAsync()}
            style={styles.oauthButton}
          >
            <Text style={styles.buttonText}>Get Auth Token</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator size="large" color="#27AE60" />}
      </ScrollView>
    </SafeAreaView>
  )
}

export default QuickBooksActionsScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  syncButton: {
    backgroundColor: '#27AE60',
    padding: 14,
    borderRadius: 8,
    marginBottom: 20,
    width: '90%',
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchInput: {
    width: '90%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
    fontSize: 16,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    width: '90%',
    marginBottom: 20,
  },
  detailCard: {
    backgroundColor: '#F3F5F7',
    padding: 16,
    borderRadius: 8,
    width: '90%',
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
  oauthContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  oauthButton: {
    width: '90%',
    marginTop: 10,
    backgroundColor: '#B9770E',
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
