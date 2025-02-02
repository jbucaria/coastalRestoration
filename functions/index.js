const functions = require('firebase-functions')
const fetch = require('node-fetch')

exports.getApiKey = functions.https.onCall(async (data, context) => {
  // Validation or auth check could go here
  const keys = {
    google: process.env.GOOGLE_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    firebase: process.env.FIRE_CONFIG_API_KEY,
  }

  if (!keys.google || !keys.openai || !keys.firebase) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'API keys not found'
    )
  }

  return keys
})

exports.getQuickBooksToken = functions.https.onRequest(async (req, res) => {
  // Allow only POST requests.
  if (req.method !== 'POST') {
    return res.status(405).send({ error: 'Only POST requests are allowed.' })
  }

  const { authorizationCode, redirectUri } = req.body
  if (!authorizationCode || !redirectUri) {
    return res
      .status(400)
      .send({ error: 'Missing authorizationCode or redirectUri' })
  }

  // Retrieve credentials from environment configuration.
  const clientId = functions.config().quickbooks.client_id
  const clientSecret = functions.config().quickbooks.client_secret
  const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

  // Prepare the parameters for the token exchange.
  const params = new URLSearchParams()
  params.append('grant_type', 'authorization_code')
  params.append('code', authorizationCode)
  params.append('redirect_uri', redirectUri)

  try {
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: params.toString(),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('QuickBooks token error:', tokenData)
      return res.status(tokenResponse.status).send(tokenData)
    }

    return res.status(200).send(tokenData)
  } catch (error) {
    console.error('Error exchanging token:', error)
    return res.status(500).send({ error: 'Internal Server Error' })
  }
})
