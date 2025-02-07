import React, { useState, useEffect } from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  StyleSheet,
} from 'react-native'
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
  const [items, setItems] = useState([]) // New state for items
  const [loadingItems, setLoadingItems] = useState(false)

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
      Alert.alert('Error', 'Failed to fetch customers from Firestore.')
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

      // Check HTTP status first
      if (!response.ok) {
        const errorText = await response.text()
        console.error(
          `HTTP Error ${response.status} ${response.statusText}: ${errorText}`
        )
        throw new Error(
          `HTTP Error ${response.status} ${response.statusText}\n${errorText}`
        )
      }

      const data = await response.json()
      // Check if the expected data is returned
      if (!data.QueryResponse || !data.QueryResponse.Customer) {
        console.error('Unexpected response structure:', data)
        throw new Error(
          'Unexpected response structure: ' + JSON.stringify(data, null, 2)
        )
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
      Alert.alert(
        'Error',
        error.message || 'Failed to fetch customers from QuickBooks.'
      )
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

  // Filter customers based on the search query (by id, displayName, or email)
  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase()
    return (
      customer.id.toLowerCase().includes(query) ||
      (customer.displayName &&
        customer.displayName.toLowerCase().includes(query)) ||
      (customer.email && customer.email.toLowerCase().includes(query))
    )
  })

  // When a customer is selected, set the selectedCustomer state and update the search field
  const handleSelectCustomer = customer => {
    setSelectedCustomer(customer)
    setSearchQuery(customer.displayName)
  }

  // New function: Query QuickBooks for all Items (line items)
  const fetchItemsFromQB = async () => {
    if (!quickBooksCompanyId || !accessToken) {
      Alert.alert('Error', 'Missing QuickBooks credentials.')
      return
    }
    setLoadingItems(true)
    const query = encodeURIComponent('SELECT * FROM Item')
    const url = `https://quickbooks.api.intuit.com/v3/company/${quickBooksCompanyId}/query?query=${query}&minorversion=4`

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'text/plain',
    }

    try {
      const response = await fetch(url, { method: 'GET', headers })
      if (!response.ok) {
        const errorText = await response.text()
        console.error(
          `HTTP Error ${response.status} ${response.statusText}: ${errorText}`
        )
        throw new Error(
          `HTTP Error ${response.status} ${response.statusText}\n${errorText}`
        )
      }
      const data = await response.json()
      if (!data.QueryResponse || !data.QueryResponse.Item) {
        console.error('Unexpected response structure:', data)
        throw new Error(
          'Unexpected response structure: ' + JSON.stringify(data, null, 2)
        )
      }
      const itemsData = data.QueryResponse.Item.map(item => ({
        id: item.Id,
        name: item.Name,
        description: item.Description,
        unitPrice: item.UnitPrice,
      }))
      setItems(itemsData)
      Alert.alert('Success', 'Items retrieved successfully.')
    } catch (error) {
      console.error('Error fetching items from QB:', error)
      Alert.alert(
        'Error',
        error.message || 'Failed to retrieve items from QuickBooks.'
      )
    } finally {
      setLoadingItems(false)
    }
  }

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

        {/* Search Section */}
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search customer by name..."
            value={searchQuery}
            onChangeText={text => {
              setSearchQuery(text)
              // Clear the selected customer if user edits the search text
              if (selectedCustomer && text !== selectedCustomer.displayName) {
                setSelectedCustomer(null)
              }
            }}
          />
          {/* Suggestions Container */}
          {searchQuery.length > 0 &&
            filteredCustomers.length > 0 &&
            !selectedCustomer && (
              <View style={styles.suggestionsWrapper}>
                <ScrollView style={styles.suggestionsContainer}>
                  {filteredCustomers.map(customer => (
                    <TouchableOpacity
                      key={customer.id}
                      onPress={() => handleSelectCustomer(customer)}
                      style={styles.suggestionItem}
                    >
                      <Text style={styles.suggestionText}>
                        {customer.id} - {customer.displayName} ({customer.email}
                        )
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
        </View>

        {/* Display Selected Customer Info */}
        {selectedCustomer && (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Selected Customer</Text>
            <Text style={styles.detailText}>ID: {selectedCustomer.id}</Text>
            <Text style={styles.detailText}>
              Name: {selectedCustomer.displayName}
            </Text>
            <Text style={styles.detailText}>
              Email: {selectedCustomer.email}
            </Text>
          </View>
        )}

        {/* Token Management Section */}
        <Text style={styles.title}>Token Management</Text>
        <View style={styles.oauthContainer}>
          <TouchableOpacity
            onPress={() => promptAsync()}
            style={styles.oauthButton}
          >
            <Text style={styles.buttonText}>Get Auth Token</Text>
          </TouchableOpacity>
        </View>

        {/* Items Section */}
        <TouchableOpacity onPress={fetchItemsFromQB} style={styles.itemsButton}>
          <Text style={styles.buttonText}>
            {loadingItems ? 'Loading Items...' : 'Get Items ID'}
          </Text>
        </TouchableOpacity>
        {items.length > 0 && (
          <View style={styles.itemsContainer}>
            {items.map(item => (
              <Text key={item.id} style={styles.itemText}>
                ID: {item.id} - {item.name} - Price: {item.unitPrice}
              </Text>
            ))}
          </View>
        )}

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
    paddingBottom: 20,
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
  searchSection: {
    width: '90%',
    marginBottom: 20,
    position: 'relative',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: 'white',
  },
  suggestionsWrapper: {
    position: 'absolute',
    top: 50, // Adjust this value to position it right below the search input
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
    width: '100%',
    alignItems: 'center',
  },
  oauthButton: {
    width: '90%',
    marginTop: 10,
    backgroundColor: '#B9770E',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  itemsButton: {
    backgroundColor: '#2980b9',
    padding: 14,
    borderRadius: 8,
    marginVertical: 10,
    width: '90%',
    alignItems: 'center',
  },
  itemsContainer: {
    width: '90%',
    marginTop: 10,
  },
  itemText: {
    fontSize: 16,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
})
