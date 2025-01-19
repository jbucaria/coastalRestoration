import React, { useState } from 'react'
import { router } from 'expo-router'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
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
    flex: 1, // This ensures that content takes up the space above icons
  },
  inspectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  inspectorName: { color: 'black', fontSize: 14 },
  remediationIndicator: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  jobType: { color: 'black', fontSize: 14, marginTop: 4 },
  projectAddress: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Aligns icons to the right
    alignItems: 'flex-end', // Aligns icons to the bottom if they are of different heights
    position: 'absolute',
    gap: 10,
    bottom: 10,
    right: 10,
  },
})

export default ProjectCard
