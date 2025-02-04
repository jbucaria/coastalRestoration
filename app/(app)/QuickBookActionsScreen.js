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
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { firestore } from '@/firebaseConfig'
import { collection, setDoc, doc, getDoc, getDocs } from 'firebase/firestore'
import * as AuthSession from 'expo-auth-session'
import useAuthStore from '@/store/useAuthStore'

const redirectUri = 'https://coastalrestorationservice.com/oauth/callback'

const projectId = 'lskdflf'
const discovery = {
  authorizationEndpoint: 'https://appcenter.intuit.com/connect/oauth2',
}

const QuickBooksActionsScreen = () => {
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [loading, setLoading] = useState(false)

  const { quickBooksCompanyId, quickBooksClientId, accessToken } =
    useAuthStore()

  // 🔍 Fetch customers from Firestore (Local DB)
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

  // 🔥 Fetch customers from QuickBooks API
  const fetchCustomersFromQuickBooks = async () => {
    if (!quickBooksCompanyId || !accessToken) {
      Alert.alert('Error', 'QuickBooks credentials are missing!')
      return
    }

    setLoading(true)
    const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${quickBooksCompanyId}/query?query=SELECT * FROM Customer`
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

      console.log('📦 QuickBooks Customer Data:', JSON.stringify(data, null, 2))

      if (!response.ok || !data.QueryResponse.Customer) {
        throw new Error('Failed to retrieve customers from QuickBooks')
      }

      const customersData = data.QueryResponse.Customer.map(customer => ({
        id: customer.Id,
        displayName: customer.DisplayName,
        email: customer.PrimaryEmailAddr
          ? customer.PrimaryEmailAddr.Address
          : 'No email',
      }))

      // ✅ Save customers to Firestore
      await saveCustomersToFirestore(customersData)

      Alert.alert('Success', 'Customers synced successfully!')
      fetchCustomersFromFirestore() // Refresh picker data
    } catch (error) {
      console.error('🚨 Error fetching QuickBooks customers:', error)
      Alert.alert('Error', 'Failed to fetch customers from QuickBooks.')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Save Customers to Firestore
  const saveCustomersToFirestore = async customersData => {
    try {
      const batch = customersData.map(customer =>
        setDoc(doc(firestore, 'customers', customer.id), customer)
      )
      await Promise.all(batch)
      console.log('✅ Customers saved to Firestore')
    } catch (error) {
      console.error('🚨 Error saving customers to Firestore:', error)
      Alert.alert('Error', 'Failed to save customers to database.')
    }
  }

  //   AuthToken Flow Start

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      quickBooksClientId,
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
      // The Cloud Function will handle the rest (token exchange and redirect to app)
    }
  }, [response])

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 20 }}>
          Customer Management
        </Text>

        {/* 🔄 Sync Customers Button */}
        <TouchableOpacity
          onPress={fetchCustomersFromQuickBooks}
          style={{
            backgroundColor: '#27AE60',
            padding: 14,
            borderRadius: 8,
            marginBottom: 20,
            width: '90%',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>
            {loading ? 'Syncing Customers...' : 'Sync Customers'}
          </Text>
        </TouchableOpacity>

        {/* 🔽 Customer Picker Dropdown */}
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Select a Customer
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderRadius: 8,
            width: '90%',
            marginBottom: 20,
          }}
        >
          <Picker
            selectedValue={selectedCustomer}
            onValueChange={itemValue => {
              setSelectedCustomer(itemValue)
            }}
          >
            <Picker.Item label="Select a customer..." value={null} />
            {customers.map(customer => (
              <Picker.Item
                key={customer.id}
                label={customer.displayName}
                value={customer.id}
              />
            ))}
          </Picker>
        </View>

        {/* Display Customer Info */}
        {selectedCustomer && (
          <View
            style={{
              backgroundColor: '#F3F5F7',
              padding: 16,
              borderRadius: 8,
              width: '90%',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
              Customer Details
            </Text>
            <Text>
              Name:{' '}
              {customers.find(c => c.id === selectedCustomer)?.displayName}
            </Text>
            <Text>
              Email: {customers.find(c => c.id === selectedCustomer)?.email}
            </Text>
          </View>
        )}

        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 20 }}>
          Token Management
        </Text>

        {/* 🔄 Sync Customers Button */}
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Button
            disabled={!request}
            title="Connect to QuickBooks"
            onPress={() => promptAsync()}
          />
        </View>

        {/* ⏳ Loading Indicator */}
        {loading && <ActivityIndicator size="large" color="#27AE60" />}
      </ScrollView>
    </SafeAreaView>
  )
}

export default QuickBooksActionsScreen
