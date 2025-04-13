import { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Easing
} from "react-native";
import CommonStyles from "../CommonStyles";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SERVER_URL } from "../config";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI("");

const Chatbot = ({ modalVisible, setModalVisible }) => {
    const [inputMessage, setInputMessage] = useState("");
    const [chat, setChat] = useState([
        {
            message: "Hey, what's up? Need help with safety or just wanna chat?",
            sender: "bot",
        },
    ]);
    const [typeAlert, setTypeAlert] = useState("");
    const [anonymous_alert, setAnonymous_alert] = useState({
        type: "",
        description: "",
    });
    const scrollViewRef = useRef();
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Auto-scroll to bottom when chat updates
    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [chat]);

    // Pulsing animation for send button
    const pulse = () => {
        Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1.2,
                duration: 100,
                easing: Easing.ease,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 100,
                easing: Easing.ease,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const onSubmit = async () => {
        if (inputMessage.trim() === "") return;
        pulse();

        // Add user message to chat
        setChat((prevChat) => [...prevChat, { message: inputMessage, sender: "user" }]);
        setInputMessage("");

        try {
            // Enhanced masculine prompt with safety focus
            const contextMessage = `
                You are a direct, no-nonsense safety assistant in a women's safety app. 
                Respond concisely with feminine tone but remain professional. Dont use bold letters, maintain proper formats
                
                Key app features to consider:
                - SOS emergency alerts (medical/danger)
                - Safe route navigation with risk scoring
                - Nearby user alerts in emergencies
                - Direct calling/messaging for help
                - Anonymous threat reporting
                
                Prioritize clear, actionable safety advice. Use short sentences. 
                Avoid unnecessary pleasantries. Be authoritative but not condescending.
                
                User message: ${inputMessage}
            `;

            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(contextMessage);
            const response = await result.response;
            const botMessage = response.text();

            setChat((prevChat) => [...prevChat, { message: botMessage, sender: "bot" }]);
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            setChat((prevChat) => [
                ...prevChat,
                { message: "System error. Try again later.", sender: "bot" },
            ]);
        }
    };

    const CreateAnonymousAlert = async () => {
        try {
            const { data } = await axios.post(
                `${SERVER_URL}/api/register/anonymous_alert`,
                anonymous_alert
            );
            setAnonymous_alert({
                type: "",
                description: "",
            });
            alert(data);
        } catch (err) {
            console.error(err);
            if (err.response) return alert(err.response.data);
            alert(err);
        }
    };

    const keyboardVerticalOffset = Platform.OS === "ios" ? 90 : 0;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.header}>
                        <Text style={styles.headerText}>SAFETY CHAT</Text>
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={styles.closeButton}
                        >
                            <Image
                                source={require("../assets/icons/close.png")}
                                style={styles.closeIcon}
                            />
                        </TouchableOpacity>
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        keyboardVerticalOffset={keyboardVerticalOffset}
                        style={styles.chatContainer}
                    >
                        <ScrollView
                            ref={scrollViewRef}
                            style={styles.chatArea}
                            contentContainerStyle={styles.chatContent}
                        >
                            {chat.map((e, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.chatBubble,
                                        e.sender === "bot"
                                            ? styles.botBubble
                                            : styles.userBubble,
                                    ]}
                                >
                                    <Text style={styles.chatText}>{e.message}</Text>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.inputContainer}>
                            <TextInput
                                placeholder="What's the situation?"
                                onChangeText={setInputMessage}
                                value={inputMessage}
                                style={styles.input}
                                onSubmitEditing={onSubmit}
                                returnKeyType="send"
                                placeholderTextColor="#888"
                            />
                            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                                <TouchableOpacity
                                    onPress={onSubmit}
                                    style={styles.sendButton}
                                >
                                    <Text style={styles.sendText}>SEND</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalView: {
        width: "100%",
        height: "85%",
        backgroundColor: "#1a1a1a",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 10,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#333",
        paddingBottom: 10,
    },
    headerText: {
        ...CommonStyles.bold,
        fontSize: 22,
        color: "#fff",
        letterSpacing: 1,
    },
    closeButton: {
        padding: 5,
    },
    closeIcon: {
        width: 20,
        height: 20,
        tintColor: "#fff",
    },
    chatContainer: {
        flex: 1,
    },
    chatArea: {
        flex: 1,
        marginBottom: 10,
    },
    chatContent: {
        paddingBottom: 20,
    },
    chatBubble: {
        marginBottom: 12,
        padding: 12,
        borderRadius: 12,
        maxWidth: "80%",
    },
    botBubble: {
        backgroundColor: "#333",
        alignSelf: "flex-start",
        borderBottomLeftRadius: 2,
    },
    userBubble: {
        backgroundColor: "#0066cc",
        alignSelf: "flex-end",
        borderBottomRightRadius: 2,
    },
    chatText: {
        color: "#fff",
        fontSize: 16,
        lineHeight: 22,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#333",
    },
    input: {
        flex: 1,
        backgroundColor: "#2a2a2a",
        color: "#fff",
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginRight: 10,
        fontSize: 16,
    },
    sendButton: {
        backgroundColor: "#0066cc",
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    sendText: {
        color: "#fff",
        fontWeight: "bold",
    },
});

export default Chatbot;
