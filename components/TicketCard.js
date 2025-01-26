import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { format } from 'date-fns'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { MessageIndicator } from '@/components/MessageIndicator'
import { updateDoc, doc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'

const TicketCard = ({
  project,
  onPress,
  openEquipmentModal,
  backgroundColor,
}) => {
  // Convert Firestore Timestamps to JS Dates
  const startAt = project.startTime?.toDate?.()
  const endAt = project.endTime?.toDate?.()

  let startTime = 'N/A'
  let endTime = 'N/A'

  if (startAt) {
    startTime = format(startAt, 'h:mm a')
  }
  if (endAt) {
    endTime = format(endAt, 'h:mm a')
  }

  // Icons to display based on project status
  const icons = []
  const isEmpty =
    !project.remediationData ||
    Object.keys(project.remediationData).length === 0

  if (project.inspectionComplete) {
    icons.push(
      <TouchableOpacity
        key="inspectionComplete"
        onPress={() =>
          router.push({
            pathname: '/ViewReport',
            params: { projectId: project.id },
          })
        }
      >
        <IconSymbol name="text.document" size={40} color="green" />
      </TouchableOpacity>
    )
  }
  if (project.remediationRequired) {
    icons.push(
      <TouchableOpacity
        key="remediationRequired"
        onPress={() =>
          router.push({
            pathname: '/RemediationScreen',
            params: { projectId: project.id },
          })
        }
      >
        <IconSymbol name="hammer.circle.fill" size={40} color="green" />
      </TouchableOpacity>
    )
  }
  if (!isEmpty) {
    icons.push(
      <TouchableOpacity
        key="remediation"
        onPress={() =>
          router.push({
            pathname: '/ViewRemediationScreen',
            params: { projectId: project.id },
          })
        }
      >
        <IconSymbol name="pencil.and.ruler.fill" size={40} color="green" />
      </TouchableOpacity>
    )
  }

  if (project.equipmentTotal > 0) {
    icons.push(
      <TouchableOpacity key="equipment" onPress={openEquipmentModal}>
        <MessageIndicator
          count={project.equipmentTotal}
          name="fan.fill"
          size={40}
          color="green"
        />
      </TouchableOpacity>
    )
  }

  if (project.messageCount > 0) {
    icons.push(
      <TouchableOpacity key="messages" onPress={openEquipmentModal}>
        <MessageIndicator
          count={project.messageCount}
          name="bubble.left.and.text.bubble.right.fill"
          size={40}
          color="green"
        />
      </TouchableOpacity>
    )
  }

  const hasIcons = icons.length > 0

  // Navigation handlers
  const handleArrivingOnSite = (projectId, currentOnSiteStatus) => {
    let alertMessage = currentOnSiteStatus
      ? 'Do you want to mark the site complete?'
      : 'Do you want to start the clock?'
    let alertAction = currentOnSiteStatus ? 'Stop' : 'Start'

    Alert.alert(`${alertAction} Work`, alertMessage, [
      {
        text: 'Cancel',
        onPress: () => console.log('User canceled'),
        style: 'cancel',
      },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            const projectRef = doc(firestore, 'tickets', projectId)
            await updateDoc(projectRef, { onSite: !currentOnSiteStatus })
            if (currentOnSiteStatus) {
              router.push('/(tabs)')
            }
          } catch (error) {
            console.error('Error updating the project in the database:', error)
          }
        },
      },
    ])
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.cardContainer,
        { backgroundColor: backgroundColor || '#FFFFFF' }, // Default to white if no background color is provided
      ]}
    >
      {/* Header Row: Inspector + Time + Job Type */}
      <View style={styles.headerRow}>
        <View style={styles.inspectorInfo}>
          <TouchableOpacity
            onPress={() => handleArrivingOnSite(project.id, project.onSite)}
          >
            <Text style={styles.inspectorName}>
              {project.inspectorName || 'N/A'}
              {project.onSite && (
                <IconSymbol
                  style={styles.onSiteIcon}
                  name="person.crop.square"
                  size={15}
                  color="green"
                />
              )}
            </Text>
          </TouchableOpacity>
          <Text style={styles.ticketNumber}>{project.ticketNumber}</Text>
        </View>
        <View style={styles.timeInfo}>
          <View style={styles.timeRangeContainer}>
            <Text style={styles.timeRange}>
              {startTime} - {endTime}
            </Text>
          </View>
          <Text style={styles.jobType}>{project.typeOfJob || 'N/A'}</Text>
        </View>
      </View>

      {/* Address Section */}
      <View style={styles.addressSection}>
        <Text style={styles.addressText}>{project.street}</Text>
        <Text style={styles.addressSubText}>
          {project.city}, {project.state} {project.zip}
        </Text>
      </View>

      {/* Icons Section */}
      {hasIcons && (
        <View style={styles.iconsContainer}>
          {icons.map((icon, index) => (
            <View key={index} style={styles.iconWrapper}>
              {icon}
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    height: 200,
    marginHorizontal: 0,
    marginBottom: 15,
    padding: 5,
    // paddingTop: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  inspectorInfo: {
    flex: 1,
  },
  inspectorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  onSiteIcon: {
    marginLeft: 5,
    position: 'relative',
    top: -2, // Fine-tune icon positioning
  },
  ticketNumber: {
    fontSize: 14,
    color: '#757575',
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  timeRangeContainer: {
    backgroundColor: 'rgba(13, 71, 161, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timeRange: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: -0.5,
  },
  jobType: {
    fontSize: 14,
    color: 'rgba(13, 71, 161, 1)',
    fontWeight: 'semibold',
    marginTop: 4,
  },
  addressSection: {
    marginBottom: 16,
  },
  addressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  addressSubText: {
    fontSize: 14,
    color: '#212121',
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  iconWrapper: {
    padding: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
})

export { TicketCard }
