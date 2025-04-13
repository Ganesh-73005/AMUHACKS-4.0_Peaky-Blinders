"use client"

import { useState, useRef, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, StatusBar, SafeAreaView } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import AllStories from "./AllStories"
import MyStories from "./MyStories"

const { width } = Dimensions.get("window")

const Story = () => {
    const [activeTab, setActiveTab] = useState("AllStories")
    const [animation] = useState(new Animated.Value(0))

    // Additional animations
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(50)).current

    useEffect(() => {
        // Start animations when component mounts
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start()
    }, [])

    const switchTab = (tab) => {
        setActiveTab(tab)
        Animated.spring(animation, {
            toValue: tab === "AllStories" ? 0 : 1,
            useNativeDriver: false,
            friction: 8,
            tension: 50,
        }).start()
    }

    // Calculate tab indicator position and width
    const tabIndicatorPosition = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, width / 2],
    })

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F8F8" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Stories</Text>
                <TouchableOpacity style={styles.headerButton} onPress={() => { }}>
                    <MaterialIcons name="info-outline" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>

            <Animated.View
                style={[
                    styles.tabContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.tabIndicator,
                        {
                            transform: [{ translateX: tabIndicatorPosition }],
                        },
                    ]}
                />
                <TouchableOpacity style={styles.tab} onPress={() => switchTab("AllStories")} activeOpacity={0.7}>
                    <MaterialIcons
                        name="public"
                        size={20}
                        color={activeTab === "AllStories" ? "#FFFFFF" : "#666666"}
                        style={styles.tabIcon}
                    />
                    <Text style={[styles.tabText, activeTab === "AllStories" && styles.activeTabText]}>All Stories</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tab} onPress={() => switchTab("MyStories")} activeOpacity={0.7}>
                    <MaterialIcons
                        name="person"
                        size={20}
                        color={activeTab === "MyStories" ? "#FFFFFF" : "#666666"}
                        style={styles.tabIcon}
                    />
                    <Text style={[styles.tabText, activeTab === "MyStories" && styles.activeTabText]}>My Stories</Text>
                </TouchableOpacity>
            </Animated.View>

            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                    },
                ]}
            >
                {activeTab === "AllStories" ? <AllStories /> : <MyStories />}
            </Animated.View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F8F8",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#EEEEEE",
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#333",
    },
    headerButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: "#F0F0F0",
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 30,
        margin: 15,
        height: 56,
        position: "relative",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    tabIcon: {
        marginRight: 6,
    },
    tabText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666666",
    },
    activeTabText: {
        color: "#FFFFFF",
    },
    tabIndicator: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "100%",
        width: "50%",
        backgroundColor: "#007AFF",
        borderRadius: 30,
    },
    content: {
        flex: 1,
    },
})

export default Story

