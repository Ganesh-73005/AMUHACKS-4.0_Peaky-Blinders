"use client"

import { useState, useContext, useEffect, useRef } from "react"
import {
    View,
    TextInput,
    Text,
    SafeAreaView,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Dimensions,
} from "react-native"
import axios from "axios"
import StateContext from "../../context/StateContext"
import { SERVER_URL } from "../../config"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { LinearGradient } from "expo-linear-gradient"
import FontAwesomeIcon from "react-native-vector-icons/FontAwesome"

const { width } = Dimensions.get("window")

const Profile = ({ navigation }) => {
    const { setLoading, Logout } = useContext(StateContext)
    const [user, setUser] = useState({
        name: "",
        emergency_contact1: "",
        emergency_contact2: "",
    })

    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(50)).current

    const getUserData = async () => {
        setLoading(true)
        try {
            const User = await JSON.parse(await AsyncStorage.getItem("user"))
            if (!User) {
                console.warn("User is null, skipping getUserData")
                return
            }
            const { data } = await axios.get(`${SERVER_URL}/api/user/${User.user_id}`)
            setUser({
                name: data.name,
                emergency_contact1: data.emergency_contact[0],
                emergency_contact2: data.emergency_contact[1],
            })

            // Animate content in
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]).start()
        } catch (error) {
            console.error(error)
            if (error.response) return alert(error.response.data)
            alert(error)
        }
        setLoading(false)
    }

    const updateProfile = async () => {
        setLoading(true)
        try {
            const User = await JSON.parse(await AsyncStorage.getItem("user"))
            if (!User) {
                console.warn("User is null, skipping updateProfile")
                return
            }
            await axios.put(`${SERVER_URL}/api/user/${User.user_id}`, {
                name: user.name,
                emergency_contact: [user.emergency_contact1, user.emergency_contact2],
            })
            await AsyncStorage.setItem(
                "user",
                JSON.stringify({
                    ...User,
                    emergency_contact: [user.emergency_contact1, user.emergency_contact2],
                }),
            )
            Alert.alert("Success", "Profile updated successfully")
        } catch (error) {
            console.error(error)
            if (error.response) return alert(error.response.data)
            alert(error)
        }
        setLoading(false)
    }

    useEffect(() => {
        getUserData()
    }, [])

    const keyboardVerticalOffset = Platform.OS === "ios" ? 130 : 0

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior="position"
                keyboardVerticalOffset={keyboardVerticalOffset}
                style={{ width: "100%" }}
            >
                <ScrollView style={{ width: "100%" }}>
                    <Animated.View
                        style={[
                            styles.profileHeader,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        <LinearGradient colors={["#ff6b6b", "#ff4757"]} style={styles.headerGradient}>
                            <View style={styles.avatarContainer}>
                                <Image source={require("../../assets/icons/user.png")} resizeMode="contain" style={styles.avatar} />
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.formContainer,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        <View style={styles.formSection}>
                            <Text style={styles.sectionTitle}>Personal Information</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Name</Text>
                                <View style={styles.inputContainer}>
                                    <FontAwesomeIcon name="user" size={18} color="#6b7280" style={styles.inputIcon} />
                                    <TextInput
                                        placeholder="Your full name"
                                        style={styles.input}
                                        onChangeText={(text) => setUser({ ...user, name: text })}
                                        value={user.name}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.sectionTitle}>Emergency Contacts</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Primary Contact</Text>
                                <View style={styles.inputContainer}>
                                    <FontAwesomeIcon name="phone" size={18} color="#6b7280" style={styles.inputIcon} />
                                    <TextInput
                                        keyboardType="numeric"
                                        placeholder="Emergency contact number"
                                        style={styles.input}
                                        onChangeText={(text) => setUser({ ...user, emergency_contact1: text })}
                                        value={user.emergency_contact1}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Secondary Contact</Text>
                                <View style={styles.inputContainer}>
                                    <FontAwesomeIcon name="phone" size={18} color="#6b7280" style={styles.inputIcon} />
                                    <TextInput
                                        keyboardType="numeric"
                                        placeholder="Alternative emergency contact"
                                        style={styles.input}
                                        onChangeText={(text) => setUser({ ...user, emergency_contact2: text })}
                                        value={user.emergency_contact2}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity onPress={updateProfile} style={styles.updateButton} activeOpacity={0.8}>
                                <LinearGradient colors={["#ff6b6b", "#ff4757"]} style={styles.buttonGradient}>
                                    <FontAwesomeIcon name="check" size={18} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.buttonText}>Update Profile</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={Logout} style={styles.logoutButton} activeOpacity={0.8}>
                                <FontAwesomeIcon name="sign-out" size={18} color="#ff4757" style={{ marginRight: 8 }} />
                                <Text style={styles.logoutButtonText}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-start",
        backgroundColor: "#f9fafb",
    },
    profileHeader: {
        width: "100%",
        height: 200,
        overflow: "hidden",
    },
    headerGradient: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10,
    },
    avatar: {
        width: 80,
        height: 80,
    },
    formContainer: {
        width: "100%",
        paddingHorizontal: 16,
        marginTop: -40,
    },
    formSection: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1f2937",
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4b5563",
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f3f4f6",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        overflow: "hidden",
    },
    inputIcon: {
        padding: 12,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 16,
        color: "#1f2937",
    },
    buttonContainer: {
        marginVertical: 24,
    },
    updateButton: {
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 12,
        shadowColor: "#ff4757",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonGradient: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 16,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    logoutButton: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#ff4757",
        backgroundColor: "rgba(255, 71, 87, 0.05)",
    },
    logoutButtonText: {
        color: "#ff4757",
        fontSize: 16,
        fontWeight: "bold",
    },
})

export default Profile

