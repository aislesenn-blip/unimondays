export const fetchUnsplashImages = async (query: string, page = 1) => {
    const ACCESS_KEY = 'GFRGVmxF64zpxZL22-o3BaVyGxphiGAwXLMfQxLCC2U';
    try {
        const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=10&orientation=portrait&client_id=${ACCESS_KEY}`);
        if (!response.ok) throw new Error('Failed to fetch images');
        const data = await response.json();
        return data.results.map((img: any) => ({
            id: img.id,
            url: img.urls.regular,
            alt: img.alt_description,
            user: img.user.name,
            avatar: img.user.profile_image.medium
        }));
    } catch (error) {
        console.error(error);
        return [];
    }
};
