"use client"

import { useState, useEffect, useContext, useRef } from "react"
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Alert,
    StyleSheet,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    Animated,
} from "react-native"
import MapView, { Marker, Circle, Polyline, PROVIDER_GOOGLE } from "react-native-maps"
import StateContext from "../../context/StateContext"
import axios from "axios"
import { SERVER_URL } from "../../config"
import { decode } from "@mapbox/polyline"
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons"

const { width, height } = Dimensions.get("window")

const Map = () => {
    const { socket, setLoading, location, User } = useContext(StateContext)
    const [activeUsers, setActiveUsers] = useState([])
    const [AdministratorInfo, setAdministratorInfo] = useState([])
    const [SOSInfo, setSOSInfo] = useState([])
    const [safeRoute, setSafeRoute] = useState(null)
    const [source, setSource] = useState(null)
    const [destination, setDestination] = useState(null)
    const [sourceInput, setSourceInput] = useState("")
    const [destinationInput, setDestinationInput] = useState("")
    const [sourceSuggestions, setSourceSuggestions] = useState([])
    const [destinationSuggestions, setDestinationSuggestions] = useState([])
    const [userLocations, setUserLocations] = useState({})
    const [isSearchExpanded, setIsSearchExpanded] = useState(false)
    const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false)
    const [isRouteLoading, setIsRouteLoading] = useState(false)
    const [routeDistance, setRouteDistance] = useState(null)
    const [routeDuration, setRouteDuration] = useState(null)

    const mapRef = useRef(null)
    const bottomSheetAnim = useRef(new Animated.Value(0)).current
    const searchExpandAnim = useRef(new Animated.Value(0)).current

    // Fetch active users
    const Fetch_Active_Users = async () => {
        if (!User) {
            console.warn("User is null, skipping Fetch_Active_Users")
            return
        }

        try {
            setLoading(true)
            const { data } = await axios.get(`${SERVER_URL}/api/active/location/meter/${User.user_id}`)
            setActiveUsers(data)
            fetchUserLocationNames(data)
        } catch (err) {
            console.error(err)
            if (err.response) Alert.alert("Error", err.response.data)
            else Alert.alert("Error", "Failed to fetch active users")
        } finally {
            setLoading(false)
        }
    }

    // Fetch location names for users
    const fetchUserLocationNames = async (users) => {
        const locations = {}
        for (const user of users) {
            if (user?.coordinates) {
                const name = await getLocationName(user.coordinates.latitude, user.coordinates.longitude)
                locations[user.user_id] = name
            }
        }
        setUserLocations(locations)
    }

    // Fetch administrator and SOS info
    const fetchAdminAndSOSInfo = async () => {
        try {
            const { data } = await axios.get(`${SERVER_URL}/api/administrator_sos`)
            setAdministratorInfo(data.administrator_response)
            setSOSInfo(data.sos_response)
        } catch (error) {
            console.error(error)
            Alert.alert("Error", "Failed to fetch SOS information")
        }
    }

    // Initial data loading
    useEffect(() => {
        if (User) {
           
            fetchAdminAndSOSInfo()
        }
    }, [socket.connected, User])

    // Socket event listener
    useEffect(() => {
        socket.on("Update_Active_Users", () => {
            Fetch_Active_Users()
        })

        return () => {
            socket.off("Update_Active_Users")
        }
    }, [socket.connected])

    // Relocate to user's current location
    const relocateToUserLocation = () => {
        if (mapRef.current && location) {
            mapRef.current.animateToRegion({
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            })
        }
    }

    // Handle map press for selecting source/destination
    const handleMapPress = (event) => {
        const { coordinate } = event.nativeEvent

        if (!source) {
            setSource(coordinate)
            getLocationName(coordinate.latitude, coordinate.longitude).then((name) => setSourceInput(name))
            Alert.alert("Source selected", "Now select your destination")
        } else if (!destination) {
            setDestination(coordinate)
            getLocationName(coordinate.latitude, coordinate.longitude).then((name) => setDestinationInput(name))
            fetchSafeRoute(source, coordinate)
        } else {
            setSource(null)
            setDestination(null)
            setSafeRoute(null)
            setRouteDistance(null)
            setRouteDuration(null)
            setSourceInput("")
            setDestinationInput("")
            Alert.alert("Route cleared", "Select a new source")
        }
    }

    // Get location name from coordinates
    const getLocationName = async (latitude, longitude) => {
        try {
            const response = await axios.get(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                {
                    headers: { "User-Agent": "SaveHer/1.0 (ganeshsriramulu2@gmail.com)" },
                },
            )
            return response.data.display_name
        } catch (error) {
            console.error("Error fetching location name:", error)
            return "Unknown location"
        }
    }

    // Fetch safe route
    const fetchSafeRoute = async (src, dest) => {
        try {
            setIsRouteLoading(true)
            const response = await axios.post(
                "http://3.104.76.198:5000/get_safe_route",
                {
                    src: { latitude: src.latitude, longitude: src.longitude },
                    dest: { latitude: dest.latitude, longitude: dest.longitude },
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            )

            const data = response.data

            if (response.status === 200) {
                const decodedRoute = decode(data.safest_polyline)
                const formattedRoute = decodedRoute.map((coord) => ({
                    latitude: coord[0],
                    longitude: coord[1],
                }))

                if (Array.isArray(formattedRoute) && formattedRoute.every((coord) => coord.latitude && coord.longitude)) {
                    setSafeRoute(formattedRoute)

                    // Set route metadata if available
                    if (data.distance) setRouteDistance(data.distance)
                    if (data.duration) setRouteDuration(data.duration)

                    // Fit map to show the entire route
                    if (mapRef.current) {
                        const coordinates = [
                            { latitude: src.latitude, longitude: src.longitude },
                            { latitude: dest.latitude, longitude: dest.longitude },
                        ]
                        mapRef.current.fitToCoordinates(coordinates, {
                            edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
                            animated: true,
                        })
                    }
                } else {
                    console.error("Invalid polyline format")
                    Alert.alert("Error", "Invalid polyline data")
                }
            } else {
                console.error("Error:", data.error)
                Alert.alert("Error", "Error fetching safe route")
            }
        } catch (error) {
            console.error("Network error:", error)
            Alert.alert("Error", "Network error fetching safe route")
        } finally {
            setIsRouteLoading(false)
        }
    }

    // Handle search button press
    const handleSearch = async () => {
        if (!sourceInput || !destinationInput) {
            Alert.alert("Error", "Please enter both source and destination")
            return
        }

        try {
            setLoading(true)
            const sourceResponse = await axios.get(
                `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(sourceInput)}`,
                {
                    headers: { "User-Agent": "SaveHer/1.0 (ganeshsriramulu2@gmail.com)" },
                },
            )

            const destResponse = await axios.get(
                `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(destinationInput)}`,
                {
                    headers: { "User-Agent": "SaveHer/1.0 (ganeshsriramulu2@gmail.com)" },
                },
            )

            if (sourceResponse.data.length > 0 && destResponse.data.length > 0) {
                const newSource = {
                    latitude: Number.parseFloat(sourceResponse.data[0].lat),
                    longitude: Number.parseFloat(sourceResponse.data[0].lon),
                }

                const newDest = {
                    latitude: Number.parseFloat(destResponse.data[0].lat),
                    longitude: Number.parseFloat(destResponse.data[0].lon),
                }

                setSource(newSource)
                setDestination(newDest)
                fetchSafeRoute(newSource, newDest)

                // Collapse search panel after search
                toggleSearchExpand(false)
            } else {
                Alert.alert("Location not found", "Please check your input and try again.")
            }
        } catch (error) {
            console.error("Error searching for locations:", error)
            Alert.alert("Error", "An error occurred while searching for locations.")
        } finally {
            setLoading(false)
        }
    }

    // Fetch location suggestions
    const fetchSuggestions = async (query, setSuggestions) => {
        if (query.length > 2) {
            try {
                const response = await axios.get(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
                    {
                        headers: { "User-Agent": "SaveHer/1.0 (ganeshsriramulu2@gmail.com)" },
                    },
                )
                setSuggestions(response.data.slice(0, 5)) // Limit to 5 suggestions
            } catch (error) {
                console.error("Error fetching suggestions:", error)
            }
        } else {
            setSuggestions([])
        }
    }

    // Update suggestions when input changes
    useEffect(() => {
        fetchSuggestions(sourceInput, setSourceSuggestions)
    }, [sourceInput])

    useEffect(() => {
        fetchSuggestions(destinationInput, setDestinationSuggestions)
    }, [destinationInput])

    // Toggle search panel expansion
    const toggleSearchExpand = (expand) => {
        setIsSearchExpanded(expand)
        Animated.timing(searchExpandAnim, {
            toValue: expand ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start()
    }

    // Toggle bottom sheet expansion
    const toggleBottomSheet = (expand) => {
        setIsBottomSheetExpanded(expand)
        Animated.timing(bottomSheetAnim, {
            toValue: expand ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start()
    }

    // Calculate search panel height based on animation value
    const searchHeight = searchExpandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [60, 280],
    })

    // Calculate bottom sheet height based on animation value
    const bottomSheetHeight = bottomSheetAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [120, 300],
    })

    // Format distance for display
    const formatDistance = (meters) => {
        if (!meters) return null
        return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
    }

    // Format duration for display
    const formatDuration = (seconds) => {
        if (!seconds) return null
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)

        if (hours > 0) {
            return `${hours} hr ${minutes % 60} min`
        } else {
            return `${minutes} min`
        }
    }

    return (
        <View style={styles.container}>
            {location !== null ? (
                <>
                    {/* Search Panel */}
                    <Animated.View style={[styles.searchContainer, { height: searchHeight }]}>
                        <TouchableOpacity style={styles.searchHeader} onPress={() => toggleSearchExpand(!isSearchExpanded)}>
                            <View style={styles.searchHeaderContent}>
                                <MaterialIcons name="directions" size={24} color="#007AFF" />
                                <Text style={styles.searchHeaderText}>
                                    {source && destination ? "Route Active" : "Find Safe Route"}
                                </Text>
                            </View>
                            <MaterialIcons
                                name={isSearchExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                                size={24}
                                color="#666"
                            />
                        </TouchableOpacity>

                        {isSearchExpanded && (
                            <View style={styles.searchContent}>
                                <View style={styles.inputContainer}>
                                    <MaterialIcons name="my-location" size={20} color="#007AFF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter source location"
                                        value={sourceInput}
                                        onChangeText={setSourceInput}
                                    />
                                </View>

                                {sourceSuggestions.length > 0 && (
                                    <ScrollView style={styles.suggestionsContainer} nestedScrollEnabled={true}>
                                        {sourceSuggestions.map((suggestion, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={styles.suggestionItem}
                                                onPress={() => {
                                                    setSourceInput(suggestion.display_name)
                                                    setSourceSuggestions([])
                                                }}
                                            >
                                                <MaterialIcons name="place" size={16} color="#666" />
                                                <Text style={styles.suggestionText} numberOfLines={1}>
                                                    {suggestion.display_name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}

                                <View style={styles.inputContainer}>
                                    <MaterialIcons name="place" size={20} color="#FF3B30" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter destination location"
                                        value={destinationInput}
                                        onChangeText={setDestinationInput}
                                    />
                                </View>

                                {destinationSuggestions.length > 0 && (
                                    <ScrollView style={styles.suggestionsContainer} nestedScrollEnabled={true}>
                                        {destinationSuggestions.map((suggestion, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={styles.suggestionItem}
                                                onPress={() => {
                                                    setDestinationInput(suggestion.display_name)
                                                    setDestinationSuggestions([])
                                                }}
                                            >
                                                <MaterialIcons name="place" size={16} color="#666" />
                                                <Text style={styles.suggestionText} numberOfLines={1}>
                                                    {suggestion.display_name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}

                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        style={[styles.searchButton, { flex: 1 }]}
                                        onPress={handleSearch}
                                        disabled={isRouteLoading}
                                    >
                                        {isRouteLoading ? (
                                            <ActivityIndicator color="white" size="small" />
                                        ) : (
                                            <>
                                                <MaterialIcons name="search" size={18} color="white" />
                                                <Text style={styles.searchButtonText}>Search</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.clearButton, { flex: 1 }]}
                                        onPress={() => {
                                            setSource(null)
                                            setDestination(null)
                                            setSafeRoute(null)
                                            setRouteDistance(null)
                                            setRouteDuration(null)
                                            setSourceInput("")
                                            setDestinationInput("")
                                        }}
                                    >
                                        <MaterialIcons name="clear" size={18} color="white" />
                                        <Text style={styles.clearButtonText}>Clear</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Route Info Banner (when route is active) */}
                        {safeRoute && !isSearchExpanded && (
                            <View style={styles.routeInfoBanner}>
                                <View style={styles.routeInfoItem}>
                                    <MaterialIcons name="directions-walk" size={16} color="#007AFF" />
                                    <Text style={styles.routeInfoText}>{formatDistance(routeDistance) || "Calculating..."}</Text>
                                </View>

                                <View style={styles.routeInfoDivider} />

                                <View style={styles.routeInfoItem}>
                                    <MaterialIcons name="access-time" size={16} color="#007AFF" />
                                    <Text style={styles.routeInfoText}>{formatDuration(routeDuration) || "Calculating..."}</Text>
                                </View>
                            </View>
                        )}
                    </Animated.View>

                    {/* Relocate Button */}
                    <TouchableOpacity style={styles.relocateButton} onPress={relocateToUserLocation}>
                        <MaterialIcons name="my-location" size={24} color="#007AFF" />
                    </TouchableOpacity>

                    {/* Map View */}
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        style={styles.map}
                        initialRegion={{
                            latitude: location.latitude,
                            longitude: location.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                        liteMode={false}
                        scrollEnabled={true}
                        zoomEnabled={true}
                        pitchEnabled={true}
                       
                        onPress={handleMapPress}
                        showsUserLocation={true}
                        showsMyLocationButton={false}
                        showsCompass={true}

                        rotateEnabled={true}
                       
                    >
                        {/* Active Users Markers */}
                        {activeUsers &&
                            activeUsers.length > 0 &&
                            activeUsers.map(
                                (user, index) =>
                                    user?.coordinates &&
                                    user.coordinates.latitude !== undefined &&
                                    user.coordinates.longitude !== undefined && (
                                        <Marker
                                            key={index}
                                            coordinate={user.coordinates}
                                            opacity={User && user.user_id === User.user_id ? 1 : 0.6}
                                            title={`User ${index + 1}`}
                                            description={userLocations[user.user_id] || "Loading location..."}
                                        >
                                            <View
                                                style={[
                                                    styles.markerContainer,
                                                    User && user.user_id === User.user_id ? styles.currentUserMarker : null,
                                                ]}
                                            >
                                                <Image
                                                    source={require("../../assets/icons/woman.png")}
                                                    style={styles.markerImage}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                        </Marker>
                                    ),
                            )}

                        {/* SOS Circles */}
                        {SOSInfo.map(
                            (sos, index) =>
                                sos?.coordinates &&
                                sos.coordinates.latitude !== undefined &&
                                sos.coordinates.longitude !== undefined && (
                                    <Circle
                                        key={index}
                                        center={sos.coordinates}
                                        radius={120}
                                        fillColor={"rgba(255,0,0,0.15)"}
                                        strokeColor={"rgba(255,0,0,0.5)"}
                                        strokeWidth={1}
                                    />
                                ),
                        )}

                        {/* User Range Circle */}
                        <Circle
                            center={location}
                            radius={3000}
                            fillColor={"rgba(0,0,0,0.05)"}
                            strokeColor={"rgba(0,0,0,0.2)"}
                            strokeWidth={1}
                        />

                        {/* Source and Destination Markers */}
                        {source && (
                            <Marker coordinate={source} pinColor="green" title="Source" description={sourceInput}>
                                <View style={styles.routeMarker}>
                                    <MaterialIcons name="trip-origin" size={24} color="#34C759" />
                                </View>
                            </Marker>
                        )}

                        {destination && (
                            <Marker coordinate={destination} pinColor="red" title="Destination" description={destinationInput}>
                                <View style={styles.routeMarker}>
                                    <MaterialIcons name="place" size={24} color="#FF3B30" />
                                </View>
                            </Marker>
                        )}

                        {/* Safe Route Polyline */}
                        {safeRoute && (
                            <Polyline coordinates={safeRoute} strokeWidth={5} strokeColor="#007AFF" lineDashPattern={[0]} />
                        )}
                    </MapView>

                    {/* Bottom Sheet for Active Users */}
                    <Animated.View style={[styles.bottomContainer, { height: bottomSheetHeight }]}>
                        <TouchableOpacity
                            style={styles.bottomSheetHandle}
                            onPress={() => toggleBottomSheet(!isBottomSheetExpanded)}
                        >
                            <View style={styles.bottomSheetHandleBar} />
                        </TouchableOpacity>

                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomTitle}>Active Users</Text>
                            <Text style={styles.userCount}>
                                {activeUsers ? activeUsers.filter((user) => user !== null).length : 0} nearby
                            </Text>
                        </View>

                        <ScrollView style={styles.userList}>
                            {activeUsers && activeUsers.filter((user) => user !== null).length > 0 ? (
                                activeUsers
                                    .filter((user) => user !== null)
                                    .map((user, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.userItem}
                                            onPress={() => {
                                                if (mapRef.current && user.coordinates) {
                                                    mapRef.current.animateToRegion({
                                                        ...user.coordinates,
                                                        latitudeDelta: 0.01,
                                                        longitudeDelta: 0.01,
                                                    })
                                                    toggleBottomSheet(false)
                                                }
                                            }}
                                        >
                                            <View style={styles.userIcon}>
                                                <FontAwesome5 name="user-alt" size={16} color="#007AFF" />
                                            </View>
                                            <View style={styles.userInfo}>
                                                <Text style={styles.userName}>
                                                    {User && user.user_id === User.user_id ? "You" : `User ${index + 1}`}
                                                </Text>
                                                <Text style={styles.userLocation} numberOfLines={1}>
                                                    {userLocations[user.user_id] || "Loading location..."}
                                                </Text>
                                            </View>
                                            <MaterialIcons name="navigate-next" size={24} color="#999" />
                                        </TouchableOpacity>
                                    ))
                            ) : (
                                <View style={styles.noUsersContainer}>
                                    <MaterialIcons name="people-outline" size={48} color="#CCC" />
                                    <Text style={styles.noUsersText}>No Active Users Nearby</Text>
                                </View>
                            )}
                        </ScrollView>
                    </Animated.View>
                </>
            ) : (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Getting your location...</Text>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: "#666",
    },
    searchContainer: {
        position: "absolute",
        top: 10,
        left: 10,
        right: 10,
        zIndex: 1,
        backgroundColor: "white",
        borderRadius: 12,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        overflow: "hidden",
    },
    searchHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    searchHeaderContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    searchHeaderText: {
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 10,
    },
    searchContent: {
        padding: 15,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        paddingHorizontal: 10,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 40,
        fontSize: 15,
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10,
        gap: 10,
    },
    searchButton: {
        backgroundColor: "#007AFF",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
    },
    searchButtonText: {
        color: "white",
        fontWeight: "600",
        marginLeft: 5,
    },
    clearButton: {
        backgroundColor: "#FF3B30",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
    },
    clearButtonText: {
        color: "white",
        fontWeight: "600",
        marginLeft: 5,
    },
    suggestionsContainer: {
        maxHeight: 120,
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        marginBottom: 10,
    },
    suggestionItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
        flexDirection: "row",
        alignItems: "center",
    },
    suggestionText: {
        marginLeft: 10,
        fontSize: 14,
    },
    routeInfoBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 5,
    },
    routeInfoItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
    },
    routeInfoText: {
        marginLeft: 5,
        fontSize: 14,
        color: "#333",
    },
    routeInfoDivider: {
        width: 1,
        height: 20,
        backgroundColor: "#ddd",
    },
    relocateButton: {
        position: "absolute",
        bottom: 130,
        right: 20,
        backgroundColor: "white",
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    map: {
        width: "100%",
        height: "100%",
    },
    markerContainer: {
        backgroundColor: "white",
        borderWidth: 2,
        borderColor: "#5AC8FA",
        borderRadius: 20,
        padding: 3,
    },
    currentUserMarker: {
        borderColor: "#007AFF",
        backgroundColor: "#E3F2FD",
    },
    markerImage: {
        width: 24,
        height: 24,
    },
    routeMarker: {
        alignItems: "center",
        justifyContent: "center",
    },
    bottomContainer: {
        position: "absolute",
        bottom: 1,
        left: 0,
        right: 0,
        backgroundColor: "white",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,

    },
    bottomSheetHandle: {
        alignItems: "center",
        paddingVertical: 10,

    },
    bottomSheetHandleBar: {
        width: 40,
        height: 5,
        backgroundColor: "#DDDDDD",
        borderRadius: 3,
    },
    bottomSheetHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical:0,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    bottomTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    userCount: {
        fontSize: 14,
        color: "#666",
    },
    userList: {
        flex: 1,
    },
    userItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    userIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#E3F2FD",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: "600",
    },
    userLocation: {
        fontSize: 14,
        color: "#666",
        marginTop: 2,
    },
    noUsersContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: 30,
    },
    noUsersText: {
        fontSize: 16,
        color: "#999",
        marginTop: 10,
        textAlign: "center",
    },
    safeRouteButton: {
        backgroundColor: "#34C759",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 10,
    },
    safeRouteButtonText: {
        color: "white",
        fontWeight: "bold",
    },
})

export default Map

