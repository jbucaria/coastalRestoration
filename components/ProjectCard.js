import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { IconSymbol } from '@/components/ui/IconSymbol'
import MessageIndicator from '@/components/MessageIndicator'

const ProjectCard = ({ project, onPress }) => {
  // Determine background color based on project status
  let backgroundColor = 'rgba(200, 200, 200, .9)' // Default translucent gray

  if (project.siteComplete) {
    backgroundColor = '#8BC34A' // A finished type of green
  } else if (project.remediationRequired) {
    backgroundColor = '#FFD700' // Yellow for remediation required
  } else if (project.equipmentOnSite) {
    backgroundColor = '#007BFF' // Blue for equipment on site
  }

  const openChatRoom = () => {
    router.push({
      pathname: '/ProjectChatRoom',
      params: { projectId: project.id },
    })
  }

  const openReport = () => {
    router.push({
      pathname: '/viewReport',
      params: { projectId: project.id },
    })
  }

  // Format date and time
  const parseDateTime = dateString => {
    try {
      const dateTime = new Date(dateString)
      const date = dateTime.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      const time = dateTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      return { date, time }
    } catch (error) {
      console.error('Error parsing date:', error)
      return { date: 'Invalid Date', time: 'Invalid Time' }
    }
  }

  // Parse date and time from startDate
  const { date: startDate, time: startTime } = project.startDate
    ? parseDateTime(project.startDate)
    : { date: 'No Date', time: 'No Time' }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.projectCard, { backgroundColor: backgroundColor }]}
    >
      <View style={styles.cardContent}>
        <Text style={styles.projectAddress}>{project.street}</Text>
        <Text style={styles.projectAddress}>
          {project.city}, {project.state} {project.zip}
        </Text>
        <View style={styles.inspectorRow}>
          <Text style={styles.inspectorName}>
            {project.inspectorName || 'N/A'}
          </Text>
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{startDate}</Text>
          <Text style={styles.timeText}>Start: {startTime}</Text>
        </View>
      </View>
      <View style={styles.iconContainer}>
        {project.inspectionComplete && (
          <TouchableOpacity onPress={openReport}>
            <IconSymbol name="text.document" size={30} color="green" />
          </TouchableOpacity>
        )}
        {project.onSite && (
          <IconSymbol name="person.crop.square" size={30} color="green" />
        )}
        {project.equipmentTotal > 0 && (
          <TouchableOpacity onPress={openChatRoom}>
            <MessageIndicator
              count={project.equipmentTotal}
              name="fan"
              size={33}
              color="black"
            />
          </TouchableOpacity>
        )}
        {project.messageCount > 0 && (
          <TouchableOpacity onPress={openChatRoom}>
            <MessageIndicator
              count={project.messageCount}
              name="bubble.left.and.exclamationmark.bubble.right"
              size={33}
              color="black"
            />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  projectCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    marginTop: 3,
  },
  cardContent: {
    flex: 1, // Ensures content takes up the space above icons
  },
  inspectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  inspectorName: { color: 'black', fontSize: 14 },
  projectAddress: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timeContainer: {
    marginTop: 8,
  },
  timeText: {
    color: 'black',
    fontSize: 14,
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    position: 'absolute',
    gap: 10,
    bottom: 10,
    right: 10,
  },
})

export default ProjectCard
