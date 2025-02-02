/* eslint-disable no-unused-vars */
/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
const { onRequest } = require('firebase-functions/v2/https')

// Helper function to dynamically import node-fetch as an ES module.
async function getFetch() {
  const { default: fetch } = await import('node-fetch')
  return fetch
}

// 🔹 QuickBooks Sandbox Credentials (Replace for Production)
const QUICKBOOKS_CLIENT_ID = 'ABtSFRJhZ5sNYErUyLl0Lwqrqb5QJfQ76b8jwUSDbKstvWRmA8'
const QUICKBOOKS_CLIENT_SECRET = 'v0sUaT5caf2HT5VOjyZykVWSuAjtOCrrKx2MvnI6'
const REDIRECT_URI = 'https://coastalrestorationservice.com/oauth/callback' // Must match QuickBooks settings

// 🔹 Other API Keys (for testing purposes)
const GOOGLE_API_KEY = 'AIzaSyCaaprXbVDmKz6W5rn3s6W4HhF4S1K2-zs'
const OPENAI_API_KEY = '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'
const FIRE_CONFIG_API_KEY = '1:867908177885:ios:6d44768272781a78577034'

// 🔹 QuickBooks OAuth URL
const QB_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2'
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

// 🚀 Step 1: Redirect User to QuickBooks for Authentication
exports.quickBooksAuth = onRequest(async (req, res) => {
  try {
    const state = Math.random().toString(36).substring(7)
    const authUrl = `${QB_AUTH_URL}
      ?client_id=${QUICKBOOKS_CLIENT_ID}
      &response_type=code
      &scope=com.intuit.quickbooks.accounting%20openid%20email%20profile
      &redirect_uri=${REDIRECT_URI}
      &state=${state}`

    console.log('🔹 Redirecting user to QuickBooks OAuth:', authUrl)
    res.redirect(authUrl)
  } catch (error) {
    console.error('❌ Error redirecting to QuickBooks:', error)
    res.status(500).send({ error: 'Failed to start QuickBooks authentication' })
  }
})

// 🚀 Step 2: Exchange Authorization Code for Access Token
exports.getQuickBooksToken = onRequest(async (req, res) => {
  try {
   // 🔹 Extract Authorization Code from Query Params
    const { code, state } = req.query
    if (!code) {
      console.error('❌ Missing authorization code')
      return res.status(400).send({ error: 'Missing authorization code' })
    }

    console.log('✅ Received Authorization Code:', code)
    console.log('🔹 Preparing request to exchange for access token...')

    // 🔹 Prepare Token Request Payload
    const params = new URLSearchParams()
    params.append('grant_type', 'authorization_code')
    params.append('code', code)
    params.append('redirect_uri', REDIRECT_URI)

    // 🔹 Exchange Code for Access Token
    const fetch = await getFetch()
    const response = await fetch(QB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`).toString('base64'),
      },
      body: params.toString(),
    })

    const tokenData = await response.json()

    if (!response.ok) {
      console.error('❌ QuickBooks Token Error:', tokenData)
      return res.status(response.status).send(tokenData)
    }

    console.log('✅ Successfully received QuickBooks Access Token:', tokenData)

    // 🔹 Send the token data back to client
    return res.status(200).send(tokenData)
  } catch (error) {
    console.error('❌ Error exchanging QuickBooks token:', error)
    return res.status(500).send({ error: 'Internal Server Error' })
  }
})

// 🚀 Step 3: Fetch QuickBooks Company Info (Optional)
exports.getQuickBooksCompanyInfo = onRequest(async (req, res) => {
  try {
    console.log('🔹 Received request to fetch company info:', req.query)

    const { accessToken, realmId } = req.query
    if (!accessToken || !realmId) {
      console.error('❌ Missing accessToken or realmId')
      return res.status(400).send({ error: 'Missing accessToken or realmId' })
    }

    console.log('✅ Fetching QuickBooks Company Info for Realm ID:', realmId)

    const fetch = await getFetch()
    const response = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    })

    const companyData = await response.json()

    if (!response.ok) {
      console.error('❌ QuickBooks Company Info Error:', companyData)
      return res.status(response.status).send(companyData)
    }

    console.log('✅ Successfully retrieved QuickBooks Company Info:', companyData)
    return res.status(200).send(companyData)
  } catch (error) {
    console.error('❌ Error fetching QuickBooks company info:', error)
    return res.status(500).send({ error: 'Internal Server Error' })
  }
})

// 🔹 API Endpoint for Testing Google, OpenAI, and Firebase API Keys
exports.getApiKey = onRequest(async (req, res) => {
  console.log('🔹 API Key Request Received')

  const keys = {
    google: GOOGLE_API_KEY,
    openai: OPENAI_API_KEY,
    firebase: FIRE_CONFIG_API_KEY,
  }

  console.log('✅ Returning API Keys:', keys)
  return res.status(200).send(keys)
})
