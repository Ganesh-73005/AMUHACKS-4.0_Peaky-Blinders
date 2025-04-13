import { useEffect, useState, useContext, useRef } from "react";
import {
    View,
    TouchableOpacity,
    Text,
    StyleSheet,
    SafeAreaView,
    Image,
    Linking,
    Vibration,
    Animated,
    Dimensions,
    StatusBar,
    Platform,
    AccessibilityInfo
} from "react-native";
import * as SMS from "expo-sms";
import { Accelerometer } from "expo-sensors";
import { Audio } from "expo-av";
import StateContext from "../../context/StateContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { SERVER_URL } from "../../config";
import Chatbot from "../../components/Chatbot.js";
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const SOS = () => {
    const { socket, User, isSocketConnected } = useContext(StateContext);
    const [sound, setSound] = useState();
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSOS, setIsSOS] = useState(false);
    const [accepted_count, setAccepted_count] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

    // Animation values
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const buttonScaleAnim = useRef(new Animated.Value(0.95)).current;

    // Check if screen reader is enabled for accessibility
    useEffect(() => {
        AccessibilityInfo.isScreenReaderEnabled().then(
            screenReaderEnabled => {
                setScreenReaderEnabled(screenReaderEnabled);
            }
        );

        const listener = AccessibilityInfo.addEventListener(
            'screenReaderChanged',
            screenReaderEnabled => {
                setScreenReaderEnabled(screenReaderEnabled);
            }
        );

        return () => {
            listener.remove();
        };
    }, []);

    // Entrance animations
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true
            }),
            Animated.timing(buttonScaleAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true
            }),
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 700,
                useNativeDriver: true
            })
        ]).start();
    }, []);

    // Enhanced pulse animation
    const pulse = () => {
        Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1.2,
                duration: 500,
                useNativeDriver: true
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true
            })
        ]).start(() => isSOS && pulse());
    };

    useEffect(() => {
        if (isSOS) {
            pulse();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isSOS]);

    // Fetch SOS status
    useEffect(() => {
        const fetchData = async () => {
            try {
                const user = await JSON.parse(await AsyncStorage.getItem("user"));
                const countResponse = await axios.get(`${SERVER_URL}/api/sos_accepted_count/${user.user_id}`);
                setAccepted_count(countResponse.data);

                const sosResponse = await axios.get(`${SERVER_URL}/api/is_sos/${user.user_id}`);
                setIsSOS(sosResponse.data);

                if (screenReaderEnabled) {
                    AccessibilityInfo.announceForAccessibility(
                        sosResponse.data
                            ? `Emergency mode active with ${countResponse.data} responders`
                            : "System ready. No active emergency."
                    );
                }
            } catch (error) {
                console.error("Error fetching SOS status:", error);
            }
        };

        fetchData();
    }, [socket.connected]);

    const refreshStatus = async () => {
        try {
            const user = await JSON.parse(await AsyncStorage.getItem("user"));
            const { data } = await axios.get(`${SERVER_URL}/api/sos_accepted_count/${user.user_id}`);
            setAccepted_count(data);

            // Provide haptic feedback
            if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } else {
                Vibration.vibrate(50);
            }

            // Animate the refresh icon
            Animated.sequence([
                Animated.timing(rotateAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true
                }),
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 700,
                    useNativeDriver: true
                })
            ]).start();

            if (screenReaderEnabled) {
                AccessibilityInfo.announceForAccessibility(`Status refreshed. ${data} responders.`);
            }
        } catch (error) {
            console.error("Refresh error:", error);
        }
    };

    const playSound = async () => {
        try {
            if (sound) {
                await sound.stopAsync();
                await sound.unloadAsync();
                setSound(null);
                setIsPlaying(false);

                if (screenReaderEnabled) {
                    AccessibilityInfo.announceForAccessibility("Siren stopped");
                }
                return;
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                require("../../assets/sos.mp3"),
                { shouldPlay: true, isLooping: true }
            );

            setSound(newSound);
            setIsPlaying(true);

            if (screenReaderEnabled) {
                AccessibilityInfo.announceForAccessibility("Emergency siren playing");
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
            });
        } catch (error) {
            console.error("Audio error:", error);
        }
    };

    useEffect(() => {
        return sound ? () => sound.unloadAsync() : undefined;
    }, [sound]);

    // Send SMS to emergency contacts
    const sendEmergencySMS = async (message) => {
        try {
            const isAvailable = await SMS.isAvailableAsync();
            if (isAvailable) {
                await SMS.sendSMSAsync(
                    User.emergency_contact.join(','),
                    message,
                    { allowSendWithoutUserInteraction: true }
                );
            }
        } catch (error) {
            console.error("SMS sending error:", error);
        }
    };

    // Main SOS function
    const OnSOS = async () => {
        if (!isSocketConnected) return;
    
        const { emergency_contact, user_id } = User;
    
        // Provide haptic feedback
        if (Platform.OS === 'ios') {
            Haptics.notificationAsync(
                isSOS
                    ? Haptics.NotificationFeedbackType.Success
                    : Haptics.NotificationFeedbackType.Warning
            );
        } else {
            Vibration.vibrate(isSOS ? 100 : [100, 200, 300]);
        }
    
        if (isSOS) {
            // Cancel SOS - send one cancellation message
            socket.emit("SOS_Cancel", (data) => {
                if (data.err) return;
                const message = `Emergency canceled: I am ${data} and I am safe now.`;
                sendEmergencySMS(message);
                setAccepted_count(0);
                setIsSOS(false);
    
                if (screenReaderEnabled) {
                    AccessibilityInfo.announceForAccessibility("Emergency canceled. Contacts notified that you are safe.");
                }
            });
        } else {
            try {
                console.log(User.coordinates)
    
                // First verify if SOS can be triggered
                const verificationResponse = await axios.post(`http://192.168.1.4:5000/api/verify_sos`, {
                    user_id: user_id,
                    coordinates: User.coordinates, // Make sure coordinates are available in User context
                    description: "Emergency SOS triggered from mobile app"
                });
                console.log(User.coordinates)
    
                if (!verificationResponse.data.verified) {
                    Alert.alert(
                        "SOS Blocked",
                        verificationResponse.data.message || "You cannot trigger SOS at this time",
                        [{ text: "OK" }]
                    );
                    return;
                }
    
                // If verification passed, activate SOS
                socket.emit("On_SOS", "general", (data) => {
                    if (data.err) return;
    
                    const message = `EMERGENCY ALERT! I am ${data.name} and I need help! 
    My location: https://www.google.com/maps/search/?api=1&query=${data.coordinates.latitude},${data.coordinates.longitude}
    Time: ${new Date(data.time).toLocaleString()}`;
    
                    sendEmergencySMS(message);
                    setIsSOS(true);
                    Vibration.vibrate([500, 500, 500]);
    
                    if (screenReaderEnabled) {
                        AccessibilityInfo.announceForAccessibility("Emergency activated. Contacts have been notified.");
                    }
                });
            } catch (error) {
                console.error("SOS Verification Error:", error);
                Alert.alert(
                    "Verification Failed",
                    "Could not verify SOS request. Please try again.",
                    [{ text: "OK" }]
                );
            }
        }
    };

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

            {/* Status Bar with gradient */}
            <Animated.View style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
            }}>
                <LinearGradient
                    colors={isSOS ? ['#FF3A30', '#FF4B2B'] : ['#1A1A1A', '#0A0A0A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.statusBar}
                >
                    <View style={styles.statusContent}>
                        <View style={[
                            styles.statusIndicator,
                            { backgroundColor: isSOS ? '#FF3A30' : '#4CD964' }
                        ]} />
                        <Text
                            style={styles.statusText}
                            accessibilityLabel={isSOS ?
                                `Emergency active with ${accepted_count} responders` :
                                "System ready"
                            }
                        >
                            {isSOS ?
                                `🚨 EMERGENCY (${accepted_count} responders)` :
                                "🟢 SYSTEM READY"}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={refreshStatus}
                        style={styles.refreshButton}
                        accessibilityLabel="Refresh status"
                        accessibilityHint="Double tap to refresh the emergency status"
                    >
                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                            <Feather name="refresh-cw" size={22} color="#FFF" />
                        </Animated.View>
                    </TouchableOpacity>
                </LinearGradient>
            </Animated.View>

            {/* Chatbot Button */}
            <Animated.View style={[
                styles.chatbotContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                }
            ]}>
                <TouchableOpacity
                    style={styles.chatbotButton}
                    onPress={() => setModalVisible(true)}
                    accessibilityLabel="Open emergency chatbot"
                    accessibilityHint="Double tap to open the emergency assistance chatbot"
                >
                    <LinearGradient
                        colors={['#7D40FF', '#6E5BFF']}
                        style={styles.chatbotGradient}
                    >
                        <Feather name="message-circle" size={24} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
                <Chatbot modalVisible={modalVisible} setModalVisible={setModalVisible} />
            </Animated.View>

            {/* Main SOS Interface */}
            <View style={styles.mainContainer}>
                {/* SOS Button with Animated Pulse */}
                <Animated.View
                    style={[
                        styles.sosButtonContainer,
                        {
                            transform: [
                                { scale: pulseAnim },
                                { translateY: slideAnim }
                            ],
                            opacity: fadeAnim
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.sosButton}
                        onPress={OnSOS}
                        activeOpacity={0.8}
                        accessibilityLabel={isSOS ? "Cancel emergency" : "Activate emergency SOS"}
                        accessibilityHint={isSOS ?
                            "Double tap to cancel the emergency and notify contacts you are safe" :
                            "Double tap to activate emergency mode and notify your emergency contacts"
                        }
                        accessibilityRole="button"
                    >
                        <LinearGradient
                            colors={isSOS ? ['#FF3A30', '#FF4B2B'] : ['#FF5E5B', '#FF3A30']}
                            style={styles.sosButtonGradient}
                        >
                            {isSOS ? (
                                <View style={styles.sosActiveContainer}>
                                    <MaterialCommunityIcons name="alert-circle" size={40} color="#FFF" />
                                    <Text style={styles.sosButtonText}>CANCEL SOS</Text>
                                    <Text style={styles.sosSubtext}>
                                        {accepted_count > 0
                                            ? `${accepted_count} people responding`
                                            : "Waiting for response"}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.sosInactiveContainer}>
                                    <MaterialCommunityIcons name="shield-alert" size={50} color="#FFF" />
                                    <Text style={styles.sosButtonText}>ACTIVATE SOS</Text>
                                    <Text style={styles.sosSubtext}>Press in emergency</Text>
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

                {/* Action Buttons */}
                <Animated.View
                    style={[
                        styles.actionButtonsContainer,
                        {
                            opacity: fadeAnim,
                            transform: [
                                { translateY: slideAnim },
                                { scale: buttonScaleAnim }
                            ]
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={playSound}
                        accessibilityLabel={isPlaying ? "Stop siren" : "Play emergency siren"}
                        accessibilityHint={isPlaying ?
                            "Double tap to stop the emergency siren" :
                            "Double tap to play a loud emergency siren"
                        }
                    >
                        <LinearGradient
                            colors={['#FF6B6B', '#FF4757']}
                            style={styles.actionButtonGradient}
                        >
                            <Feather
                                name={isPlaying ? "volume-x" : "volume-2"}
                                size={24}
                                color="#FFF"
                                style={styles.actionButtonIcon}
                            />
                            <Text style={styles.actionButtonText}>
                                {isPlaying ? "STOP SIREN" : "PLAY SIREN"}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => Linking.openURL(`tel:${User.emergency_contact[0]}`)}
                        accessibilityLabel="Make emergency call"
                        accessibilityHint="Double tap to call your primary emergency contact"
                    >
                        <LinearGradient
                            colors={['#FF4B2B', '#FF3A30']}
                            style={styles.actionButtonGradient}
                        >
                            <Feather
                                name="phone-call"
                                size={24}
                                color="#FFF"
                                style={styles.actionButtonIcon}
                            />
                            <Text style={styles.actionButtonText}>EMERGENCY CALL</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {/* Bottom Status Indicator */}
            <Animated.View style={{
                opacity: fadeAnim,
                transform: [{ translateY: Animated.multiply(slideAnim, -1) }]
            }}>
                <LinearGradient
                    colors={isSOS ? ['#FF3A30', '#FF4B2B'] : ['#7D40FF', '#6E5BFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.bottomIndicator}
                >
                    <Text
                        style={styles.bottomIndicatorText}
                        accessibilityLabel={isSOS ? "Emergency in progress" : "You are protected"}
                    >
                        {isSOS ? "🆘 EMERGENCY IN PROGRESS" : "✅ YOU ARE PROTECTED"}
                    </Text>
                </LinearGradient>
            </Animated.View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffff',
    },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    statusContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 10,
    },
    statusText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
        fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif',
        letterSpacing: 0.5,
    },
    refreshButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    chatbotContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 70 : 60,
        right: 25,
        zIndex: 10,
    },
    chatbotButton: {
        elevation: 5,
        shadowColor: '#6E5BFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        borderRadius: 30,
        overflow: 'hidden',
    },
    chatbotGradient: {
        padding: 14,
        borderRadius: 30,
    },
    mainContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    sosButtonContainer: {
        marginBottom: 40,
        shadowColor: '#FF0000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 15,
    },
    sosButton: {
        width: 240,
        height: 240,
        borderRadius: 120,
        overflow: 'hidden',
        borderWidth: 6,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    sosButtonGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sosActiveContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    sosInactiveContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    sosButtonText: {
        color: '#FFF',
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        marginTop: 10,
    },
    sosSubtext: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginTop: 5,
        fontWeight: '500',
    },
    actionButtonsContainer: {
        width: '90%',
        gap: 15,
    },
    actionButton: {
        height: 60,
        borderRadius: 15,
        overflow: 'hidden',
        elevation: 5,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    actionButtonGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonIcon: {
        marginRight: 10,
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    bottomIndicator: {
        padding: 18,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    bottomIndicatorText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});

export default SOS;