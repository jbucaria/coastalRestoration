import { Alert } from 'react-native'

const sendInvoiceToQuickBooks = async (invoiceData, accessToken) => {
  const url =
    'https://sandbox-quickbooks.api.intuit.com/v3/company/YOUR_COMPANY_ID/invoice'

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  const requestBody = {
    CustomerRef: {
      value: invoiceData.customerId, // Use QuickBooks Customer ID
      name: invoiceData.customerName, // Customer Name
    },
    Line: invoiceData.lineItems.map(item => ({
      DetailType: 'SalesItemLineDetail',
      Amount: item.quantity * item.amount,
      Description: item.description,
      SalesItemLineDetail: {
        ItemRef: {
          value: item.itemId, // QB Item ID (required)
          name: item.description,
        },
        UnitPrice: item.amount,
        Qty: item.quantity,
      },
    })),
    TxnDate: invoiceData.invoiceDate, // Invoice Date
    CurrencyRef: {
      value: 'USD', // Change this if multicurrency is enabled
    },
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    })

    const responseData = await response.json()

    if (response.ok) {
      Alert.alert('Success', 'Invoice sent to QuickBooks!')
      console.log('Invoice Created:', responseData)
    } else {
      Alert.alert('Error', 'Failed to send invoice.')
      console.error('QuickBooks Error:', responseData)
    }
  } catch (error) {
    Alert.alert('Error', 'Network request failed.')
    console.error('Request Error:', error)
  }
}
