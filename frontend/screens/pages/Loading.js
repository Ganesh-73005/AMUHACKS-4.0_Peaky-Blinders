"use client"

import { useContext, useEffect, useRef } from "react"
import { ActivityIndicator, StyleSheet, Animated, Easing } from "react-native"
import StateContext from "../../context/StateContext"

const Loading = () => {
    const { loading } = useContext(StateContext)
    const fadeAnim = useRef(new Animated.Value(0)).current
    const pulseAnim = useRef(new Animated.Value(1)).current

    useEffect(() => {
        if (loading) {
            // Fade in animation
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start()

            // Start pulse animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
            ).start()
        }
    }, [loading])

    if (!loading) return null

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                },
            ]}
        >
            <Animated.View
                style={{
                    transform: [{ scale: pulseAnim }],
                }}
            >
                <ActivityIndicator animating={loading} color="#ff4757" size="large" style={styles.activityIndicator} />
            </Animated.View>
        </Animated.View>
    )
}

export default Loading

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    activityIndicator: {
        padding: 20,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.9)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
})

