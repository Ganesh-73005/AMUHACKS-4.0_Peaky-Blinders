import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "react-native";
import { useFonts } from "expo-font";
import React, { useContext } from "react";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Auth from "./screens/auth/AuthScreen";
import MainScreen from "./screens/MainScreen";
import StateContext, {
    StateProvider,
    SocketProvider,
} from "./context/StateContext";
import Loading from "./screens/pages/Loading";
import { LogBox } from "react-native";

export default function App() {
    LogBox.ignoreAllLogs();
    const [fontsLoaded] = useFonts({
        "Poppins-Bold": require("./assets/Fonts/Poppins-Bold.ttf"),
        "Poppins-Thin": require(".//assets/Fonts/Poppins-Thin.ttf"),
        "Poppins-Medium": require(".//assets/Fonts/Poppins-Medium.ttf"),
    });

    if (!fontsLoaded) return null;

    return (
        <SafeAreaProvider>
            <StateProvider>
                <StatusBar barStyle={"auto"} />
                <NavigationContainer>
                    <Provider />
                </NavigationContainer>
            </StateProvider>
        </SafeAreaProvider>
    );
}

const Provider = () => {
    const { isLogin } = useContext(StateContext);
    return (
        <>
            {isLogin ? (
                <SocketProvider>
                    <MainScreen />
                </SocketProvider>
            ) : (
                <Auth />
            )}
            <Loading />
        </>
    );
};