"use client"

import { useState, useEffect, useContext, useRef } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Linking,
  Modal,
  SafeAreaView,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  AccessibilityInfo,
} from "react-native"
import StateContext from "../../context/StateContext"
import axios from "axios"
import { SERVER_URL } from "../../config"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import * as Haptics from "expo-haptics"
import LottieView from "lottie-react-native"

const { width, height } = Dimensions.get("window")

const Alerts = () => {
  const [refreshing, setRefreshing] = useState(false)
  const { socket, setLoading, User } = useContext(StateContext)
  const [modalVisible, setModalVisible] = useState(false)
  const [showAcceptRejectCard, setShowAcceptRejectCard] = useState(false)
  const [acceptedList, setAcceptedList] = useState([])
  const [rejectedList, setRejectedList] = useState([]) // New state for rejected users
  const [AlertList, setAlertList] = useState([])
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [expandedCard, setExpandedCard] = useState(null)
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false)

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current
  const headerAnim = useRef(new Animated.Value(0)).current

  // Check if screen reader is enabled
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then((screenReaderEnabled) => {
      setScreenReaderEnabled(screenReaderEnabled)
    })

    const listener = AccessibilityInfo.addEventListener("screenReaderChanged", (screenReaderEnabled) => {
      setScreenReaderEnabled(screenReaderEnabled)
    })

    return () => {
      listener.remove()
    }
  }, [])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const Get_SOS_details = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get(`${SERVER_URL}/api/sos/details/${User.user_id}`)
      setAlertList(data)
      setLoading(false)

      if (screenReaderEnabled) {
        AccessibilityInfo.announceForAccessibility(
          data.length > 0 ? `${data.length} emergency alerts loaded` : "No emergency alerts available",
        )
      }
    } catch (err) {
      setLoading(false)
      Alert.alert("Error", err.toString())
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      const { data } = await axios.get(`${SERVER_URL}/api/sos/details/${User.user_id}`)
      setAlertList(data)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

      if (screenReaderEnabled) {
        AccessibilityInfo.announceForAccessibility("Alerts refreshed")
      }
    } catch (err) {
      Alert.alert("Error", err.toString())
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    Get_SOS_details()
  }, [socket.connected])

  useEffect(() => {
    socket.on("Refetch_SOS_Details", () => Get_SOS_details())
    return () => {
      socket.off("Refetch_SOS_Details")
    }
  }, [socket.connected])

  const AcceptRequest = async (user_id, sos_id) => {
    try {
      setLoading(true)
      await axios.post(`${SERVER_URL}/api/sos/accepted`, { sos_id, user_id })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert("Success", "Request accepted successfully")
      setLoading(false)
      setShowAcceptRejectCard(false)
      Get_SOS_details() // Refresh the list to update status

      if (screenReaderEnabled) {
        AccessibilityInfo.announceForAccessibility("Emergency request accepted successfully")
      }
    } catch (err) {
      setLoading(false)
      Alert.alert("Error", err.toString())
    }
  }

  const RejectRequest = async (user_id, sos_id) => {
    try {
      setLoading(true)
      await axios.post(`${SERVER_URL}/api/sos/rejected`, { sos_id, user_id })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Alert.alert("Request Rejected", "You have declined to help with this emergency")
      setLoading(false)
      setShowAcceptRejectCard(false)
      Get_SOS_details() // Refresh the list to update status

      if (screenReaderEnabled) {
        AccessibilityInfo.announceForAccessibility("Emergency request rejected")
      }
    } catch (err) {
      setLoading(false)
      Alert.alert("Error", err.toString())
    }
  }

  const GetDirection = async (sos_owner_id, sos_id) => {
    if (!socket.connected) {
      Alert.alert("Connection Error", "Please connect to the network")
      return
    }

    try {
      setLoading(true)
      const { data } = await axios.get(`${SERVER_URL}/api/active/location/${sos_owner_id}`)
      const url = `https://www.google.com/maps/dir/?api=1&destination=${data.latitude},${data.longitude}&travelmode=walking`
      await Linking.openURL(url)
      console.log(url)
      setLoading(false)

      if (screenReaderEnabled) {
        AccessibilityInfo.announceForAccessibility("Opening directions to emergency location")
      }
    } catch (err) {
      setLoading(false)
      Alert.alert("Error", err.toString())
    }
  }

  const toggleCardExpansion = (id) => {
    setExpandedCard(expandedCard === id ? null : id)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (screenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(
        expandedCard === id ? "Card collapsed" : "Card expanded. Additional options available.",
      )
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    })
  }

  const getTimeDifference = (dateString) => {
    const now = new Date()
    const alertDate = new Date(dateString)
    const diffMs = now - alertDate
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) {
      return `${diffMins} min ago`
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)} hr ago`
    } else {
      return `${Math.floor(diffMins / 1440)} days ago`
    }
  }

  // Check if current user has accepted this SOS
  const hasAccepted = (sos) => {
    return sos.accepted_users?.some(user => user.user_id === User.user_id)
  }

  // Check if current user has rejected this SOS
  const hasRejected = (sos) => {
    return sos.rejected_users?.some(user => user.user_id === User.user_id)
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <LottieView
        source={require("../../assets/animations/empty-state.json")}
        autoPlay
        loop
        style={styles.emptyAnimation}
      />
      <Text style={styles.emptyTitle}>No Alerts</Text>
      <Text style={styles.emptySubtitle}>When someone sends an SOS alert, it will appear here</Text>
    </View>
  )

  const renderAcceptRejectCard = () => {
    if (!selectedAlert || !showAcceptRejectCard || selectedAlert.owner_id === User.user_id) return null

    return (
      <View style={styles.acceptRejectCard}>
        <View style={styles.acceptRejectCardHeader}>
          <MaterialIcons name="warning" size={24} color="#f59e0b" />
          <Text style={styles.acceptRejectCardTitle}>Emergency Request</Text>
        </View>

        <View style={styles.acceptRejectCardContent}>
          <Text style={styles.acceptRejectCardText}>
            Would you like to help this person in distress? By accepting, you agree to provide assistance.
          </Text>
        </View>

        <View style={styles.acceptRejectCardButtons}>
          <TouchableOpacity
            style={[styles.acceptRejectCardButton, styles.rejectButton]}
            onPress={() => {
              RejectRequest(User.user_id, selectedAlert._id)
            }}
            accessibilityLabel="Reject request"
            accessibilityHint="Double tap to decline this emergency request"
          >
            <MaterialIcons name="close" size={20} color="#ef4444" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptRejectCardButton, styles.acceptButton]}
            onPress={() => {
              AcceptRequest(User.user_id, selectedAlert._id)
            }}
            accessibilityLabel="Accept request"
            accessibilityHint="Double tap to accept this emergency request and provide assistance"
          >
            <MaterialIcons name="check" size={20} color="#ffffff" />
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderAlertCard = ({ item, index }) => {
    if (!item) return null

    const isExpanded = expandedCard === item._id
    const animationDelay = index * 100
    const isCurrentUserSOS = item.owner_id === User.user_id
    const userHasAccepted = hasAccepted(item)
    const userHasRejected = hasRejected(item)

    return (
      <Animated.View
        style={[
          styles.card,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
        accessible={true}
        accessibilityLabel={`Emergency alert from ${item.user.name}, ${getTimeDifference(item.createdAt)}`}
        accessibilityHint="Double tap to expand or collapse details"
      >
        <TouchableOpacity style={styles.cardHeader} onPress={() => toggleCardExpansion(item._id)} activeOpacity={0.8}>
          <View style={styles.userInfo}>
            <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.avatar}>
              <Text style={styles.avatarText}>{item.user.name ? item.user.name.charAt(0).toUpperCase() : "?"}</Text>
            </LinearGradient>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{item.user.name}</Text>
              <Text style={styles.timeAgo}>{getTimeDifference(item.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackType.Medium)
                Alert.alert("Report User", "Are you sure you want to report this user?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Report",
                    style: "destructive",
                    onPress: () => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                      Alert.alert("User Reported", "Thank you for your report")
                    },
                  },
                ])
              }}
              accessibilityLabel="Report user"
              accessibilityHint="Double tap to report this user for inappropriate behavior"
            >
              <MaterialIcons name="report-problem" size={20} color="#ef4444" />
            </TouchableOpacity>
            <MaterialIcons name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color="#6b7280" />
          </View>
        </TouchableOpacity>

        <View
          style={[
            styles.cardContent,
            {
              maxHeight: isExpanded ? 500 : 100,
              overflow: "hidden",
            },
          ]}
        >
          <View style={styles.infoRow}>
            <MaterialIcons name="phone" size={18} color="#3b82f6" />
            <Text style={styles.infoText}>{item.user.phone_number}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="description" size={18} color="#3b82f6" />
            <Text style={styles.infoText}>{item.description || "No description provided"}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="access-time" size={18} color="#3b82f6" />
            <Text style={styles.infoText}>{formatDate(item.createdAt)}</Text>
          </View>

          {/* Show status if user has already responded to this SOS */}
          {!isCurrentUserSOS && (userHasAccepted || userHasRejected) && (
            <View style={styles.responseStatus}>
              <MaterialIcons 
                name={userHasAccepted ? "check-circle" : "cancel"} 
                size={18} 
                color={userHasAccepted ? "#10b981" : "#ef4444"} 
              />
              <Text style={[
                styles.responseStatusText,
                { color: userHasAccepted ? "#10b981" : "#ef4444" }
              ]}>
                You {userHasAccepted ? "accepted" : "rejected"} this request
              </Text>
            </View>
          )}

          {isExpanded && (
            <View style={styles.actionButtons}>
              {/* Only show Get Directions button if this is not the current user's SOS */}
              {!isCurrentUserSOS && (
                <TouchableOpacity
                  style={[styles.button, styles.directionButton]}
                  onPress={() => {
                    GetDirection(item.owner_id, item._id)
                  }}
                  accessibilityLabel="Get directions"
                  accessibilityHint="Double tap to get directions to this emergency location"
                >
                  <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.buttonGradient}>
                    <MaterialIcons name="directions" size={20} color="#ffffff" />
                    <Text style={styles.buttonText}>Get Directions</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Show Accept/Reject buttons only if not current user's SOS and user hasn't responded yet */}
              {!isCurrentUserSOS && !userHasAccepted && !userHasRejected && (
                <TouchableOpacity
                  style={[styles.button, styles.acceptRejectButton]}
                  onPress={() => {
                    setSelectedAlert(item)
                    setShowAcceptRejectCard(true)
                  }}
                  accessibilityLabel="Respond to emergency"
                  accessibilityHint="Double tap to accept or reject this emergency request"
                >
                  <LinearGradient colors={["#f59e0b", "#d97706"]} style={styles.buttonGradient}>
                    <MaterialIcons name="warning" size={20} color="#ffffff" />
                    <Text style={styles.buttonText}>Respond to Emergency</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.acceptedButton]}
                onPress={async () => {
                  try {
                    setLoading(true)
                    const { data } = await axios.get(`${SERVER_URL}/api/sos/accepted/${item._id}`)
                    setAcceptedList(data)
                    setModalVisible(true)
                    setLoading(false)
                    Haptics.impactAsync(Haptics.ImpactFeedbackType.Medium)
                  } catch (error) {
                    setLoading(false)
                    Alert.alert("Error", error.toString())
                  }
                }}
                accessibilityLabel="View accepted users"
                accessibilityHint="Double tap to see who has accepted this emergency request"
              >
                <LinearGradient colors={["#10b981", "#059669"]} style={styles.buttonGradient}>
                  <MaterialIcons name="people" size={20} color="#ffffff" />
                  <Text style={styles.buttonText}>Accepted Users ({item.accepted_users?.length || 0})</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: Animated.multiply(
                  headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                  -1,
                ),
              },
            ],
          },
        ]}
      >
        <LinearGradient colors={["#ffffff", "#f9fafb"]} style={styles.headerGradient}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            SOS Alerts
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            style={styles.refreshButton}
            accessibilityLabel="Refresh alerts"
            accessibilityHint="Double tap to refresh the list of emergency alerts"
          >
            <MaterialIcons name="refresh" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      <View style={styles.content}>
        {AlertList.length === 0 || AlertList[0] === null ? (
          renderEmptyState()
        ) : (
          <>
            <FlatList
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#3b82f6"]}
                  tintColor="#3b82f6"
                />
              }
              data={AlertList}
              renderItem={renderAlertCard}
              keyExtractor={(item) => item?._id || Math.random().toString()}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={renderAcceptRejectCard}
            />
          </>
        )}
      </View>

      {/* Accepted Users Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} accessibilityRole="header">
                Accepted Users
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false)
                }}
                style={styles.closeButton}
                accessibilityLabel="Close modal"
                accessibilityHint="Double tap to close this popup"
              >
                <MaterialIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalDivider} />

            {acceptedList.length > 0 ? (
              <FlatList
                data={acceptedList}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <View
                    style={styles.userItem}
                    accessible={true}
                    accessibilityLabel={`User ${item.name} with phone number ${item.phone_number}`}
                  >
                    <LinearGradient colors={["#10b981", "#059669"]} style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>{item.name ? item.name.charAt(0).toUpperCase() : "?"}</Text>
                    </LinearGradient>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.name}</Text>
                      <View style={styles.phoneRow}>
                        <MaterialIcons name="phone" size={14} color="#6b7280" />
                        <Text style={styles.phoneText}>{item.phone_number}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${item.phone_number}`)}
                      style={styles.callButton}
                      accessibilityLabel={`Call ${item.name}`}
                      accessibilityHint={`Double tap to call ${item.name}`}
                    >
                      <MaterialIcons name="call" size={20} color="#3b82f6" />
                    </TouchableOpacity>
                  </View>
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalListContent}
              />
            ) : (
              <View style={styles.emptyModalContent}>
                <LottieView
                  source={require("../../assets/animations/empty-state.json")}
                  autoPlay
                  loop
                  style={styles.emptyModalAnimation}
                />
                <Text style={styles.emptyModalText}>No users have accepted this alert yet</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  responseStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  responseStatusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Update button styles
  acceptRejectButton: {
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerGradient: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listContent: {
    paddingBottom: 16,
  },

  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyAnimation: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },

  // Card styles
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  timeAgo: {
    fontSize: 12,
    color: "#6b7280",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    marginTop: 16,
    gap: 12,
  },
  button: {
    borderRadius: 8,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  directionButton: {
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  acceptedButton: {
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    marginLeft: 8,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 500,
    maxHeight: height * 0.8,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  modalListContent: {
    padding: 16,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userAvatarText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  userInfo: {
    flex: 1,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  phoneText: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 4,
  },
  callButton: {
    padding: 8,
  },
  emptyModalContent: {
    padding: 24,
    alignItems: "center",
  },
  emptyModalAnimation: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
  emptyModalText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },

  // Accept/Reject Card styles
  acceptRejectCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  acceptRejectCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#fffbeb",
  },
  acceptRejectCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 8,
  },
  acceptRejectCardContent: {
    padding: 16,
  },
  acceptRejectCardText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    textAlign: "center",
  },
  acceptRejectCardButtons: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  acceptRejectCardButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  rejectButton: {
    backgroundColor: "#fef2f2",
    borderRightWidth: 1,
    borderRightColor: "#f3f4f6",
  },
  acceptButton: {
    backgroundColor: "#3b82f6",
  },
  rejectButtonText: {
    color: "#ef4444",
    fontWeight: "600",
    marginLeft: 8,
  },
  acceptButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    marginLeft: 8,
  },
})

export default Alerts

