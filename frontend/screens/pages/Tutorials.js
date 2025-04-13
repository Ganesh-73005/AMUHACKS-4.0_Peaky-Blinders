"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    SafeAreaView,
    StyleSheet,
    Animated,
    Dimensions,
    StatusBar,
    TextInput,
    ScrollView,
    Modal,
} from "react-native"
import { formatDistanceToNow } from "date-fns"
import FontAwesomeIcon from "react-native-vector-icons/FontAwesome"
import YoutubePlayer from "react-native-youtube-iframe"

const { width } = Dimensions.get("window")

// Sample video data
const WOMEN_SAFETY_VIDEOS = [
    {
        id: "1",
        title: "Top 5 Self-Defense Techniques for Women",
        thumbnail: "https://img.youtube.com/vi/T7aNSRoDCmg/maxresdefault.jpg",
        channelTitle: "SafeLiving",
        publishedAt: "2023-08-10T12:00:00Z",
        viewCount: "2.3M",
        videoId: "T7aNSRoDCmg",
        duration: "12:45",
        description: "Learn essential self-defense moves that could save your life in dangerous situations.",
        category: "self-defense",
    },
    {
        id: "2",
        title: "How to Stay Safe While Traveling Alone",
        thumbnail: "https://img.youtube.com/vi/9w8JLhR_lHI/maxresdefault.jpg",
        channelTitle: "Empower Women",
        publishedAt: "2022-11-20T14:30:00Z",
        viewCount: "1.1M",
        videoId: "9w8JLhR_lHI",
        duration: "18:22",
        description: "Essential tips for women traveling solo to ensure safety and confidence.",
        category: "travel",
    },
    {
        id: "3",
        title: "Best Personal Safety Apps for Women in 2024",
        thumbnail: "https://img.youtube.com/vi/nXucL42qPg8/maxresdefault.jpg",
        channelTitle: "Tech4Safety",
        publishedAt: "2024-01-05T10:00:00Z",
        viewCount: "800K",
        videoId: "nXucL42qPg8",
        duration: "09:17",
        description: "Review of the top safety apps that every woman should have on her smartphone.",
        category: "technology",
    },
    {
        id: "4",
        title: "Psychological Tricks to Avoid Danger",
        thumbnail: "https://img.youtube.com/vi/1Pfd9XRlJHw/maxresdefault.jpg",
        channelTitle: "Women's Safety Tips",
        publishedAt: "2023-05-18T09:15:00Z",
        viewCount: "1.5M",
        videoId: "1Pfd9XRlJHw",
        duration: "15:33",
        description: "Mental strategies to identify and avoid potentially dangerous situations.",
        category: "psychology",
    },
    {
        id: "5",
        title: "Self-Defense Moves Every Woman Should Know",
        thumbnail: "https://img.youtube.com/vi/KVpxP3ZZtAc/maxresdefault.jpg",
        channelTitle: "SafeLiving",
        publishedAt: "2023-09-15T10:00:00Z",
        viewCount: "3.1M",
        videoId: "KVpxP3ZZtAc",
        duration: "14:22",
        description: "Simple but effective self-defense techniques that can be learned quickly.",
        category: "self-defense",
    },
    {
        id: "6",
        title: "How to Use Pepper Spray Effectively",
        thumbnail: "https://img.youtube.com/vi/JGnGRNH_3LE/maxresdefault.jpg",
        channelTitle: "Safety First",
        publishedAt: "2023-07-22T08:45:00Z",
        viewCount: "1.8M",
        videoId: "JGnGRNH_3LE",
        duration: "07:15",
        description: "Learn the proper techniques for using pepper spray in emergency situations.",
        category: "self-defense",
    },
]

// Categories for filtering
const CATEGORIES = [
    { id: "all", name: "All" },
    { id: "self-defense", name: "Self Defense" },
    { id: "travel", name: "Travel Safety" },
    { id: "technology", name: "Safety Apps" },
    { id: "psychology", name: "Psychology" },
]

// Sort options
const SORT_OPTIONS = [
    { id: "newest", name: "Newest" },
    { id: "popular", name: "Most Viewed" },
    { id: "oldest", name: "Oldest" },
]

const YouTubeTutorials = () => {
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [sortOption, setSortOption] = useState("newest")
    const [showSortModal, setShowSortModal] = useState(false)
    const [filteredVideos, setFilteredVideos] = useState(WOMEN_SAFETY_VIDEOS)
    const [selectedVideo, setSelectedVideo] = useState(null)
    const [playing, setPlaying] = useState(false)

    const fadeAnim = useRef(new Animated.Value(0)).current
    const scrollY = useRef(new Animated.Value(0)).current

    // Filter and sort videos based on search, category, and sort option
    useEffect(() => {
        let result = [...WOMEN_SAFETY_VIDEOS]

        // Apply search filter
        if (searchQuery) {
            result = result.filter(
                (video) =>
                    video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    video.channelTitle.toLowerCase().includes(searchQuery.toLowerCase()),
            )
        }

        // Apply category filter
        if (selectedCategory !== "all") {
            result = result.filter((video) => video.category === selectedCategory)
        }

        // Apply sorting
        switch (sortOption) {
            case "newest":
                result.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
                break
            case "oldest":
                result.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt))
                break
            case "popular":
                result.sort((a, b) => {
                    const viewsA = Number.parseInt(a.viewCount.replace(/[^0-9]/g, ""))
                    const viewsB = Number.parseInt(b.viewCount.replace(/[^0-9]/g, ""))
                    return viewsB - viewsA
                })
                break
            default:
                break
        }

        setFilteredVideos(result)
    }, [searchQuery, selectedCategory, sortOption])

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start()
    }, [])

    const onStateChange = useCallback((state) => {
        if (state === "ended") {
            setPlaying(false)
        }
    }, [])

    const renderVideoPlayer = () => {
        if (!selectedVideo) return null

        return (
            <Modal
                animationType="slide"
                transparent={false}
                visible={!!selectedVideo}
                onRequestClose={() => {
                    setSelectedVideo(null)
                    setPlaying(false)
                }}
            >
                <SafeAreaView style={styles.videoPlayerContainer}>
                    <View style={styles.videoPlayerHeader}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => {
                                setSelectedVideo(null)
                                setPlaying(false)
                            }}
                        >
                            <FontAwesomeIcon name="arrow-left" size={24} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.videoPlayerTitle} numberOfLines={1}>
                            {selectedVideo.title}
                        </Text>
                    </View>

                    <View style={styles.youtubePlayerWrapper}>
                        <YoutubePlayer
                            height={width * 0.5625} // 16:9 aspect ratio
                            width={width}
                            play={playing}
                            videoId={selectedVideo.videoId}
                            onChangeState={onStateChange}
                        />
                    </View>

                    <ScrollView style={styles.videoDetailsContainer}>
                        <Text style={styles.videoDetailTitle}>{selectedVideo.title}</Text>
                        <View style={styles.videoStats}>
                            <Text style={styles.videoViewCount}>{selectedVideo.viewCount} views</Text>
                            <Text style={styles.videoPublishedDate}>
                                {formatDistanceToNow(new Date(selectedVideo.publishedAt))} ago
                            </Text>
                        </View>

                        <View style={styles.channelInfoContainer}>
                            <View style={styles.channelAvatar}>
                                <Text style={styles.channelInitial}>{selectedVideo.channelTitle.charAt(0)}</Text>
                            </View>
                            <Text style={styles.channelName}>{selectedVideo.channelTitle}</Text>
                        </View>

                        <View style={styles.descriptionContainer}>
                            <Text style={styles.descriptionTitle}>Description</Text>
                            <Text style={styles.descriptionText}>{selectedVideo.description}</Text>
                        </View>

                        <View style={styles.relatedVideosContainer}>
                            <Text style={styles.relatedVideosTitle}>Related Videos</Text>
                            {filteredVideos
                                .filter((video) => video.id !== selectedVideo.id)
                                .slice(0, 3)
                                .map((video) => (
                                    <TouchableOpacity
                                        key={video.id}
                                        style={styles.relatedVideoItem}
                                        onPress={() => {
                                            setSelectedVideo(video)
                                            setPlaying(true)
                                        }}
                                    >
                                        <Image source={{ uri: video.thumbnail }} style={styles.relatedVideoThumbnail} />
                                        <View style={styles.relatedVideoInfo}>
                                            <Text style={styles.relatedVideoTitle} numberOfLines={2}>
                                                {video.title}
                                            </Text>
                                            <Text style={styles.relatedVideoChannel}>{video.channelTitle}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        )
    }

    const renderSearchBar = () => (
        <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
                <FontAwesomeIcon name="search" size={18} color="#6b7280" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search safety tutorials..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#9ca3af"
                />
                {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                        <FontAwesomeIcon name="times-circle" size={18} color="#6b7280" />
                    </TouchableOpacity>
                ) : null}
            </View>

            <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
                <FontAwesomeIcon name="sort" size={18} color="#6b7280" />
            </TouchableOpacity>
        </View>
    )

    const renderCategories = () => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
            {CATEGORIES.map((category) => (
                <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryButton, selectedCategory === category.id && styles.selectedCategoryButton]}
                    onPress={() => setSelectedCategory(category.id)}
                >
                    <Text style={[styles.categoryText, selectedCategory === category.id && styles.selectedCategoryText]}>
                        {category.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    )

    const renderSortModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={showSortModal}
            onRequestClose={() => setShowSortModal(false)}
        >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSortModal(false)}>
                <View style={styles.sortModalContainer}>
                    <View style={styles.sortModalHeader}>
                        <Text style={styles.sortModalTitle}>Sort by</Text>
                        <TouchableOpacity onPress={() => setShowSortModal(false)}>
                            <FontAwesomeIcon name="times" size={20} color="#000" />
                        </TouchableOpacity>
                    </View>

                    {SORT_OPTIONS.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={[styles.sortOption, sortOption === option.id && styles.selectedSortOption]}
                            onPress={() => {
                                setSortOption(option.id)
                                setShowSortModal(false)
                            }}
                        >
                            <Text style={[styles.sortOptionText, sortOption === option.id && styles.selectedSortOptionText]}>
                                {option.name}
                            </Text>
                            {sortOption === option.id && <FontAwesomeIcon name="check" size={16} color="#ff4757" />}
                        </TouchableOpacity>
                    ))}
                </View>
            </TouchableOpacity>
        </Modal>
    )

    const renderVideoItem = ({ item }) => (
        <TouchableOpacity
            style={styles.videoCard}
            onPress={() => {
                setSelectedVideo(item)
                setPlaying(true)
            }}
            activeOpacity={0.9}
        >
            <View style={styles.thumbnailContainer}>
                <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
                <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{item.duration}</Text>
                </View>
                <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => {
                        setSelectedVideo(item)
                        setPlaying(true)
                    }}
                >
                    <FontAwesomeIcon name="play" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.videoInfo}>
                <View style={styles.channelRow}>
                    <View style={styles.channelAvatar}>
                        <Text style={styles.channelInitial}>{item.channelTitle.charAt(0)}</Text>
                    </View>
                    <View style={styles.titleContainer}>
                        <Text numberOfLines={2} style={styles.videoTitle}>
                            {item.title}
                        </Text>
                        <Text style={styles.channelName}>{item.channelTitle}</Text>
                    </View>
                </View>

                <View style={styles.videoStats}>
                    <Text style={styles.statsText}>{item.viewCount} views</Text>
                    <Text style={styles.statsText}>{formatDistanceToNow(new Date(item.publishedAt))} ago</Text>
                </View>
            </View>
        </TouchableOpacity>
    )

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <FontAwesomeIcon name="search" size={50} color="#d1d5db" />
            <Text style={styles.emptyText}>No videos found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
        </View>
    )

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#ff4757" />

            <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
                {renderSearchBar()}
                {renderCategories()}

                {filteredVideos.length > 0 ? (
                    <FlatList
                        data={filteredVideos}
                        keyExtractor={(item) => item.id}
                        renderItem={renderVideoItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                    />
                ) : (
                    renderEmptyState()
                )}

                {renderVideoPlayer()}
                {renderSortModal()}
            </Animated.View>
        </SafeAreaView>
    )
}

export default YouTubeTutorials

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f9fafb",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f3f4f6",
        borderRadius: 24,
        paddingHorizontal: 12,
        height: 40,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: "#1f2937",
        height: 40,
    },
    sortButton: {
        marginLeft: 12,
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 20,
        backgroundColor: "#f3f4f6",
    },
    categoriesContainer: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    categoryButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: "#f3f4f6",
        marginRight: 8,
        height: 40
    },
    selectedCategoryButton: {
        backgroundColor: "#ff4757",
    },
    categoryText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#4b5563",
    },
    selectedCategoryText: {
        color: "#fff",
    },
    listContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    videoCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    thumbnailContainer: {
        position: "relative",
    },
    thumbnail: {
        width: "100%",
        height: 200,
    },
    durationBadge: {
        position: "absolute",
        bottom: 8,
        right: 8,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    durationText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    playButton: {
        position: "absolute",
        top: "50%",
        left: "50%",
        marginLeft: -25,
        marginTop: -25,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    videoInfo: {
        padding: 16,
    },
    channelRow: {
        flexDirection: "row",
        marginBottom: 12,
    },
    channelAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#ff4757",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    channelInitial: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    titleContainer: {
        flex: 1,
    },
    videoTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#1f2937",
        marginBottom: 4,
    },
    channelName: {
        fontSize: 14,
        color: "#6b7280",
    },
    videoStats: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    statsText: {
        fontSize: 12,
        color: "#9ca3af",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    sortModalContainer: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 16,
    },
    sortModalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    sortModalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1f2937",
    },
    sortOption: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    selectedSortOption: {
        backgroundColor: "rgba(255, 71, 87, 0.05)",
    },
    sortOptionText: {
        fontSize: 16,
        color: "#4b5563",
    },
    selectedSortOptionText: {
        color: "#ff4757",
        fontWeight: "600",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#6b7280",
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 16,
        color: "#9ca3af",
        textAlign: "center",
    },
    videoPlayerContainer: {
        flex: 1,
        backgroundColor: "#fff",
    },
    videoPlayerHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    closeButton: {
        marginRight: 16,
    },
    videoPlayerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1f2937",
        flex: 1,
    },
    youtubePlayerWrapper: {
        width: "100%",
        backgroundColor: "#000",
    },
    videoDetailsContainer: {
        flex: 1,
        padding: 16,
    },
    videoDetailTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1f2937",
        marginBottom: 8,
    },
    videoViewCount: {
        fontSize: 14,
        color: "#6b7280",
    },
    videoPublishedDate: {
        fontSize: 14,
        color: "#6b7280",
    },
    channelInfoContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 16,
        marginBottom: 16,
        padding: 12,
        backgroundColor: "#f9fafb",
        borderRadius: 12,
    },
    descriptionContainer: {
        marginBottom: 24,
    },
    descriptionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1f2937",
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 14,
        color: "#4b5563",
        lineHeight: 20,
    },
    relatedVideosContainer: {
        marginBottom: 24,
    },
    relatedVideosTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1f2937",
        marginBottom: 12,
    },
    relatedVideoItem: {
        flexDirection: "row",
        marginBottom: 12,
    },
    relatedVideoThumbnail: {
        width: 120,
        height: 68,
        borderRadius: 8,
    },
    relatedVideoInfo: {
        flex: 1,
        marginLeft: 12,
    },
    relatedVideoTitle: {
        fontSize: 14,
        fontWeight: "500",
        color: "#1f2937",
        marginBottom: 4,
    },
    relatedVideoChannel: {
        fontSize: 12,
        color: "#6b7280",
    },
})

