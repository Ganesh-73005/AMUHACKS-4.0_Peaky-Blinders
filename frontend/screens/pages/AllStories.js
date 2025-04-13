"use client"

import { View, Text, FlatList, RefreshControl, Alert, StyleSheet, Image, Animated, Dimensions } from "react-native"
import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { SERVER_URL } from "../../config"
import Loading from "./Loading"
import { LinearGradient } from "expo-linear-gradient"

const { width } = Dimensions.get("window")

const AllStories = () => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)
    const fadeAnim = useRef(new Animated.Value(0)).current
    const scaleAnim = useRef(new Animated.Value(0.9)).current

    const GetAllStories = async () => {
        setLoading(true)
        try {
            const { data } = await axios.get(`${SERVER_URL}/api/story`)
            setData(data)

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
            console.log(error)
            Alert.alert("Error", "Failed to fetch stories")
        }
        setLoading(false)
    }

    useEffect(() => {
        GetAllStories()
    }, [])

    if (loading) {
        return <Loading />
    }

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
                <LinearGradient colors={["#ffffff", "#f8f9fa"]} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardDescription}>{item.description}</Text>
                    </View>
                    <View style={styles.divider}></View>
                    <View style={styles.cardFooter}>
                        <View style={styles.authorSection}>
                            
                            <Text style={styles.authorText}>Posted by: Anonymous</Text>
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>
        )
    }

    return (
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
                    <Text style={styles.emptySubtext}>Be the first to share a story with the community</Text>
                </View>
            ) : (
                <FlatList
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={GetAllStories} colors={["#ff4757"]} />}
                    keyExtractor={(item, index) => index.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                    data={data}
                    renderItem={renderItem}
                />
            )}
        </Animated.View>
    )
}

export default AllStories

const styles = StyleSheet.create({
    listContainer: {
        padding: 16,
        paddingBottom: 80,
    },
    card: {
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        backgroundColor: "#ffffff",
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
    },
    authorSection: {
        flexDirection: "row",
        alignItems: "center",
    },
    authorAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#ff4757",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    authorInitial: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "bold",
    },
    authorText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6b7280",
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
})

