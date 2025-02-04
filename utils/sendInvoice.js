import { Alert } from 'react-native'
import useAuthStore from '@/store/useAuthStore'

const sendInvoiceToQuickBooks = async (invoiceData, accessToken) => {
  const { quickBooksCompanyId } = useAuthStore.getState() // Retrieve stored company ID
  console.log(quickBooksCompanyId)
  if (!quickBooksCompanyId || !accessToken) {
    Alert.alert('Error', 'Missing QuickBooks credentials.')
    console.error('QuickBooks Error: Missing access token or company ID')
    return null
  }

  const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${quickBooksCompanyId}/invoice`

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  const requestBody = {
    AllowOnlinePayment: true, // ✅ Enable online payments
    AllowOnlineCreditCardPayment: true,
    AllowOnlineACHPayment: true,
    CustomerRef: {
      value: invoiceData.customerId,
      name: invoiceData.customerName,
    },
    Line: invoiceData.lineItems.map(item => ({
      DetailType: 'SalesItemLineDetail',
      Amount: item.quantity * item.amount,
      Description: item.description,
      SalesItemLineDetail: {
        ItemRef: {
          value: item.itemId || '2',
          name: item.description,
        },
        UnitPrice: item.amount,
        Qty: item.quantity,
      },
    })),
    TxnDate: invoiceData.invoiceDate,
    CurrencyRef: {
      value: 'USD',
    },
  }

  try {
    console.log(
      '🚀 Sending Invoice Data:',
      JSON.stringify(requestBody, null, 2)
    )

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text() // Capture full raw response
    let responseData

    try {
      responseData = JSON.parse(responseText) // Parse JSON if possible
    } catch (error) {
      console.error('🛑 Failed to parse JSON response:', responseText)
      Alert.alert('Error', 'Invalid JSON response from QuickBooks.')
      return null
    }

    console.log(
      '🔍 QuickBooks Response:',
      JSON.stringify(responseData, null, 2)
    )

    if (response.ok) {
      Alert.alert('Success', 'Invoice sent to QuickBooks!')
      console.log('✅ Invoice Created:', responseData)
      return responseData
    } else {
      const errorDetails = responseData.Fault?.Error || []
      let errorMessage = `QuickBooks API Error: ${response.status} ${response.statusText}`

      if (errorDetails.length > 0) {
        errorMessage += `\nDetails: ${
          errorDetails[0]?.Message || 'Unknown Error'
        }`
      }

      Alert.alert('Error', errorMessage)
      console.error('❌ QuickBooks Error Details:', errorDetails)
      return null
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to connect to QuickBooks API.')
    console.error('❌ Network or Unexpected Error:', error)
    return null
  }
}

export { sendInvoiceToQuickBooks }
