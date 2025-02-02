// QuickBooksAuthScreen.js
import React, { useEffect } from 'react'
import { Button, View, Text } from 'react-native'
import * as AuthSession from 'expo-auth-session'

// Create a redirect URI. Ensure this matches what you've configured in your Intuit Developer app.
const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'myapp', // Make sure this scheme is defined in your app.json under "scheme"
})

// Your QuickBooks Client ID (safe to expose on the client side)
const clientId = 'ABtSFRJhZ5sNYErUyLl0Lwqrqb5QJfQ76b8jwUSDbKstvWRmA8'

// Define the OAuth endpoints.
const discovery = {
  authorizationEndpoint: 'https://appcenter.intuit.com/connect/oauth2',
  tokenEndpoint: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', // Not used directly in the client
}

export default function QuickBooksAuthScreen() {
  // Create an auth request using expo-auth-session.
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: ['com.intuit.quickbooks.accounting'], // Adjust scopes as needed
      redirectUri,
      responseType: 'code',
      // Optionally include a state value for security
      state: 'some_random_state',
    },
    discovery
  )

  // When a response is received, handle the authorization code.
  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params
      console.log('Authorization Code:', code)

      // Exchange the authorization code for an access token using your Cloud Function.
      fetch(
        'https://<YOUR_REGION>-<YOUR_PROJECT_ID>.cloudfunctions.net/getQuickBooksToken',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            authorizationCode: code,
            redirectUri, // Must match the one used during the auth request.
          }),
        }
      )
        .then(res => res.json())
        .then(tokenResponse => {
          console.log('Token Response:', tokenResponse)
          // Here you should save the access token (and refresh token if provided)
          // For example, using secure storage or context state.
        })
        .catch(err => {
          console.error('Token Exchange Error:', err)
        })
    }
  }, [response])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Connect your QuickBooks Account</Text>
      <Button
        disabled={!request}
        title="Connect to QuickBooks"
        onPress={() => {
          promptAsync()
        }}
      />
    </View>
  )
}
