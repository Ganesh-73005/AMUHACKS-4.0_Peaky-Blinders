import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import { Animated } from "react-native";
import { BottomNavigation } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import StateContext from "../context/StateContext";

// ✅ Import pages directly (NO React.lazy)
import Sos from "./pages/Sos";
import Map from "./pages/Map";
import Alerts from "./pages/Alerts";
import Profile from "./pages/Profile";
import Story from "./pages/Story";
import Tutorials from "./pages/Tutorials";

const TABS = [
    { key: "map", title: "Map", icon: "map" },
    { key: "alerts", title: "Alerts", icon: "alert" },
    { key: "sos", title: "SOS", icon: "alert-octagon" },
    { key: "stories", title: "Stories", icon: "book" },
    { key: "profile", title: "Profile", icon: "account" },
    { key: "tutorials", title: "Tutorials", icon: "video" },
];

const renderScene = ({ route }) => {
    switch (route.key) {
        case "map":
            return <Map />;
        case "alerts":
            return <Alerts />;
        case "sos":
            return <Sos />;
        case "stories":
            return <Story />;
        case "profile":
            return <Profile />;
        case "tutorials":
            return <Tutorials />;
        
    }
};

const MainScreen = () => {
    const { socket } = useContext(StateContext);
    const [activeTab, setActiveTab] = useState(0);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Optimized icon rendering
    const renderIcon = useCallback(({ route, color }) => (
        <MaterialCommunityIcons name={route.icon} size={24} color={color} />
    ), []);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") alert("Grant location permission");

            const { status: NotificationStatus } = await Notifications.requestPermissionsAsync();
            if (NotificationStatus !== "granted") alert("Enable notifications for a better experience.");
        })();
    }, []);

    useEffect(() => {
        socket.on("Send_Notification", async (details) => {
            await Notifications.scheduleNotificationAsync({
                content: { title: "I am in danger", body: `Sent by ${details.name}` },
                trigger: { seconds: 2 },
            });
        });
        return () => socket.off("Send_Notification");
    }, []);

    // Optimized tab switching
    const handleTabPress = useCallback((index) => {
        setActiveTab(index);
        if (TABS[index].key === "sos") {
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
            ]).start();
        }
    }, []);

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <BottomNavigation
                navigationState={{ index: activeTab, routes: TABS }}
                onIndexChange={handleTabPress}
                renderScene={renderScene}
                renderIcon={renderIcon}
                barStyle={{ backgroundColor: "#fff" }}
                activeColor="#6200ee"
                inactiveColor="#757575"
            />
        </SafeAreaView>
    );
};

export default MainScreen;
