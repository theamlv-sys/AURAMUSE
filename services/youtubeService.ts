
export interface ChannelStats {
    id: string;
    title: string;
    description: string;
    subscriberCount: string;
    viewCount: string;
    videoCount: string;
    thumbnail: string;
}

export interface VideoStats {
    id: string;
    title: string;
    viewCount: string;
    likeCount: string;
    commentCount: string;
    publishedAt: string;
    tags: string[];
}

const getAuthParams = (token?: string, apiKey?: string) => {
    // Prefer API key for public data — OAuth tokens from Supabase login
    // don't include YouTube Data API scopes and will fail with "insufficient scopes"
    if (apiKey) return { headers: { 'Accept': 'application/json' }, urlParam: `&key=${apiKey}` };
    if (token) return { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } };
    throw new Error("No access token or API key provided");
};

export const searchCompetitorChannels = async (query: string, token?: string, apiKey?: string): Promise<ChannelStats[]> => {
    const auth = getAuthParams(token, apiKey);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=5${auth.urlParam || ''}`;

    const response = await fetch(url, { headers: auth.headers });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Failed to search channels");
    }

    const data = await response.json();
    const channelIds = data.items?.map((item: any) => item.snippet.channelId).join(',');

    if (!channelIds) return [];

    return fetchChannelDetails(channelIds, token, apiKey);
};

export const fetchChannelDetails = async (channelIds: string, token?: string, apiKey?: string): Promise<ChannelStats[]> => {
    const auth = getAuthParams(token, apiKey);
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds}${auth.urlParam || ''}`;

    const response = await fetch(url, { headers: auth.headers });

    if (!response.ok) throw new Error("Failed to fetch channel details");

    const data = await response.json();
    return (data.items || []).map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        subscriberCount: item.statistics.subscriberCount,
        viewCount: item.statistics.viewCount,
        videoCount: item.statistics.videoCount,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url
    }));
};

export const fetchMyChannel = async (token: string): Promise<ChannelStats> => {
    if (!token) throw new Error("Authentication required for channel audit");
    const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Failed to fetch my channel");

    const data = await response.json();
    if (!data.items || data.items.length === 0) throw new Error("No YouTube channel found for this account");

    const item = data.items[0];
    return {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        subscriberCount: item.statistics.subscriberCount,
        viewCount: item.statistics.viewCount,
        videoCount: item.statistics.videoCount,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url
    };
};

export const fetchChannelVideos = async (channelId: string, token?: string, apiKey?: string, maxResults: number = 5): Promise<VideoStats[]> => {
    const auth = getAuthParams(token, apiKey);

    // 1. Get Uploads Playlist ID
    const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}${auth.urlParam || ''}`, {
        headers: auth.headers
    });
    if (!channelRes.ok) throw new Error("Failed to fetch channel content details");

    const channelData = await channelRes.json();
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) return [];

    // 2. Get Videos from Playlist
    const playlistRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}${auth.urlParam || ''}`, {
        headers: auth.headers
    });

    if (!playlistRes.ok) throw new Error("Failed to fetch playlist items");

    const playlistData = await playlistRes.json();
    if (!playlistData.items || playlistData.items.length === 0) return [];

    const videoIds = playlistData.items.map((item: any) => item.contentDetails.videoId).join(',');

    // 3. Get Video Stats
    const videosRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}${auth.urlParam || ''}`, {
        headers: auth.headers
    });

    if (!videosRes.ok) throw new Error("Failed to fetch video statistics");

    const videosData = await videosRes.json();

    return (videosData.items || []).map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        viewCount: item.statistics.viewCount,
        likeCount: item.statistics.likeCount,
        commentCount: item.statistics.commentCount,
        publishedAt: item.snippet.publishedAt,
        tags: item.snippet.tags || []
    }));
};

export const extractYouTubeInfo = (input: string): { type: 'video' | 'channel' | 'search', value: string } => {
    try {
        const url = new URL(input);

        // Video ID
        if (url.searchParams.has('v')) return { type: 'video', value: url.searchParams.get('v')! };
        if (url.hostname === 'youtu.be') return { type: 'video', value: url.pathname.slice(1) };
        if (url.pathname.includes('/shorts/')) return { type: 'video', value: url.pathname.split('/shorts/')[1] };

        // Channel ID
        if (url.pathname.includes('/channel/')) return { type: 'channel', value: url.pathname.split('/channel/')[1] };

        // Handle/Custom URL (treat as search query or handle)
        if (url.pathname.includes('/@') || url.pathname.includes('/c/')) return { type: 'search', value: input };

        return { type: 'search', value: input };
    } catch (e) {
        // Not a URL, treat as search query
        return { type: 'search', value: input };
    }
};
