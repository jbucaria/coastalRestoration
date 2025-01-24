import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { format } from 'date-fns'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { MessageIndicator } from '@/components/MessageIndicator'
import { updateDoc, doc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'

const TicketCard = ({ project, onPress, openEquipmentModal }) => {
  // Background color logic
  let backgroundColor = ''
  if (project.siteComplete) {
    backgroundColor = '#8BC34A'
  } else {
    backgroundColor = '#f0faff'
  }
  // Navigation handlers
  const openChatRoom = () => {
    router.push({
      pathname: '/TicketNotesScreen',
      params: { projectId: project.id },
    })
  }

  const openReport = () => {
    router.push({ pathname: '/ViewReport', params: { projectId: project.id } })
  }

  // Convert Firestore Timestamps to JS Dates
  const startAt = project.startTime?.toDate?.()
  const endAt = project.endTime?.toDate?.()

  let startTime = 'N/A'
  let endTime = 'N/A'
  let dateDisplay = 'N/A'

  if (startAt) {
    startTime = format(startAt, 'h:mm a')
  }
  if (endAt) {
    endTime = format(endAt, 'h:mm a')
  }

  function handleLeaveSiteConfirmation(projectId) {
    Alert.alert(
      'Leaving the site?',
      'Are you sure you want to confirm leaving the site?',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('User canceled'),
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: () => {
            // Call the separate function to update the DB
            leaveSiteAndUpdateDB(projectId)
          },
        },
      ]
    )
  }

  async function leaveSiteAndUpdateDB(projectId) {
    try {
      const projectRef = doc(firestore, 'tickets', projectId)
      await updateDoc(projectRef, { id: projectId, onSite: false })

      console.log(
        `Updating database for project ${projectId} to onSite = false`
      )

      // If you need to handle success/failure, do so here.
    } catch (error) {
      console.error('Error updating the project in the database:', error)
    }
  }

  // Build icon array to determine if tab is needed
  const icons = []
  const isEmpty =
    !project.remediationData ||
    Object.keys(project.remediationData).length === 0

  if (project.inspectionComplete) {
    icons.push(
      <TouchableOpacity key="inspectionComplete" onPress={openReport}>
        <IconSymbol name="text.document" size={30} color="green" />
      </TouchableOpacity>
    )
  }
  if (project.remediationRequired) {
    icons.push(
      <TouchableOpacity
        key="remediationRequired"
        onPress={() => {
          router.push({
            pathname: '/RemediationScreen',
            params: { projectId: project.id },
          })
        }}
      >
        <IconSymbol name="hammer" size={30} color="green" />
      </TouchableOpacity>
    )
  }
  if (!isEmpty) {
    icons.push(
      <TouchableOpacity
        key="remediation"
        onPress={() => {
          router.push({
            pathname: '/ViewRemediationScreen',
            params: { projectId: project.id },
          })
        }}
      >
        <IconSymbol name="pencil.and.ruler" size={30} color="green" />
      </TouchableOpacity>
    )
  }

  if (project.onSite) {
    icons.push(
      <TouchableOpacity
        key="onSite"
        onPress={() => handleLeaveSiteConfirmation(project.id)}
      >
        <IconSymbol
          key="onSite"
          name="person.crop.square"
          size={30}
          color="green"
        />
      </TouchableOpacity>
    )
  }

  if (project.equipmentTotal > 0) {
    icons.push(
      <TouchableOpacity key="equipment" onPress={openEquipmentModal}>
        <MessageIndicator
          count={project.equipmentTotal}
          name="fan"
          size={33}
          color="black"
        />
      </TouchableOpacity>
    )
  }

  if (project.messageCount > 0) {
    icons.push(
      <TouchableOpacity key="messages" onPress={openEquipmentModal}>
        <MessageIndicator
          count={project.messageCount}
          name="bubble.left.and.exclamationmark.bubble.right"
          size={33}
          color="black"
        />
      </TouchableOpacity>
    )
  }

  const hasIcons = icons.length > 0

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.cardContainer, { backgroundColor }]}
    >
      {/* Header Row: Inspector + Time */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.inspectorName}>
            {project.inspectorName || 'N/A'}
          </Text>
          <Text style={styles.addressSubText}>{project.ticketNumber}</Text>
        </View>
        <Text style={styles.timeRange}>
          {startTime} - {endTime}
        </Text>
      </View>
      {/* Address */}
      <Text style={styles.addressText}>{project.street}</Text>
      <Text style={styles.addressSubText}>
        {project.city}, {project.state} {project.zip}
      </Text>

      {/* If icons exist, show the tab container */}
      {hasIcons && (
        <View style={styles.tabContainer}>{icons.map(icon => icon)}</View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 8,
    marginBottom: 20,
    borderRadius: 10,
    padding: 16,
    // Card shadow/elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    // Let the "tab" show beyond the card
    overflow: 'visible',
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Align items to start to accommodate multiline text on the left
  },
  inspectorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  addressSubText: {
    fontSize: 14,
    color: '#333',
  },
  timeRange: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  addressText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },

  // The "tab" for icons
  tabContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    // visually extends outside the card
    transform: [{ translateY: 15 }, { translateX: 15 }],
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // Subtle shadow to differentiate the tab from the card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    marginRight: 12,
  },
})

export { TicketCard }
