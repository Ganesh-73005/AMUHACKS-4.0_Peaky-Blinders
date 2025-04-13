"use client"

import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    Modal,
    TextInput,
    StyleSheet,
    Image,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Dimensions,
} from "react-native"
import { useEffect, useState, useRef } from "react"
import FontAwesomeIcon from "react-native-vector-icons/FontAwesome"
import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"
import { SERVER_URL } from "../../config"
import { LinearGradient } from "expo-linear-gradient"

import CommonStyles from "../../CommonStyles"

const { width } = Dimensions.get("window")

const MyStories = () => {
    const [modalVisible, setModalVisible] = useState(false)
    const [data, setData] = useState([])
    const [story, setStory] = useState({
        title: "",
        description: "",
        user_id: "",
    })
    const fadeAnim = useRef(new Animated.Value(0)).current
    const scaleAnim = useRef(new Animated.Value(0.9)).current
    const [User, setUser] = useState(null)

    const handleSubmit = async () => {
        const UserData = await JSON.parse(await AsyncStorage.getItem("user"))
        const newStory = {
            title: story.title,
            description: story.description,
            user_id: UserData.user_id,
        }
        try {
            axios.post(`${SERVER_URL}/api/register/story`, newStory)
            setData([...data, newStory])
            Alert.alert("Success", "Your story has been shared successfully")
            setModalVisible(false)
            setStory({ title: "", description: "", user_id: "" })
        } catch (error) {
            Alert.alert("Error", "Failed to share your story")
        }
    }

    const GetMyStories = async () => {
        const UserData = await JSON.parse(await AsyncStorage.getItem("user"))
        try {
            const { data } = await axios.get(`${SERVER_URL}/api/story/${UserData.user_id}`)
            setData(data)
            setUser(UserData)

            // Animate content in
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]).start()
        } catch (error) {
            Alert.alert("Error", "Failed to fetch your stories")
        }
    }

    const DeleteCommunity = async (id) => {
        try {
            await axios.delete(`${SERVER_URL}/api/story/${id}`)
            Alert.alert("Success", "Story deleted successfully")
            GetMyStories()
        } catch (error) {
            Alert.alert("Error", "Failed to delete story")
        }
    }

    useEffect(() => {
        GetMyStories()
    }, [story])

    const keyboardVerticalOffset = Platform.OS === "ios" ? 40 : 0

    const renderItem = ({ item, index }) => {
        // No hooks inside render functions!
        return (
            <Animated.View
                style={{
                    opacity: 1,
                    transform: [{ scale: 1 }],
                    marginBottom: 16,
                }}
            >
                <LinearGradient
                    colors={["#ffffff", "#f8f9fa"]}
                    style={{
                        ...CommonStyles.card,
                        minHeight: 300,
                        borderRadius: 16,
                        marginBottom: 16,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5,
                    }}
                >
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardDescription}>{item.description}</Text>
                    </View>
                    <View style={styles.divider}></View>
                    <View style={styles.cardFooter}>
                        <View style={styles.authorSection}>
                            <Image source={require("../../assets/icons/user.png")} style={styles.authorAvatar} />
                            <Text style={styles.authorText}>Posted by you</Text>
                        </View>
                        {User && (
                            <TouchableOpacity style={styles.deleteButton} onPress={() => DeleteCommunity(item._id)}>
                                <FontAwesomeIcon name="trash" size={16} color="#ff4757" />
                                <Text style={styles.deleteButtonText}>Delete</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </LinearGradient>
            </Animated.View>
        )
    }

    return (
        <>
            <Animated.View
                style={{
                    ...styles.fabContainer,
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                }}
            >
                <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
                    <LinearGradient colors={["#ff6b6b", "#ff4757"]} style={styles.fabGradient}>
                        <FontAwesomeIcon name="plus" size={24} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            <Animated.View
                style={{
                    flex: 1,
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                }}
            >
                {data.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Image source={require("../../assets/empty.png")} style={styles.emptyImage} resizeMode="contain" />
                        <Text style={styles.emptyText}>No Stories Found</Text>
                        <Text style={styles.emptySubtext}>Share your story with the community</Text>
                    </View>
                ) : (
                    <FlatList
                        refreshControl={<RefreshControl refreshing={false} onRefresh={GetMyStories} colors={["#ff4757"]} />}
                        keyExtractor={(item, index) => index.toString()}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContainer}
                        data={data}
                        renderItem={renderItem}
                    />
                )}

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior="position"
                            keyboardVerticalOffset={keyboardVerticalOffset}
                            style={styles.modalContainer}
                        >
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Share your Story</Text>
                                    <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                                        <FontAwesomeIcon name="close" size={24} color="#000" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.formContainer}>
                                    <Text style={styles.inputLabel}>Title</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter a meaningful title"
                                        placeholderTextColor="#9ca3af"
                                        value={story.title}
                                        onChangeText={(value) => setStory({ ...story, title: value })}
                                    />

                                    <Text style={styles.inputLabel}>Description</Text>
                                    <TextInput
                                        multiline={true}
                                        style={styles.textArea}
                                        placeholder="Share your experience..."
                                        placeholderTextColor="#9ca3af"
                                        value={story.description}
                                        onChangeText={(value) => setStory({ ...story, description: value })}
                                        textAlignVertical="top"
                                    />
                                </View>

                                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.8}>
                                    <LinearGradient colors={["#ff6b6b", "#ff4757"]} style={styles.submitButtonGradient}>
                                        <Text style={styles.submitButtonText}>Share Story</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </Modal>
            </Animated.View>
        </>
    )
}

export default MyStories

const styles = StyleSheet.create({
    fabContainer: {
        position: "absolute",
        bottom: 20,
        right: 20,
        zIndex: 10,
    },
    fab: {
        borderRadius: 30,
        overflow: "hidden",
        elevation: 5,
        shadowColor: "#ff4757",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    fabGradient: {
        width: 60,
        height: 60,
        justifyContent: "center",
        alignItems: "center",
    },
    listContainer: {
        padding: 16,
        paddingBottom: 80,
    },
    cardHeader: {
        padding: 16,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1f2937",
        marginBottom: 8,
    },
    cardDescription: {
        fontSize: 16,
        color: "#4b5563",
        lineHeight: 24,
    },
    divider: {
        height: 1,
        backgroundColor: "#e5e7eb",
        marginHorizontal: 16,
    },
    cardFooter: {
        padding: 16,
        flexDirection: "column",
        gap: 12,
    },
    authorSection: {
        flexDirection: "row",
        alignItems: "center",
    },
    authorAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    authorText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6b7280",
    },
    deleteButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#ff4757",
        backgroundColor: "rgba(255, 71, 87, 0.05)",
        gap: 8,
    },
    deleteButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#ff4757",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    emptyImage: {
        width: 120,
        height: 120,
        marginBottom: 16,
        opacity: 0.7,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#6b7280",
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 16,
        color: "#9ca3af",
        textAlign: "center",
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContainer: {
        width: "90%",
        maxWidth: 400,
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1f2937",
    },
    closeButton: {
        padding: 8,
    },
    formContainer: {
        padding: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4b5563",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#f9fafb",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: "#1f2937",
        marginBottom: 16,
    },
    textArea: {
        backgroundColor: "#f9fafb",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: "#1f2937",
        minHeight: 120,
        marginBottom: 16,
    },
    submitButton: {
        margin: 16,
        borderRadius: 8,
        overflow: "hidden",
        elevation: 2,
        shadowColor: "#ff4757",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    submitButtonGradient: {
        paddingVertical: 14,
        alignItems: "center",
    },
    submitButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
})

