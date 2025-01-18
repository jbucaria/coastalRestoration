import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, firestore } from '@/firebaseConfig'
import useUserStore from '@/store/useUserStore' // If you want to grab current user info from your store

const ProjectChatRoom = ({ projectId }) => {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)

  // Get user info from Zustand store (or you can also use auth.currentUser)
  const { user } = useUserStore()

  useEffect(() => {
    // Create a query to listen for messages for the specific project, ordered by timestamp
    const q = query(
      collection(firestore, 'projectChats'),
      where('projectId', '==', projectId),
      orderBy('timestamp', 'asc')
    )
    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setMessages(chats)
        setLoading(false)
      },
      error => {
        console.error('Error fetching chat messages:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [projectId])

  const handleSend = async () => {
    if (newMessage.trim() === '') return

    try {
      await addDoc(collection(firestore, 'projectChats'), {
        projectId: projectId,
        userId: auth.currentUser.uid,
        userName: user
          ? user.displayName || user.email
          : auth.currentUser.email,
        message: newMessage,
        timestamp: serverTimestamp(),
      })
      setNewMessage('') // Clear the input
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const renderItem = ({ item }) => (
    <View style={styles.messageContainer}>
      <Text style={styles.userName}>{item.userName}</Text>
      <Text style={styles.messageText}>{item.message}</Text>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.chatList}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          value={newMessage}
          onChangeText={setNewMessage}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default ProjectChatRoom

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatList: {
    padding: 16,
    paddingBottom: 60, // Extra padding to prevent the input from overlapping messages
  },
  messageContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  userName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sendButton: {
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#2C3E50',
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
